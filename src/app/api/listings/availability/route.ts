import { NextResponse } from "next/server";
import { getListingAvailability } from "@/lib/database";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Saved listings live in each visitor's browser, so the server can't delete
 * them when a post goes. Browsers ask here instead and drop ids that are gone.
 */
export async function POST(request: Request) {
  if (await isRateLimited(request, "availability", 30)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const body = await request.json().catch(() => ({})) as { ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string").slice(0, 100) : [];
  return NextResponse.json(await getListingAvailability(ids));
}
