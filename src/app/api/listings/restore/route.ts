import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { restoreOwnPost, restoreWithToken } from "@/lib/inactive-posts";
import { isRateLimited } from "@/lib/rate-limit";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Two ways to bring a removed post back:
 * - the "Restore my post" form on /restore (form-encoded `token`, no login needed);
 * - the Restore button in My Posts (JSON `{ id }`, owner's session).
 */
export async function POST(request: Request) {
  if (isRateLimited(request, "restore", 20)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const now = new Date();

  if ((request.headers.get("content-type") || "").includes("application/json")) {
    const cookieStore = await cookies();
    const userId = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
    if (!userId) return NextResponse.json({ error: "Please log in to restore a post." }, { status: 401 });
    const { id } = await request.json() as { id?: string };
    if (!id || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Listing id is required." }, { status: 400 });
    const result = await restoreOwnPost(pool, id, userId, now);
    if (result === "gone") return NextResponse.json({ error: "This post has been permanently deleted." }, { status: 410 });
    if (result === "stale") return NextResponse.json({ error: "You can only restore your own posts." }, { status: 403 });
    return NextResponse.json({ result });
  }

  const secret = process.env.RESTORE_TOKEN_SECRET;
  if (!secret) return NextResponse.json({ error: "Restoring isn't configured." }, { status: 500 });
  const form = await request.formData();
  const token = String(form.get("token") || "");
  const { result } = await restoreWithToken(pool, token, secret, now);
  // 303 so the browser follows with a GET and a refresh doesn't resubmit.
  return NextResponse.redirect(new URL(`/restore?result=${result}`, request.url), 303);
}
