import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, verifyAdminCredentials } from "@/lib/admin-auth";
import { clientIp, failAdminLoginAttempt, passAdminLoginAttempt, startAdminLoginAttempt } from "@/lib/admin-login-guard";
import { isRateLimited } from "@/lib/rate-limit";
import { isSecureContext } from "@/lib/session";

export const runtime = "nodejs";

const blocked = () => NextResponse.json({ error: "Too many wrong attempts. Admin login is blocked from this IP address." }, { status: 403 });

export async function POST(request: Request) {
  if (isRateLimited(request, "admin-login", 10, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }
  // A blocked IP is refused before its password is even looked at, so the right one doesn't help either.
  const ip = clientIp(request);
  const attempt = await startAdminLoginAttempt(pool, ip);
  if (!attempt.allowed) return blocked();

  const body = await request.json().catch(() => ({})) as { username?: string; password?: string };
  if (!body.username?.trim() || !body.password || !verifyAdminCredentials(body.username.trim(), body.password)) {
    const left = await failAdminLoginAttempt(pool, ip, attempt.attempt);
    if (!left) return blocked();
    return NextResponse.json({ error: `Incorrect username or password. ${left} attempt${left === 1 ? "" : "s"} left before this IP is blocked.` }, { status: 401 });
  }
  await passAdminLoginAttempt(pool, ip);
  const response = NextResponse.json({ ok: true });
  // No maxAge: a browser-session cookie, gone when the browser closes. The
  // token inside also expires 30 minutes after login (src/lib/admin-auth.ts).
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: isSecureContext(request),
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
