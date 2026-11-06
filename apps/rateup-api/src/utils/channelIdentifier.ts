/**
 * The business-side channel a message ran on, reduced to the one spelling
 * everything can be compared against.
 *
 * `WaMessage.sourceIdentifier` was written by several paths that each spelled the
 * same number differently — the campaign worker stored `WhatsappSettings.phone`
 * verbatim, the inbox send path stripped only the `+`, and the webhook stores
 * whatever Meta's `display_phone_number` carries. Production holds at least
 * `+96550334145`, `96550334145`, `+965 50334145` and `+9655-033-4145` for what is
 * one number, so any `=` between two of them is a coin flip: the inbox channel
 * filter and channel-scoped access both silently missed whole spellings.
 *
 * Digits only, because that is the one form every source agrees on after
 * stripping — and the form `metadata.display_phone_number` reduces to.
 *
 * Not for `phone` columns that are shown to people: `WhatsappSettings.phone` is
 * rendered as the channel's label, and `+9655-033-4145` reads better there than
 * `96550334145`. This is for the identifier a message is matched by.
 */
export function channelDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/**
 * A phone number as it may be written before it is reduced: digits plus the
 * formatting Meta's `display_phone_number` and our own settings carry.
 *
 * Anything outside this is not a number and is left alone — stripping it to its
 * digits would invent an identifier rather than tidy one (`phone-1` would become
 * `1`, which is a different channel, and a plausible one).
 */
const DIALABLE = /^[+\s().-]*\d[\d\s().-]*$/;

/**
 * `sourceIdentifier` as it should be stored: a phone number reduced to digits,
 * and everything else untouched.
 *
 * The column is shared. Besides WhatsApp numbers it holds `internal` for system
 * notes, Instagram and Facebook account ids, and a WhatsApp phone id where an org
 * has no number string — all opaque, none of them reformattable.
 *
 * Returns undefined for an absent identifier, so a caller can tell "no channel"
 * from "a channel that normalises to nothing".
 */
export function normalizeSourceIdentifier(
  value: string | null | undefined,
  platform?: string | null,
): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  // Only WhatsApp identifiers are phone numbers.
  if (platform && platform !== "WHATSAPP") return value;
  if (!DIALABLE.test(value)) return value;
  return channelDigits(value) || value;
}

/**
 * Every spelling of one channel that `WaMessage.sourceIdentifier` may hold, for
 * matching against rows written before identifiers were settled on digits.
 *
 * A list of literals rather than `regexp_replace(...) = digits`, because the
 * comparison has to stay on the existing `sourceIdentifier` btree indexes: an
 * expression match seq-scans a table of millions of rows, and the inbox list
 * query runs it per request. The stored rows have since been normalised (the
 * backfill completed 2026-09-16), so every row is the `digits` entry and the
 * rest are dead weight this can shed.
 *
 * The spellings are not guesses; each is one a real write path produced:
 * `WhatsappSettings.phone` verbatim (the campaign worker), that value with only
 * the `+` removed (the old inbox send path), digits (current code), and digits
 * with a `+` (the webhook's `display_phone_number`).
 */
export function channelIdentifierSpellings(...values: Array<string | null | undefined>): string[] {
  const spellings = new Set<string>();

  for (const value of values) {
    const digits = channelDigits(value);
    // No digits means this is not a channel at all. Listing it would put a value
    // in a scope or filter that names no number, which is the one way this could
    // match rows it has no business matching.
    if (!value || !digits) continue;

    for (const spelling of [value, value.replace("+", ""), digits, `+${digits}`]) {
      if (spelling) spellings.add(spelling);
    }
  }

  return Array.from(spellings);
}
