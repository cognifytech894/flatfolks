// One person, one account: Gmail ignores dots and anything after "+", so
// a.b+1@gmail.com and ab@gmail.com are the same inbox. Accounts, OTP limits and
// the daily "Show number" cap are keyed on this normalized form, so extra
// aliases of one inbox don't get extra accounts or extra limits.
//
// Kept free of "@/..." imports so Node can load it directly in tests.

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function normalizeEmail(email: string): string {
  const lower = email.trim().toLowerCase();
  const at = lower.lastIndexOf("@");
  if (at < 1) return lower;
  const local = lower.slice(0, at), domain = lower.slice(at + 1);
  if (GMAIL_DOMAINS.has(domain)) return `${local.split("+")[0].replace(/\./g, "")}@gmail.com`;
  return lower;
}

/** The same rule in SQL, to fill in email_key for accounts made before it existed. */
export const EMAIL_KEY_SQL = `CASE WHEN split_part(lower(email), '@', 2) IN ('gmail.com', 'googlemail.com')
  THEN replace(split_part(split_part(lower(email), '@', 1), '+', 1), '.', '') || '@gmail.com'
  ELSE lower(email) END`;
