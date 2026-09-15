import { NextResponse } from "next/server";
import { uploadImage } from "@/lib/image-storage";

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
  const body = await request.json() as { image?: string };
  if (!body.image) return NextResponse.json({ error: "An image is required." }, { status: 400 });
  try {
    return NextResponse.json({ url: await uploadImage(body.image) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not upload image." }, { status: 400 });
  }
}
