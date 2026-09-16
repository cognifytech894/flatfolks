import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, verifyAdminCredentials } from "@/lib/admin-auth";
import { isRateLimited } from "@/lib/rate-limit";
import { isSecureContext } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isRateLimited(request, "admin-login", 10, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }
  const body = await request.json() as { username?: string; password?: string };
  if (!body.username?.trim() || !body.password || !verifyAdminCredentials(body.username.trim(), body.password)) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureContext(request),
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
