import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { uploadImage } from "@/lib/image-storage";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { touchLastSeen } from "@/lib/database";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isRateLimited(request, "upload", 30)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  // Only signed-in users upload (profile photos, listing photos); otherwise anyone
  // could fill the storage bucket.
  const cookieStore = await cookies();
  const sessionUserId = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!sessionUserId) return NextResponse.json({ error: "Please log in to upload photos." }, { status: 401 });
  await touchLastSeen(sessionUserId);
  const body = await request.json() as { image?: string };
  if (!body.image) return NextResponse.json({ error: "An image is required." }, { status: 400 });
  try {
    return NextResponse.json({ url: await uploadImage(body.image) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not upload image." }, { status: 400 });
  }
}
