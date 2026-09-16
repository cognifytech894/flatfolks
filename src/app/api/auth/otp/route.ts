import { NextResponse } from "next/server";
import { requestEmailAuthOtp, verifyEmailAuthOtp } from "@/lib/database";
import { sendOtpEmail } from "@/lib/email";
import { isRateLimited } from "@/lib/rate-limit";
import { createSessionToken, isSecureContext, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json() as { action?: "email-auth-request" | "email-auth-verify"; email?: string; otp?: string };
  try {
    if (body.action === "email-auth-request") {
      if (isRateLimited(request, "otp-request", 5)) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
      if (!body.email?.trim()) return NextResponse.json({ error: "Email address is required." }, { status: 400 });
      const otp = await requestEmailAuthOtp(body.email);
      try {
        const sent = await sendOtpEmail(body.email, otp);
        return NextResponse.json({ message: sent ? "OTP sent to your email." : "Temporary OTP created.", developmentCode: sent ? undefined : otp });
      } catch (error) {
        console.error("Failed to send OTP email:", error);
        return NextResponse.json({ message: "Temporary OTP created.", developmentCode: otp });
      }
    }
    if (body.action === "email-auth-verify") {
      // A tighter limit than the request action — this is the step an OTP brute-force would hammer.
      if (isRateLimited(request, "otp-verify", 10)) return NextResponse.json({ error: "Too many attempts. Please request a new OTP." }, { status: 429 });
      if (!body.email?.trim() || !body.otp?.trim()) return NextResponse.json({ error: "Email address and OTP are required." }, { status: 400 });
      const { user, isNewUser } = await verifyEmailAuthOtp(body.email, body.otp);
      const response = NextResponse.json({ user, isNewUser });
      response.cookies.set(SESSION_COOKIE, createSessionToken(user.id), {
        httpOnly: true, sameSite: "lax", secure: isSecureContext(request), path: "/", maxAge: 60 * 60 * 24 * 30,
      });
      return response;
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not verify this account." }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
