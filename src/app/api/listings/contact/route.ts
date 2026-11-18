import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/current-user";
import { revealContact, REVEALS_PER_DAY } from "@/lib/contact-reveals";
import { touchLastSeen } from "@/lib/database";
import { deviceIdFrom, saveDeviceId } from "@/lib/device-id";
import { isUuid, jsonBody } from "@/lib/json-body";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** "Show number": a post's phone number for a signed-in member, within the daily caps per account and per device. */
export async function POST(request: Request) {
  if (await isRateLimited(request, "contact-reveal", 30)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  // Many accounts on one network can't add up their daily caps. Set well above
  // REVEALS_PER_DAY because mobile networks put many real people behind one IP (CGNAT).
  if (await isRateLimited(request, "contact-reveal-day", 150, 24 * 60 * 60 * 1000)) return NextResponse.json({ error: "Too many numbers viewed from this network today. Please try again tomorrow." }, { status: 429 });
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Please log in to see contact details." }, { status: 401 });
  const body = await jsonBody(request);
  if (!isUuid(body.id)) return NextResponse.json({ error: "Listing id is required." }, { status: 400 });
  await touchLastSeen(userId);
  const device = deviceIdFrom(request);
  const result = await revealContact(userId, device.id, body.id);
  const respond = (json: object, init?: ResponseInit) => saveDeviceId(NextResponse.json(json, init), request, device);
  if ("phone" in result) return respond({ phone: result.phone }, { headers: { "Cache-Control": "no-store" } });
  if (result.error === "limit") return respond({ error: `You've seen ${REVEALS_PER_DAY} numbers today, the daily limit. Please try again tomorrow.` }, { status: 429 });
  if (result.error === "device-limit") return respond({ error: `${REVEALS_PER_DAY} numbers have been seen on this device today, the daily limit. Please try again tomorrow.` }, { status: 429 });
  if (result.error === "no-phone") return respond({ error: "No contact number was provided for this listing." }, { status: 404 });
  return respond({ error: "This listing isn't available." }, { status: 404 });
}
