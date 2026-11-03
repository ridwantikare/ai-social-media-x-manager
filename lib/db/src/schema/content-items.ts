import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentItemsTable = pgTable("content_items", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // tweet | reply | idea
  topic: text("topic").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected | posted
  platformPostUrl: text("platform_post_url"),
  zernioAccountId: text("zernio_account_id"),
  telegramMessageId: integer("telegram_message_id"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertContentItemSchema = createInsertSchema(contentItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContentItem = z.infer<typeof insertContentItemSchema>;
export type ContentItem = typeof contentItemsTable.$inferSelect;
