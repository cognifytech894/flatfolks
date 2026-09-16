// Best-effort, per-serverless-instance IP throttle — not a substitute for a
// shared store (Vercel functions don't share memory across instances), but it
// still blunts single-instance abuse and costs nothing to run everywhere.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(request: Request, key: string, limit: number, windowMs = 60_000) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const record = buckets.get(bucketKey);
  if (!record || record.resetAt < now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return false;
  }
  record.count += 1;
  return record.count > limit;
}
