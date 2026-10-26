import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/current-user";
import { touchLastSeen } from "@/lib/database";

export const runtime = "nodejs";

/** Pinged once a day by signed-in browsers (ActivityPing) so page visits count as activity. */
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  await touchLastSeen(userId);
  return new NextResponse(null, { status: 204 });
}
