import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, contentItemsTable, keywordsTable, appSettingsTable } from "@workspace/db";
import {
  ListContentQueryParams,
  ListContentResponse,
  GenerateContentBody,
  GenerateContentResponse,
  GetContentParams,
  GetContentResponse,
  UpdateContentParams,
  UpdateContentBody,
  UpdateContentResponse,
  ApproveContentParams,
  ApproveContentBody,
  ApproveContentResponse,
  RejectContentParams,
  RejectContentResponse,
  DeleteContentParams,
} from "@workspace/api-zod";
import { generateContentWithGemini, generateTrendingTweets } from "../lib/gemini";
import { sendContentForApproval, sendNotification } from "../lib/telegram";
import { postToX } from "../lib/zernio-client";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/content", async (req, res): Promise<void> => {
  const queryParsed = ListContentQueryParams.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: queryParsed.error.message });
    return;
  }

  const { status, type } = queryParsed.data;
  const conditions = [];

  if (status) conditions.push(eq(contentItemsTable.status, status));
  if (type) conditions.push(eq(contentItemsTable.type, type));

  const items =
    conditions.length > 0
      ? await db
          .select()
          .from(contentItemsTable)
          .where(and(...conditions))
          .orderBy(contentItemsTable.createdAt)
      : await db
          .select()
          .from(contentItemsTable)
          .orderBy(contentItemsTable.createdAt);

  res.json(ListContentResponse.parse(items));
});

router.post("/content/generate", async (req, res): Promise<void> => {
  const parsed = GenerateContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, topic, count = 3 } = parsed.data;

  const [settings] = await db.select().from(appSettingsTable).limit(1);
  const keywords = await db.select().from(keywordsTable);

  const resolvedTopic =
    topic ??
    (keywords.length > 0
      ? keywords[Math.floor(Math.random() * keywords.length)].text
      : "social media and content creation");

  const contents = await generateContentWithGemini(
    type as "tweet" | "reply" | "idea",
    resolvedTopic,
    settings?.clientName ?? null,
    settings?.clientNiche ?? null,
    settings?.clientTone ?? null,
    count
  );

  const insertedItems = [];
  for (const content of contents) {
    const [item] = await db
      .insert(contentItemsTable)
      .values({ type, topic: resolvedTopic, content, status: "pending" })
      .returning();
    insertedItems.push(item);
  }

  const telegramEnabled = settings?.telegramEnabled ?? true;
  if (telegramEnabled) {
    for (const item of insertedItems) {
      try {
        const msgId = await sendContentForApproval(
          item.id,
          item.type,
          item.topic,
          item.content
        );
        if (msgId) {
          await db
            .update(contentItemsTable)
            .set({ telegramMessageId: msgId })
            .where(eq(contentItemsTable.id, item.id));
          item.telegramMessageId = msgId;
        }
      } catch (err) {
        req.log.warn({ err, itemId: item.id }, "Failed to send Telegram approval");
      }
    }
  }

  res.status(201).json(GenerateContentResponse.parse(insertedItems));
});

router.post("/content/generate-trending", async (req, res): Promise<void> => {
  const [settings] = await db.select().from(appSettingsTable).limit(1);

  let trending: { topic: string; content: string }[];
  try {
    trending = await generateTrendingTweets(
      settings?.clientName ?? null,
      settings?.clientNiche ?? null,
      settings?.clientTone ?? null,
      3
    );
  } catch (err) {
    req.log.error({ err }, "Trending generation failed");
    res.status(502).json({ error: "Failed to fetch trending topics" });
    return;
  }

  const insertedItems = [];
  for (const { topic, content } of trending) {
    if (!content) continue;
    const [item] = await db
      .insert(contentItemsTable)
      .values({ type: "tweet", topic, content, status: "pending" })
      .returning();
    insertedItems.push(item);
  }

  const telegramEnabled = settings?.telegramEnabled ?? true;
  if (telegramEnabled) {
    for (const item of insertedItems) {
      try {
        const msgId = await sendContentForApproval(item.id, item.type, item.topic, item.content);
        if (msgId) {
          await db
            .update(contentItemsTable)
            .set({ telegramMessageId: msgId })
            .where(eq(contentItemsTable.id, item.id));
          item.telegramMessageId = msgId;
        }
      } catch (err) {
        req.log.warn({ err, itemId: item.id }, "Failed to send trending item to Telegram");
      }
    }
  }

  res.status(201).json(GenerateContentResponse.parse(insertedItems));
});

router.get("/content/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetContentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [item] = await db
    .select()
    .from(contentItemsTable)
    .where(eq(contentItemsTable.id, params.data.id));

  if (!item) {
    res.status(404).json({ error: "Content not found" });
    return;
  }

  res.json(GetContentResponse.parse(item));
});

router.patch("/content/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateContentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const bodyParsed = UpdateContentBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const [item] = await db
    .update(contentItemsTable)
    .set({
      ...bodyParsed.data,
      scheduledFor: bodyParsed.data.scheduledFor ?? null,
    })
    .where(eq(contentItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Content not found" });
    return;
  }

  res.json(UpdateContentResponse.parse(item));
});

router.delete("/content/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteContentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [deleted] = await db
    .delete(contentItemsTable)
    .where(eq(contentItemsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Content not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/content/:id/approve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ApproveContentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const bodyParsed = ApproveContentBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(contentItemsTable)
    .where(eq(contentItemsTable.id, params.data.id));

  if (!item) {
    res.status(404).json({ error: "Content not found" });
    return;
  }

  const [settings] = await db.select().from(appSettingsTable).limit(1);
  const accountId =
    bodyParsed.data.zernioAccountId ??
    settings?.defaultZernioAccountId ??
    null;

  let platformPostUrl: string | null = null;
  let finalStatus = "approved";

  if (accountId) {
    try {
      const result = await postToX(
        item.content,
        accountId,
        bodyParsed.data.scheduledFor ?? null
      );
      platformPostUrl = result.platformPostUrl;
      finalStatus = "posted";

      if (settings?.telegramEnabled) {
        await sendNotification(
          `✅ *Posted to X!*\n\n${item.content}${platformPostUrl ? `\n\n[View post](${platformPostUrl})` : ""}`
        );
      }
    } catch (err) {
      logger.error({ err, itemId: item.id }, "Failed to post via Zernio");
      finalStatus = "approved";
    }
  }

  const [updated] = await db
    .update(contentItemsTable)
    .set({
      status: finalStatus,
      platformPostUrl,
      zernioAccountId: accountId,
    })
    .where(eq(contentItemsTable.id, params.data.id))
    .returning();

  res.json(ApproveContentResponse.parse(updated));
});

router.post("/content/:id/reject", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = RejectContentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [item] = await db
    .update(contentItemsTable)
    .set({ status: "rejected" })
    .where(eq(contentItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Content not found" });
    return;
  }

  res.json(RejectContentResponse.parse(item));
});

export default router;
