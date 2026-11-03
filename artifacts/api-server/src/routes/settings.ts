import { Router, type IRouter } from "express";
import { db, appSettingsTable } from "@workspace/db";
import { UpdateSettingsBody, GetSettingsResponse, UpdateSettingsResponse } from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

async function getOrCreateSettings() {
  const existing = await db.select().from(appSettingsTable).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db
    .insert(appSettingsTable)
    .values({ telegramEnabled: true, autoGenerateEnabled: false, generateInterval: 60 })
    .returning();
  return created;
}

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(GetSettingsResponse.parse(settings));
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await getOrCreateSettings();

  const [updated] = await db
    .update(appSettingsTable)
    .set(parsed.data)
    .where(sql`1=1`)
    .returning();

  if (!updated) {
    res.status(500).json({ error: "Failed to update settings" });
    return;
  }

  res.json(UpdateSettingsResponse.parse(updated));
});

export default router;
