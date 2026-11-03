import app from "./app";
import { logger } from "./lib/logger";
import { startBot, registerCallbackHandlers, registerGenerateHandler, registerEditHandler, registerTrendingHandler } from "./lib/telegram";
import { db, contentItemsTable, keywordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { postToX } from "./lib/zernio-client";
import { sendNotification, sendContentForApproval } from "./lib/telegram";
import { appSettingsTable } from "@workspace/db";
import { startScheduler } from "./lib/scheduler";
import { generateContentWithGemini, generateTrendingTweets } from "./lib/gemini";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

registerCallbackHandlers(
  async (contentId: number) => {
    const [item] = await db
      .select()
      .from(contentItemsTable)
      .where(eq(contentItemsTable.id, contentId));
    if (!item) return;

    const [settings] = await db.select().from(appSettingsTable).limit(1);
    const accountId = settings?.defaultZernioAccountId ?? null;

    let platformPostUrl: string | null = null;
    let finalStatus = "approved";

    if (accountId) {
      try {
        const result = await postToX(item.content, accountId, null);
        platformPostUrl = result.platformPostUrl;
        finalStatus = "posted";
        await sendNotification(
          `✅ *Posted to X!*\n\n${item.content}${platformPostUrl ? `\n\n[View post](${platformPostUrl})` : ""}`
        );
      } catch (err) {
        logger.error({ err, contentId }, "Zernio post failed from Telegram callback");
        finalStatus = "approved";
      }
    }

    await db
      .update(contentItemsTable)
      .set({ status: finalStatus, platformPostUrl, zernioAccountId: accountId })
      .where(eq(contentItemsTable.id, contentId));
  },
  async (contentId: number) => {
    await db
      .update(contentItemsTable)
      .set({ status: "rejected" })
      .where(eq(contentItemsTable.id, contentId));
  }
);

registerEditHandler(async (contentId: number, newContent: string) => {
  await db
    .update(contentItemsTable)
    .set({ content: newContent, status: "pending" })
    .where(eq(contentItemsTable.id, contentId));

  const [updated] = await db
    .select()
    .from(contentItemsTable)
    .where(eq(contentItemsTable.id, contentId));

  if (updated) {
    const msgId = await sendContentForApproval(updated.id, updated.type, updated.topic, updated.content);
    if (msgId) {
      await db
        .update(contentItemsTable)
        .set({ telegramMessageId: msgId })
        .where(eq(contentItemsTable.id, contentId));
    }
  }
});

registerGenerateHandler(async () => {
  const [settings] = await db.select().from(appSettingsTable).limit(1);
  const keywords = await db.select().from(keywordsTable);
  const topic =
    keywords.length > 0
      ? keywords[Math.floor(Math.random() * keywords.length)].text
      : "social media and content creation";

  const contents = await generateContentWithGemini(
    "tweet",
    topic,
    settings?.clientName ?? null,
    settings?.clientNiche ?? null,
    settings?.clientTone ?? null,
    1
  );

  if (contents.length === 0) throw new Error("No content generated");

  const [item] = await db
    .insert(contentItemsTable)
    .values({ type: "tweet", topic, content: contents[0], status: "pending" })
    .returning();

  const msgId = await sendContentForApproval(item.id, item.type, item.topic, item.content);
  if (msgId) {
    await db
      .update(contentItemsTable)
      .set({ telegramMessageId: msgId })
      .where(eq(contentItemsTable.id, item.id));
  }
});

registerTrendingHandler(async () => {
  const [settings] = await db.select().from(appSettingsTable).limit(1);
  const trending = await generateTrendingTweets(
    settings?.clientName ?? null,
    settings?.clientNiche ?? null,
    settings?.clientTone ?? null,
    3
  );

  for (const { topic, content } of trending) {
    if (!content) continue;
    const [item] = await db
      .insert(contentItemsTable)
      .values({ type: "tweet", topic, content, status: "pending" })
      .returning();

    if (settings?.telegramEnabled ?? true) {
      const msgId = await sendContentForApproval(item.id, item.type, item.topic, item.content);
      if (msgId) {
        await db
          .update(contentItemsTable)
          .set({ telegramMessageId: msgId })
          .where(eq(contentItemsTable.id, item.id));
      }
    }
  }
});

startBot();
startScheduler();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
