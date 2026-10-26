// Time-based one-time codes (RFC 6238, as used by Google Authenticator,
// Microsoft Authenticator, Authy...) for the admin login's second step.
// Turned on by setting ADMIN_TOTP_SECRET (base32); `node scripts/admin-totp.mjs`
// makes one and prints the link to scan.
import { createHmac, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error("ADMIN_TOTP_SECRET is not valid base32.");
    value = (value << 5) | index; bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}

export function totpCode(secret: string, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secret)).update(message).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const number = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(number).padStart(6, "0");
}

/** Accepts the current code and the one either side of it, for clock drift. */
export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  const given = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(given)) return false;
  const counter = Math.floor(now / 1000 / STEP_SECONDS);
  let ok = false;
  for (const drift of [-1, 0, 1]) {
    ok = timingSafeEqual(Buffer.from(totpCode(secret, counter + drift)), Buffer.from(given)) || ok;
  }
  return ok;
}

export function adminTotpSecret(): string | undefined {
  return process.env.ADMIN_TOTP_SECRET?.trim() || undefined;
}
