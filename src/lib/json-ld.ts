/**
 * JSON.stringify doesn't escape "<", so a user-supplied string containing
 * "</script><script>..." inside JSON-LD data would break out of the
 * <script type="application/ld+json"> tag it's rendered into via
 * dangerouslySetInnerHTML. Escaping "<" to its unicode form keeps the JSON
 * value identical (JSON parsers treat < and < the same) while making it
 * inert as HTML.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
