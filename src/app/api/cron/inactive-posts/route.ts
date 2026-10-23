import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { deleteImages } from "@/lib/image-storage";
import { runInactivePostsJob } from "@/lib/inactive-posts";
import { siteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request, secret: string) {
  const given = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Daily Vercel Cron (vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const restoreSecret = process.env.RESTORE_TOKEN_SECRET;
  if (!cronSecret || !restoreSecret) return NextResponse.json({ error: "CRON_SECRET and RESTORE_TOKEN_SECRET must be set." }, { status: 500 });
  if (!authorized(request, cronSecret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const report = await runInactivePostsJob({
    db: pool,
    now: new Date(),
    siteUrl,
    secret: restoreSecret,
    sendEmail,
    deleteImages,
    warnings: process.env.INACTIVITY_WARNING_EMAILS === "true",
  });
  return NextResponse.json(report);
}
