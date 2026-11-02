import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";
import { isLiveAdminToken } from "@/lib/admin-session-store";

/** Whether this request carries a live admin session (signed, unexpired, not logged out). */
export async function isAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return isLiveAdminToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}
