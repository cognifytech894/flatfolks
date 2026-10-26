import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";
import { userIdFromToken } from "@/lib/session-store";

export { getSessionVersion, revokeSessions, userIdFromToken } from "@/lib/session-store";

/** The signed-in member's id for this request, or null. */
export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return userIdFromToken(cookieStore.get(SESSION_COOKIE)?.value);
}
