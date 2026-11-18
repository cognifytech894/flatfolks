// Daily limits, on top of the per-network request limits: one member can't
// fill the photo storage (1 GB on the free plan) or churn posts by deleting
// and reposting. Counted in Postgres, like every other limit.
import { countHit, currentCount, overLimit } from "@/lib/rate-limit";

export const UPLOADS_PER_DAY = 40;
/** New posts in any 24 hours, per account and per device (on top of POSTS_AT_A_TIME live at once). */
export const POSTS_PER_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Counts one upload; true once this member has passed UPLOADS_PER_DAY in the last day. */
export function overUploadCap(userId: string): Promise<boolean> {
  return overLimit(`uploads-day:${userId}`, UPLOADS_PER_DAY, DAY_MS);
}

const postKeys = (userId: string, deviceId: string) => [`posts-day:${userId}`, `posts-day-device:${deviceId}`];

/** True when this account or this device has already published POSTS_PER_DAY posts in the last day. */
export async function postCapReached(userId: string, deviceId: string): Promise<boolean> {
  try {
    const counts = await Promise.all(postKeys(userId, deviceId).map((key) => currentCount(key, DAY_MS)));
    return counts.some((count) => count >= POSTS_PER_DAY);
  } catch (error) {
    console.error("Daily post cap check failed; allowing the post.", error);
    return false;
  }
}

/** Counts a post that was actually published, so refused attempts never use up the day's posts. */
export async function countPost(userId: string, deviceId: string): Promise<void> {
  await Promise.all(postKeys(userId, deviceId).map((key) => countHit(key, DAY_MS)))
    .catch((error) => console.error("Could not count a post toward the daily cap.", error));
}
