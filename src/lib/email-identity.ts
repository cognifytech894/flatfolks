// Sign-in emails. Each address is its own account: "ankit.kumar@gmail.com" and
// "ankitkumar@gmail.com" are different accounts. Addresses with a "+tag"
// (ankit+2@gmail.com) are refused, so one inbox can't sign up again and again
// as tagged aliases to get extra accounts and extra daily limits.
//
// Kept free of "@/..." imports so Node can load it directly in tests.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** A plain address: something@domain.tld, no spaces and no "+". */
export function isValidSignInEmail(email: string): boolean {
  const value = normalizeEmail(email);
  return value.length <= 190 && /^[^\s@+]+@[^\s@]+\.[^\s@]+$/.test(value);
}
