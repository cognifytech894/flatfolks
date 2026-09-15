import { NextResponse } from "next/server";
import { requestEmailAuthOtp, verifyEmailAuthOtp } from "@/lib/database";
import { sendOtpEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json() as { action?: "email-auth-request" | "email-auth-verify"; email?: string; otp?: string };
  try {
    if (body.action === "email-auth-request") {
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
      if (!body.email?.trim() || !body.otp?.trim()) return NextResponse.json({ error: "Email address and OTP are required." }, { status: 400 });
      const { user, isNewUser } = await verifyEmailAuthOtp(body.email, body.otp);
      return NextResponse.json({ user, isNewUser });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not verify this account." }, { status: 400 });
  }
}
