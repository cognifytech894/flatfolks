import { NextResponse } from "next/server";
import { requestEmailLoginOtp, requestPhoneLoginOtp, requestRegistrationOtp, verifyEmailLoginOtp, verifyPhoneLoginOtp, verifyRegistrationOtp } from "@/lib/database";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json() as { action?: "request" | "verify" | "email-login-request" | "email-login-verify" | "phone-login-request" | "phone-login-verify"; email?: string; phone?: string; password?: string; otp?: string };
  try {
    if (body.action === "email-login-request") {
      if (!body.email?.trim()) return NextResponse.json({ error: "Email address is required." }, { status: 400 });
      const developmentCode = await requestEmailLoginOtp(body.email);
      return NextResponse.json({ message: "Temporary OTP created.", developmentCode });
    }
    if (body.action === "email-login-verify") {
      if (!body.email?.trim() || !body.otp?.trim()) return NextResponse.json({ error: "Email address and OTP are required." }, { status: 400 });
      return NextResponse.json({ user: await verifyEmailLoginOtp(body.email, body.otp) });
    }
    if (body.action === "phone-login-request") {
      if (!body.phone?.trim()) return NextResponse.json({ error: "Mobile number is required." }, { status: 400 });
      const developmentCode = await requestPhoneLoginOtp(body.phone);
      return NextResponse.json({ message: "Temporary OTP created.", developmentCode });
    }
    if (body.action === "phone-login-verify") {
      if (!body.phone?.trim() || !body.otp?.trim()) return NextResponse.json({ error: "Mobile number and OTP are required." }, { status: 400 });
      return NextResponse.json({ user: await verifyPhoneLoginOtp(body.phone, body.otp) });
    }
    if (body.action === "request") {
      if (!body.email?.trim() || !body.phone?.trim() || !body.password || body.password.length < 6) return NextResponse.json({ error: "Email, mobile number, and a 6-character password are required." }, { status: 400 });
      const developmentCode = await requestRegistrationOtp({ email: body.email, phone: body.phone, password: body.password });
      return NextResponse.json({ message: "Temporary OTP created.", developmentCode });
    }
    if (!body.email?.trim() || !body.otp?.trim()) return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
    return NextResponse.json({ user: await verifyRegistrationOtp({ email: body.email, otp: body.otp }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify this account.";
    return NextResponse.json({ error: message }, { status: message.includes("already exists") ? 409 : 400 });
  }
}
