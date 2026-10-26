// Time-based one-time codes (RFC 6238, as used by Google Authenticator,
// Microsoft Authenticator, Authy...) for the admin login's second step.
// Turned on by setting ADMIN_TOTP_SECRET (base32); `node scripts/admin-totp.mjs`
// makes one and prints the link to scan.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";

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

/**
 * The time step a code belongs to, or null. Accepts the current code and the
 * one either side of it, for clock drift.
 */
export function matchTotp(secret: string, code: string, now = Date.now()): number | null {
  const given = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(given)) return null;
  const counter = Math.floor(now / 1000 / STEP_SECONDS);
  let matched: number | null = null;
  for (const drift of [-1, 0, 1]) {
    if (timingSafeEqual(Buffer.from(totpCode(secret, counter + drift)), Buffer.from(given))) matched = counter + drift;
  }
  return matched;
}

export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  return matchTotp(secret, code, now) !== null;
}

/**
 * Marks a code's time step as used. A code works once: false when this step,
 * or a later one, was already used, so a code seen over someone's shoulder
 * can't be replayed within its 90 seconds.
 */
export async function claimTotpStep(db: Pool, step: number): Promise<boolean> {
  await db.query("CREATE TABLE IF NOT EXISTS admin_totp_state (id INTEGER PRIMARY KEY, last_step BIGINT NOT NULL)");
  await db.query("ALTER TABLE admin_totp_state ENABLE ROW LEVEL SECURITY");
  const { rowCount } = await db.query(
    `INSERT INTO admin_totp_state (id, last_step) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET last_step = EXCLUDED.last_step WHERE admin_totp_state.last_step < EXCLUDED.last_step`,
    [step],
  );
  return rowCount === 1;
}

export function adminTotpSecret(): string | undefined {
  return process.env.ADMIN_TOTP_SECRET?.trim() || undefined;
}
