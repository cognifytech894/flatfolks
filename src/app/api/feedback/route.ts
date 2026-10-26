import { NextResponse } from "next/server";
import { addFeedback, getFeedback } from "@/lib/database";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getFeedback());
}

export async function POST(request: Request) {
  if (isRateLimited(request, "feedback", 5, 10 * 60_000)) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  const body = await request.json() as { name?: string; city?: string; rating?: number; message?: string };
  if (!body.name?.trim() || !body.city?.trim() || !body.message?.trim()) {
    return NextResponse.json({ error: "Name, city, and feedback message are required." }, { status: 400 });
  }
  if (body.message.trim().length > 500) return NextResponse.json({ error: "Feedback must be 500 characters or fewer." }, { status: 400 });
  if (body.name.trim().length > 60 || body.city.trim().length > 60) return NextResponse.json({ error: "Name and city must be 60 characters or fewer." }, { status: 400 });
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  // Saved for review; it appears on the home page once an admin approves it.
  await addFeedback({ name: body.name, city: body.city, rating, message: body.message });
  return NextResponse.json({ pending: true }, { status: 201 });
}
