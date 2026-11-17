// Daily limits per account, on top of the per-network request limits: one
// member can't fill the photo storage (1 GB on the free plan). Counted in
// Postgres, like every other limit. Posts have no daily limit, only a limit
// on how many are live at once (POSTS_AT_A_TIME).
import { overLimit } from "@/lib/rate-limit";

export const UPLOADS_PER_DAY = 40;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Counts one upload; true once this member has passed UPLOADS_PER_DAY in the last day. */
export function overUploadCap(userId: string): Promise<boolean> {
  return overLimit(`uploads-day:${userId}`, UPLOADS_PER_DAY, DAY_MS);
}
