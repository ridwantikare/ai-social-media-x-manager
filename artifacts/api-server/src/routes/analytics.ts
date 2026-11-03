import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, contentItemsTable, keywordsTable } from "@workspace/db";
import {
  GetAnalyticsOverviewResponse,
  ListPostedContentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/analytics/overview", async (_req, res): Promise<void> => {
  const allItems = await db.select().from(contentItemsTable);
  const keywords = await db.select().from(keywordsTable);

  const counts = {
    total: allItems.length,
    pending: allItems.filter((i) => i.status === "pending").length,
    approved: allItems.filter((i) => i.status === "approved").length,
    rejected: allItems.filter((i) => i.status === "rejected").length,
    posted: allItems.filter((i) => i.status === "posted").length,
    keywords: keywords.length,
  };

  res.json(GetAnalyticsOverviewResponse.parse(counts));
});

router.get("/analytics/posts", async (_req, res): Promise<void> => {
  const posted = await db
    .select()
    .from(contentItemsTable)
    .where(eq(contentItemsTable.status, "posted"))
    .orderBy(contentItemsTable.updatedAt);

  res.json(ListPostedContentResponse.parse(posted));
});

export default router;
