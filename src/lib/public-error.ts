/**
 * The message to show for a failed request. Errors this app throws on purpose
 * ("Listing not found.") are shown as they are; database and system errors
 * (they carry a `code`, e.g. a Postgres SQLSTATE) are logged and replaced with
 * `fallback`, so table names and internals never reach the browser.
 */
export function publicErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && !("code" in error)) return error.message;
  console.error(fallback, error);
  return fallback;
}
