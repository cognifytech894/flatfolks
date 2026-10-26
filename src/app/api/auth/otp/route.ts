import { after, NextResponse } from "next/server";
import { OtpError, requestEmailAuthOtp, verifyEmailAuthOtp } from "@/lib/database";
import { sendOtpEmail, sendWelcomeEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site-url";
import { buildWelcomeEmail } from "@/lib/welcome-email";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";
import { isRateLimited } from "@/lib/rate-limit";
import { isDisposableEmail } from "@/data/disposable-email-domains";
import { createSessionToken, isSecureContext, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";
import { getSessionVersion, revokeSessions, userIdFromToken } from "@/lib/current-user";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json() as { action?: "email-auth-request" | "email-auth-verify"; email?: string; otp?: string };
  try {
    if (body.action === "email-auth-request") {
      if (await isRateLimited(request, "otp-request", 5)) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
      if (!body.email?.trim()) return NextResponse.json({ error: "Email address is required." }, { status: 400 });
      if (isDisposableEmail(body.email)) return NextResponse.json({ error: "Please use a permanent email address, not a temporary inbox." }, { status: 400 });
      // One network asking for codes for many different emails (an attacker cycling targets).
      if (await isRateLimited(request, "otp-request-day", 50, 24 * 60 * 60 * 1000)) return NextResponse.json({ error: "Too many requests today. Please try again tomorrow." }, { status: 429 });
      const otp = await requestEmailAuthOtp(body.email);
      // The code only ever goes to the inbox. Showing it on screen when email
      // can't be sent is a local-development convenience; in production it
      // would let anyone sign in as any email address.
      const showCode = process.env.NODE_ENV !== "production";
      try {
        const sent = await sendOtpEmail(body.email, otp);
        if (sent) return NextResponse.json({ message: "OTP sent to your email." });
        if (showCode) return NextResponse.json({ message: "Temporary OTP created.", developmentCode: otp });
        console.error("OTP email not sent: RESEND_API_KEY is not configured.");
      } catch (error) {
        console.error("Failed to send OTP email:", error);
        if (showCode) return NextResponse.json({ message: "Temporary OTP created.", developmentCode: otp });
      }
      return NextResponse.json({ error: "We couldn't send the code right now. Please try again in a few minutes." }, { status: 502 });
    }
    if (body.action === "email-auth-verify") {
      // A tighter limit than the request action — this is the step an OTP brute-force would hammer.
      if (await isRateLimited(request, "otp-verify", 10)) return NextResponse.json({ error: "Too many attempts. Please request a new OTP." }, { status: 429 });
      if (!body.email?.trim() || !body.otp?.trim()) return NextResponse.json({ error: "Email address and OTP are required." }, { status: 400 });
      const { user, isNewUser } = await verifyEmailAuthOtp(body.email, body.otp);
      // Only an account created just now gets the welcome email, once. It goes
      // out after the response so login isn't slowed, and a failure never
      // blocks login.
      if (isNewUser) {
        after(async () => {
          try { await sendWelcomeEmail(buildWelcomeEmail(user.email, siteUrl)); }
          catch (error) { console.error("Failed to send welcome email:", error); }
        });
      }
      const response = NextResponse.json({ user, isNewUser });
      response.cookies.set(SESSION_COOKIE, createSessionToken(user.id, (await getSessionVersion(user.id)) ?? 0), {
        httpOnly: true, sameSite: "lax", secure: isSecureContext(request), path: "/", maxAge: 60 * 60 * 24 * SESSION_DAYS,
      });
      // One sign-in per browser: a member login ends any admin session here.
      response.cookies.delete(ADMIN_SESSION_COOKIE);
      return response;
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    if (error instanceof OtpError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not verify this account." }, { status: 400 });
  }
}

/** Log out: ends this account's sessions on every device (copied cookies too), then clears this browser's cookie. */
export async function DELETE() {
  const cookieStore = await cookies();
  const userId = await userIdFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (userId) await revokeSessions(userId).catch((error) => console.error("Could not revoke sessions on logout.", error));
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
