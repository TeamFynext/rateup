/**
 * Escapes a value for interpolation into HTML text or a quoted attribute.
 *
 * Written for the public marketing forms, which interpolated every field of an
 * anonymous request body straight into an email body. The confirmation half was
 * the serious one: it goes to whatever address the submitter typed, rendered with
 * RateUp's logo, styling and footer, so unescaped markup made the endpoint an
 * unauthenticated way to send convincing RateUp-branded mail with attacker-chosen
 * content, from RateUp's own sending domain. See issues.txt 16.1.
 *
 * Escapes the five characters that matter in both contexts, so the result is safe
 * inside element text and inside `"…"` or `'…'` attribute values alike. It is not
 * safe in an UNQUOTED attribute value, where a space ends the value — quote the
 * attribute.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
