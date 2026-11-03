import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, keywordsTable } from "@workspace/db";
import {
  CreateKeywordBody,
  DeleteKeywordParams,
  ListKeywordsResponse,
  CreateKeywordResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/keywords", async (req, res): Promise<void> => {
  const keywords = await db
    .select()
    .from(keywordsTable)
    .orderBy(keywordsTable.createdAt);
  res.json(ListKeywordsResponse.parse(keywords));
});

router.post("/keywords", async (req, res): Promise<void> => {
  const parsed = CreateKeywordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(keywordsTable)
    .where(eq(keywordsTable.text, parsed.data.text));

  if (existing.length > 0) {
    res.status(409).json({ error: "Keyword already exists" });
    return;
  }

  const [keyword] = await db
    .insert(keywordsTable)
    .values({ text: parsed.data.text })
    .returning();

  res.status(201).json(CreateKeywordResponse.parse(keyword));
});

router.delete("/keywords/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteKeywordParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [deleted] = await db
    .delete(keywordsTable)
    .where(eq(keywordsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Keyword not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
