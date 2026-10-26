/**
 * Where to go after login, from `?next=`: a path on this site, else "/".
 * Parsed as a URL rather than string-checked, because browsers drop tabs and
 * newlines, so "/\t/evil.com" would otherwise become "//evil.com".
 */
export function safeNext(next: string | null | undefined, origin: string): string {
  if (!next) return "/";
  try {
    const url = new URL(next, origin);
    return url.origin === origin ? url.pathname + url.search + url.hash : "/";
  } catch {
    return "/";
  }
}
