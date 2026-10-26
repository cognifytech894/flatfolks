// Makes a secret for the admin login's authenticator-app step.
// Run: node scripts/admin-totp.mjs
// Then put ADMIN_TOTP_SECRET in Vercel's env vars, redeploy, and scan the
// link (or type the secret) in Google Authenticator / Microsoft Authenticator.
import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const bytes = randomBytes(20);
let bits = 0, value = 0, secret = "";
for (const byte of bytes) {
  value = (value << 8) | byte; bits += 8;
  while (bits >= 5) { secret += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
}
if (bits > 0) secret += ALPHABET[(value << (5 - bits)) & 31];

console.log(`ADMIN_TOTP_SECRET=${secret}`);
console.log(`\nAdd to your authenticator app:\notpauth://totp/FlatFolks:admin?secret=${secret}&issuer=FlatFolks&algorithm=SHA1&digits=6&period=30`);
