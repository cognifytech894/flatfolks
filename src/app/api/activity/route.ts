import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { touchLastSeen } from "@/lib/database";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

/** Pinged once a day by signed-in browsers (ActivityPing) so page visits count as activity. */
export async function POST() {
  const cookieStore = await cookies();
  const userId = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  await touchLastSeen(userId);
  return new NextResponse(null, { status: 204 });
}
