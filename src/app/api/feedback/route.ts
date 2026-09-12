import { NextResponse } from "next/server";
import { addFeedback, getFeedback } from "@/lib/database";

export const runtime = "nodejs";

const requests = new Map<string, { count: number; resetAt: number }>();
function rateLimited(request: Request) {
  const key = request.headers.get("x-forwarded-for") || "local";
  const now = Date.now(); const record = requests.get(key);
  if (!record || record.resetAt < now) { requests.set(key, { count: 1, resetAt: now + 60_000 }); return false; }
  record.count += 1; return record.count > 10;
}

export async function GET() {
  return NextResponse.json(await getFeedback());
}

export async function POST(request: Request) {
  if (rateLimited(request)) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  const body = await request.json() as { name?: string; city?: string; rating?: number; message?: string };
  if (!body.name?.trim() || !body.city?.trim() || !body.message?.trim()) {
    return NextResponse.json({ error: "Name, city, and feedback message are required." }, { status: 400 });
  }
  if (body.message.trim().length > 500) return NextResponse.json({ error: "Feedback must be 500 characters or fewer." }, { status: 400 });
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  const feedback = await addFeedback({ name: body.name, city: body.city, rating, message: body.message });
  return NextResponse.json(feedback, { status: 201 });
}
