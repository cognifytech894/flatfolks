import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { uploadImage } from "@/lib/image-storage";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

const requests = new Map<string, { count: number; resetAt: number }>();
function rateLimited(request: Request) {
  const key = request.headers.get("x-forwarded-for") || "local";
  const now = Date.now(); const record = requests.get(key);
  if (!record || record.resetAt < now) { requests.set(key, { count: 1, resetAt: now + 60_000 }); return false; }
  record.count += 1; return record.count > 30;
}

export async function POST(request: Request) {
  if (rateLimited(request)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  // Only signed-in users upload (profile photos, listing photos); otherwise anyone
  // could fill the storage bucket.
  const cookieStore = await cookies();
  if (!verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)) return NextResponse.json({ error: "Please log in to upload photos." }, { status: 401 });
  const body = await request.json() as { image?: string };
  if (!body.image) return NextResponse.json({ error: "An image is required." }, { status: 400 });
  try {
    return NextResponse.json({ url: await uploadImage(body.image) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not upload image." }, { status: 400 });
  }
}
