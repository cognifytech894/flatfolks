import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { isAdminSession } from "@/lib/current-admin";
import { jsonBody } from "@/lib/json-body";
import { listBlockedIps, unblockIp } from "@/lib/admin-login-guard";

export const runtime = "nodejs";

/** IPs blocked from admin login after too many wrong passwords. */
export async function GET() {
  if (!await isAdminSession()) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  return NextResponse.json({ blocked: await listBlockedIps(pool) });
}

/** Lets an IP try admin login again, with a fresh set of attempts. */
export async function DELETE(request: Request) {
  if (!await isAdminSession()) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  const body = await jsonBody(request) as { ip?: unknown };
  if (typeof body.ip !== "string" || !body.ip.trim()) return NextResponse.json({ error: "ip is required." }, { status: 400 });
  if (!await unblockIp(pool, body.ip.trim())) return NextResponse.json({ error: "That IP isn't blocked." }, { status: 404 });
  return NextResponse.json({ ip: body.ip.trim() });
}
