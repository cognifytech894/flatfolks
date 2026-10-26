// Throwaway inbox services. Accounts from these can be made by the hundred,
// which is how contact numbers would be scraped, so they can't sign up.
// Lower-case domains; subdomains of these are blocked too.
export const disposableEmailDomains = new Set([
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com", "anonaddy.me", "burnermail.io",
  "byom.de", "dispostable.com", "dropmail.me", "emailondeck.com", "fakeinbox.com", "fakemail.net",
  "getairmail.com", "getnada.com", "guerrillamail.biz", "guerrillamail.com", "guerrillamail.de",
  "guerrillamail.info", "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com", "harakirimail.com",
  "inboxkitten.com", "incognitomail.org", "jetable.org", "mail-temp.com", "mail.tm", "mailcatch.com",
  "maildrop.cc", "mailinator.com", "mailinator.net", "mailnesia.com", "mailsac.com", "mintemail.com",
  "moakt.com", "mohmal.com", "mytemp.email", "nada.email", "sharklasers.com", "spam4.me", "spambox.us",
  "spamgourmet.com", "temp-mail.io", "temp-mail.org", "tempail.com", "tempmail.com", "tempmail.dev",
  "tempmail.net", "tempmailo.com", "tempr.email", "throwawaymail.com", "trashmail.com", "trashmail.de",
  "trashmail.net", "yopmail.com", "yopmail.fr", "yopmail.net", "emailfake.com", "grr.la", "pokemail.net",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] || "";
  const parts = domain.split(".");
  // "x.mailinator.com" → check "x.mailinator.com", "mailinator.com".
  for (let i = 0; i < parts.length - 1; i++) if (disposableEmailDomains.has(parts.slice(i).join("."))) return true;
  return false;
}
