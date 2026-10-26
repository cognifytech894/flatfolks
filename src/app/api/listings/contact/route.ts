import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/current-user";
import { revealContact, REVEALS_PER_DAY } from "@/lib/contact-reveals";
import { touchLastSeen } from "@/lib/database";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** "Show number": a post's phone number for a signed-in member, within the daily cap. */
export async function POST(request: Request) {
  if (await isRateLimited(request, "contact-reveal", 30)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  // Many accounts on one network can't add up their daily caps. Set well above
  // 30 because mobile networks put many real people behind one IP (CGNAT).
  if (await isRateLimited(request, "contact-reveal-day", 150, 24 * 60 * 60 * 1000)) return NextResponse.json({ error: "Too many numbers viewed from this network today. Please try again tomorrow." }, { status: 429 });
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Please log in to see contact details." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: unknown };
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/.test(body.id)) return NextResponse.json({ error: "Listing id is required." }, { status: 400 });
  await touchLastSeen(userId);
  const result = await revealContact(userId, body.id);
  if ("phone" in result) return NextResponse.json({ phone: result.phone }, { headers: { "Cache-Control": "no-store" } });
  if (result.error === "limit") return NextResponse.json({ error: `You've seen ${REVEALS_PER_DAY} numbers today, the daily limit. Please try again tomorrow.` }, { status: 429 });
  if (result.error === "no-phone") return NextResponse.json({ error: "No contact number was provided for this listing." }, { status: 404 });
  return NextResponse.json({ error: "This listing isn't available." }, { status: 404 });
}
