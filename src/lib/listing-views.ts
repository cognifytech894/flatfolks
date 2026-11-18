// Which listing page loads count as a view. A view is a person looking at
// someone else's post: the owner checking their own post doesn't count, nor
// do admins, search engines, link previews (WhatsApp, Facebook) or scripts.
import { headers } from "next/headers";
import { isAutomatedUserAgent } from "@/lib/automated-agent";
import { isAdminSession } from "@/lib/current-admin";

/** Whether this request's page load should add a view to a post owned by `ownerId`. */
export async function shouldCountView(ownerId: string | undefined, viewerId: string | null): Promise<boolean> {
  if (viewerId && viewerId === ownerId) return false;
  if (isAutomatedUserAgent((await headers()).get("user-agent"))) return false;
  return !(await isAdminSession());
}
