// Sign-in emails. Each address is its own account: "ankit.kumar@gmail.com" and
// "ankitkumar@gmail.com" are different accounts. The part before "@" may only
// use letters, digits, dots, "_" and "-" (ankit.kumar02@, riya_s@), so "+tags"
// (ankit+2@) and other special characters are refused: one inbox can't sign up again and
// again as tagged aliases to get extra accounts and extra daily limits.
//
// Kept free of "@/..." imports so Node can load it directly in tests.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Before "@": a–z, 0–9, ".", "_" and "-", starting and ending with a letter or
 * digit, and no ".." (mail servers reject those). After "@": a normal domain
 * like gmail.com.
 */
export function isValidSignInEmail(email: string): boolean {
  const value = normalizeEmail(email);
  return value.length <= 190 && !value.includes("..") && /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(value);
}
