import { Resend } from "resend";

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "FlatFolks <onboarding@resend.dev>";

function client() {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

/** Returns false (never throws) when RESEND_API_KEY isn't set, so callers can fall back to showing the OTP on-screen for local dev. */
export async function sendOtpEmail(to: string, code: string): Promise<boolean> {
  const resend = client();
  if (!resend) return false;
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Your FlatFolks verification code is ${code}`,
    html: `<p>Your one-time password is <b style="font-size:20px;letter-spacing:3px">${code}</b>.</p><p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
  if (error) throw new Error(error.message);
  return true;
}
