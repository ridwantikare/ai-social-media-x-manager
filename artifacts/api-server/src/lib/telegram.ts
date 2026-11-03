import { Telegraf, Context } from "telegraf";
import { logger } from "./logger";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN environment variable is required");
}

if (!CHAT_ID) {
  throw new Error("TELEGRAM_GROUP_CHAT_ID environment variable is required");
}

export const bot = new Telegraf(BOT_TOKEN);

let onApprove: ((contentId: number) => Promise<void>) | null = null;
let onReject: ((contentId: number) => Promise<void>) | null = null;
let onGenerate: (() => Promise<void>) | null = null;
let onEdit: ((contentId: number, newContent: string) => Promise<void>) | null = null;

const pendingEdits = new Map<number, number>();

export function registerCallbackHandlers(
  approveHandler: (contentId: number) => Promise<void>,
  rejectHandler: (contentId: number) => Promise<void>
) {
  onApprove = approveHandler;
  onReject = rejectHandler;
}

export function registerGenerateHandler(handler: () => Promise<void>) {
  onGenerate = handler;
}

export function registerEditHandler(handler: (contentId: number, newContent: string) => Promise<void>) {
  onEdit = handler;
}

bot.command("chatid", async (ctx: Context) => {
  const id = ctx.chat?.id;
  await ctx.reply(`Chat ID: \`${id}\``, { parse_mode: "Markdown" });
});

let onTrending: (() => Promise<void>) | null = null;

export function registerTrendingHandler(handler: () => Promise<void>) {
  onTrending = handler;
}

bot.command("trending", async (ctx: Context) => {
  if (!onTrending) {
    await ctx.reply("Not ready yet. Try again in a moment.");
    return;
  }
  await ctx.reply("🔍 Finding trending topics and generating tweets...");
  try {
    await onTrending();
  } catch (err) {
    logger.error({ err }, "Telegram /trending command failed");
    await ctx.reply("❌ Failed to fetch trends. Try again shortly.");
  }
});

bot.command("generate", async (ctx: Context) => {
  if (!onGenerate) {
    await ctx.reply("Generator not ready yet. Try again in a moment.");
    return;
  }
  await ctx.reply("⏳ Generating a tweet...");
  try {
    await onGenerate();
  } catch (err) {
    logger.error({ err }, "Telegram /generate command failed");
    await ctx.reply("❌ Generation failed. Check your keywords and settings.");
  }
});

bot.on("callback_query", async (ctx: Context) => {
  const query = ctx.callbackQuery;
  if (!query || !("data" in query)) return;

  const data = query.data;
  const [action, idStr] = data.split(":");
  const contentId = parseInt(idStr, 10);

  if (isNaN(contentId)) {
    await ctx.answerCbQuery("Invalid content ID");
    return;
  }

  try {
    if (action === "approve" && onApprove) {
      await onApprove(contentId);
      await ctx.answerCbQuery("Approved and posting...");
      await ctx.editMessageText(
        (ctx.callbackQuery.message && "text" in ctx.callbackQuery.message
          ? ctx.callbackQuery.message.text
          : "") + "\n\n✅ APPROVED — Posted to X",
        { reply_markup: { inline_keyboard: [] } }
      );
    } else if (action === "reject" && onReject) {
      await onReject(contentId);
      await ctx.answerCbQuery("Rejected");
      await ctx.editMessageText(
        (ctx.callbackQuery.message && "text" in ctx.callbackQuery.message
          ? ctx.callbackQuery.message.text
          : "") + "\n\n❌ REJECTED",
        { reply_markup: { inline_keyboard: [] } }
      );
    } else if (action === "edit") {
      await ctx.answerCbQuery("Reply with your edited tweet text");
      const prompt = await ctx.reply(
        "✏️ *Reply to this message* with your edited tweet \\(under 280 characters\\):",
        {
          parse_mode: "MarkdownV2",
          reply_markup: { force_reply: true, selective: false },
        }
      );
      pendingEdits.set(prompt.message_id, contentId);
    }
  } catch (err) {
    logger.error({ err, contentId, action }, "Telegram callback handler error");
    await ctx.answerCbQuery("Error processing request");
  }
});

bot.on("message", async (ctx: Context) => {
  const msg = ctx.message;
  if (!msg || !("text" in msg) || !("reply_to_message" in msg) || !msg.reply_to_message) return;

  const replyToId = msg.reply_to_message.message_id;
  const contentId = pendingEdits.get(replyToId);
  if (contentId === undefined) return;

  pendingEdits.delete(replyToId);

  const newContent = msg.text.trim();
  if (newContent.length > 280) {
    await ctx.reply(`❌ Too long (${newContent.length} chars). Must be under 280. Reply again to the prompt.`);
    pendingEdits.set(replyToId, contentId);
    return;
  }

  try {
    if (onEdit) await onEdit(contentId, newContent);
  } catch (err) {
    logger.error({ err, contentId }, "Edit handler failed");
    await ctx.reply("❌ Failed to save edit. Try again.");
  }
});

export async function sendContentForApproval(
  contentId: number,
  type: string,
  topic: string,
  content: string
): Promise<number | null> {
  try {
    const typeEmoji = type === "tweet" ? "🐦" : type === "reply" ? "💬" : "💡";
    const message = `${typeEmoji} *New ${type.toUpperCase()} for approval*\n\n*Topic:* ${escapeMarkdown(topic)}\n\n${escapeMarkdown(content)}`;

    const sent = await bot.telegram.sendMessage(CHAT_ID!, message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Approve & Post", callback_data: `approve:${contentId}` },
            { text: "❌ Reject", callback_data: `reject:${contentId}` },
          ],
          [
            { text: "✏️ Edit", callback_data: `edit:${contentId}` },
          ],
        ],
      },
    });

    return sent.message_id;
  } catch (err) {
    logger.error({ err, contentId }, "Failed to send Telegram approval message");
    return null;
  }
}

export async function sendNotification(message: string): Promise<void> {
  try {
    await bot.telegram.sendMessage(CHAT_ID!, message, { parse_mode: "Markdown" });
  } catch (err) {
    logger.error({ err }, "Failed to send Telegram notification");
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export function startBot(): void {
  bot.launch({ dropPendingUpdates: true }).catch((err) => {
    logger.error({ err }, "Telegram bot launch error");
  });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));

  logger.info("Telegram bot started (polling)");
}
