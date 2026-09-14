import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, verifyAdminCredentials } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json() as { username?: string; password?: string };
  if (!body.username?.trim() || !body.password || !verifyAdminCredentials(body.username.trim(), body.password)) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    // Not "secure": this app is deployed over plain HTTP (no domain/TLS), and
    // `next start` always runs in production mode, so gating on NODE_ENV here
    // would make the browser silently refuse to store the cookie.
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
