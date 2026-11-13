// Daily limits per account, on top of the per-network request limits: one
// member can't fill the photo storage (1 GB on the free plan) or flood the
// site with posts. Counted in Postgres, like every other limit.
import { overLimit } from "@/lib/rate-limit";

export const UPLOADS_PER_DAY = 40;
export const POSTS_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Counts one upload; true once this member has passed UPLOADS_PER_DAY in the last day. */
export function overUploadCap(userId: string): Promise<boolean> {
  return overLimit(`uploads-day:${userId}`, UPLOADS_PER_DAY, DAY_MS);
}

/** Counts one new post; true once this member has passed POSTS_PER_DAY in the last day. */
export function overPostCap(userId: string): Promise<boolean> {
  return overLimit(`posts-day:${userId}`, POSTS_PER_DAY, DAY_MS);
}
