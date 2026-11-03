import Zernio from "@zernio/node";
import { logger } from "./logger";

if (!process.env.ZERNIO_API_KEY) {
  throw new Error("ZERNIO_API_KEY environment variable is required");
}

export const zernio = new Zernio({ apiKey: process.env.ZERNIO_API_KEY });

export async function postToX(
  content: string,
  accountId: string,
  scheduledFor?: Date | string | null
): Promise<{ postId: string; platformPostUrl: string | null }> {
  const scheduledIso =
    scheduledFor instanceof Date
      ? scheduledFor.toISOString()
      : scheduledFor ?? null;

  try {
    const response = await zernio.posts.createPost({
      body: {
        content,
        publishNow: !scheduledIso,
        platforms: [{ platform: "twitter", accountId }],
        ...(scheduledIso ? { scheduledFor: scheduledIso, publishNow: false } : {}),
      },
    });

    const post = response.data?.post as Record<string, unknown> | undefined;

    return {
      postId: (post?._id as string) ?? "",
      platformPostUrl: (post?.platformUrl as string) ?? null,
    };
  } catch (err) {
    logger.error({ err, accountId }, "Zernio post failed");
    throw err;
  }
}
