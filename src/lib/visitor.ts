import { cookies } from "next/headers";
import type { Listing } from "@/lib/database";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** Whether this request carries a valid member session. */
export async function isSignedIn(): Promise<boolean> {
  const cookieStore = await cookies();
  return Boolean(verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value));
}

/**
 * A listing as a signed-out visitor may see it: the place, rent and details
 * stay (they're what search engines index), but nothing about the person who
 * posted it. Pages then show "FlatFolks member" and a plain avatar, and the
 * name, photo, gender and phone never reach the HTML.
 */
export function withoutOwnerDetails<T extends Listing>(listing: T): T {
  return { ...listing, ownerName: undefined, ownerPhoto: undefined, ownerGender: undefined, contactPhone: undefined };
}

/** Listings with owner details removed unless the visitor is signed in. */
export async function listingsForVisitor<T extends Listing>(listings: T[]): Promise<T[]> {
  return (await isSignedIn()) ? listings : listings.map(withoutOwnerDetails);
}
