import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from "@/lib/admin-auth";
import { listBlockedIps, unblockIp } from "@/lib/admin-login-guard";

export const runtime = "nodejs";

async function isAdmin() {
  const cookieStore = await cookies();
  return isValidAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

/** IPs blocked from admin login after too many wrong passwords. */
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  return NextResponse.json({ blocked: await listBlockedIps(pool) });
}

/** Lets an IP try admin login again, with a fresh set of attempts. */
export async function DELETE(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { ip?: unknown };
  if (typeof body.ip !== "string" || !body.ip.trim()) return NextResponse.json({ error: "ip is required." }, { status: 400 });
  if (!await unblockIp(pool, body.ip.trim())) return NextResponse.json({ error: "That IP isn't blocked." }, { status: 404 });
  return NextResponse.json({ ip: body.ip.trim() });
}
