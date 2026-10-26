import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from "@/lib/admin-auth";
import { setManagedByAdmin } from "@/lib/database";
import { publicErrorMessage } from "@/lib/public-error";

export const runtime = "nodejs";

/** Admin toggle: posts managed by the admin are never removed for owner inactivity. */
export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  if (!isValidAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  const body = await request.json() as { id?: string; managedByAdmin?: unknown };
  if (!body.id || typeof body.managedByAdmin !== "boolean") return NextResponse.json({ error: "id and managedByAdmin are required." }, { status: 400 });
  try {
    await setManagedByAdmin(body.id, body.managedByAdmin);
    return NextResponse.json({ id: body.id, managedByAdmin: body.managedByAdmin });
  } catch (error) {
    return NextResponse.json({ error: publicErrorMessage(error, "Could not update listing.") }, { status: 404 });
  }
}
