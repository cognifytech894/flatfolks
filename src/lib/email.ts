import { Resend } from "resend";
import { contactEmail } from "@/data/contact";

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "FlatFolks <onboarding@resend.dev>";

// The welcome email comes from hello@ on the same verified domain as the OTP
// address (e.g. otp@flatfolks.in → hello@flatfolks.in), unless set explicitly.
// Resend's shared test domain has no hello@, so it keeps the default sender.
function welcomeFromAddress() {
  if (process.env.RESEND_WELCOME_FROM_EMAIL) return process.env.RESEND_WELCOME_FROM_EMAIL;
  const domain = FROM_ADDRESS.match(/@([^>\s]+)>?\s*$/)?.[1];
  return domain && domain !== "resend.dev" ? `FlatFolks <hello@${domain}>` : FROM_ADDRESS;
}

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
    replyTo: contactEmail,
    to,
    subject: `Your FlatFolks verification code is ${code}`,
    html: `<p>Your one-time password is <b style="font-size:20px;letter-spacing:3px">${code}</b>.</p><p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
  if (error) throw new Error(error.message);
  return true;
}

/** Sends a prepared email. Throws when Resend isn't configured or rejects it, so callers can retry. */
export async function sendEmail(email: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const resend = client();
  if (!resend) throw new Error("RESEND_API_KEY is not configured.");
  const { error } = await resend.emails.send({ from: FROM_ADDRESS, ...email });
  if (error) throw new Error(error.message);
}

/** The one-time welcome email for a new account. Returns false when Resend isn't configured. */
export async function sendWelcomeEmail(email: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  const resend = client();
  if (!resend) return false;
  // Replies go to the support inbox, which is the one that exists on the domain.
  const { error } = await resend.emails.send({ from: welcomeFromAddress(), replyTo: contactEmail, ...email });
  if (error) throw new Error(error.message);
  return true;
}
