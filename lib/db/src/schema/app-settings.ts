import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  defaultZernioAccountId: text("default_zernio_account_id"),
  telegramEnabled: boolean("telegram_enabled").notNull().default(true),
  autoGenerateEnabled: boolean("auto_generate_enabled").notNull().default(false),
  generateInterval: integer("generate_interval").notNull().default(60),
  clientName: text("client_name"),
  clientNiche: text("client_niche"),
  clientTone: text("client_tone"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAppSettingsSchema = createInsertSchema(appSettingsTable).omit({ id: true, updatedAt: true });
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type AppSettings = typeof appSettingsTable.$inferSelect;
