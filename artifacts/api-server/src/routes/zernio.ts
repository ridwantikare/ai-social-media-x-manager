import { Router, type IRouter } from "express";
import { zernio } from "../lib/zernio-client";
import {
  ListZernioAccountsResponse,
  ListZernioProfilesResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/zernio/accounts", async (req, res): Promise<void> => {
  try {
    const response = await zernio.accounts.listAccounts({
      query: { platform: "twitter" },
    });
    const accounts = response.data?.accounts ?? [];

    const mapped = accounts.map((a: { _id: string; platform: string; username?: string; displayName?: string; profileId: string | { _id?: string }; isActive: boolean }) => ({
      id: a._id,
      platform: a.platform,
      username: a.username ?? a.displayName ?? "Unknown",
      profileId:
        typeof a.profileId === "string"
          ? a.profileId
          : (a.profileId as { _id?: string })?._id ?? null,
      status: a.isActive ? "connected" : "disconnected",
    }));

    res.json(ListZernioAccountsResponse.parse(mapped));
  } catch (err) {
    logger.error({ err }, "Failed to fetch Zernio accounts");
    res.status(502).json({ error: "Failed to fetch accounts from Zernio" });
  }
});

router.get("/zernio/profiles", async (req, res): Promise<void> => {
  try {
    const response = await zernio.profiles.listProfiles();
    const profiles = response.data?.profiles ?? [];

    const mapped = profiles.map((p: { _id?: string; name?: string; color?: string }) => ({
      id: p._id ?? "",
      name: p.name ?? "Unnamed Profile",
      color: p.color ?? null,
    }));

    res.json(ListZernioProfilesResponse.parse(mapped));
  } catch (err) {
    logger.error({ err }, "Failed to fetch Zernio profiles");
    res.status(502).json({ error: "Failed to fetch profiles from Zernio" });
  }
});

export default router;
