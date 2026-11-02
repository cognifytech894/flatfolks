/**
 * A request's JSON object body. Anything else (bad JSON, null, a list, a bare
 * value) reads as {}, so a broken request fails the routes' own field checks
 * with a 400 instead of throwing a 500.
 */
export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => undefined);
  return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
