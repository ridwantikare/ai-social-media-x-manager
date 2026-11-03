import { db, contentItemsTable, keywordsTable, appSettingsTable } from "@workspace/db";
import { generateContentWithGemini } from "./gemini";
import { sendContentForApproval } from "./telegram";
import { logger } from "./logger";
import { eq } from "drizzle-orm";

let timer: ReturnType<typeof setTimeout> | null = null;

async function runAutoGenerate(): Promise<void> {
  try {
    const [settings] = await db.select().from(appSettingsTable).limit(1);

    if (!settings?.autoGenerateEnabled) return;

    const keywords = await db.select().from(keywordsTable);
    const topic =
      keywords.length > 0
        ? keywords[Math.floor(Math.random() * keywords.length)].text
        : "social media and content creation";

    logger.info({ topic }, "Auto-generating content");

    const contents = await generateContentWithGemini(
      "tweet",
      topic,
      settings.clientName ?? null,
      settings.clientNiche ?? null,
      settings.clientTone ?? null,
      1
    );

    if (contents.length === 0) return;

    const [item] = await db
      .insert(contentItemsTable)
      .values({
        type: "tweet",
        topic,
        content: contents[0],
        status: "pending",
      })
      .returning();

    if (settings.telegramEnabled) {
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
        }
      } catch (err) {
        logger.warn({ err, itemId: item.id }, "Auto-gen: failed to send Telegram approval");
      }
    }

    logger.info({ itemId: item.id, topic }, "Auto-generated content sent for approval");
  } catch (err) {
    logger.error({ err }, "Auto-generate run failed");
  }
}

function scheduleNext(): void {
  db.select()
    .from(appSettingsTable)
    .limit(1)
    .then(([settings]) => {
      const intervalMinutes = settings?.generateInterval ?? 60;
      const ms = intervalMinutes * 60 * 1000;

      timer = setTimeout(async () => {
        await runAutoGenerate();
        scheduleNext();
      }, ms);

      logger.info({ intervalMinutes }, "Auto-generate scheduler armed");
    })
    .catch((err) => {
      logger.error({ err }, "Scheduler: failed to read settings, retrying in 5 min");
      timer = setTimeout(() => scheduleNext(), 5 * 60 * 1000);
    });
}

export function startScheduler(): void {
  scheduleNext();
}

export function stopScheduler(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
