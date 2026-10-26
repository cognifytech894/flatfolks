/**
 * Whether a state-changing request may come from this Origin. Browsers send
 * Origin on every cross-site POST/PATCH/DELETE, so a page on another site
 * can't make a signed-in visitor's browser change anything here. Requests
 * without an Origin (curl, server-to-server, Vercel Cron) carry no visitor's
 * cookies by accident, so they're left to the routes' own checks.
 */
export function isAllowedOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return true;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
