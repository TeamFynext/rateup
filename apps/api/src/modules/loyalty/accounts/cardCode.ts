/**
 * The member card code — what the QR on a customer's card encodes.
 *
 * Nine characters from the till-code alphabet (`randomCode` in random.utils: A–Z and
 * 2–9 without I, O, 0 and 1), read out and typed in groups of three when the camera
 * cannot. Unique across every organisation, and 32^9 ≈ 3.5 × 10^13 keeps collisions
 * negligible at any member count; a code only finds a member for signed-in staff or an
 * API key, so it is an identifier, not a credential.
 *
 * Pure, and mirrored by `logic/cardCode.ts` in rateup-app: the two parsers must accept the
 * same inputs.
 */

export const CARD_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CARD_CODE_LENGTH = 9;

const CARD_CODE_PATTERN = new RegExp(`^[${CARD_CODE_ALPHABET}]{${CARD_CODE_LENGTH}}$`);
/** The printed form: three groups of three. */
const GROUPED_PATTERN = new RegExp(
  `^([${CARD_CODE_ALPHABET}]{3})[\\s-]+([${CARD_CODE_ALPHABET}]{3})[\\s-]+([${CARD_CODE_ALPHABET}]{3})$`,
);

/**
 * The canonical code in `raw`, or null.
 *
 * Accepts the bare code, the grouped form the caption prints (`ABC-DEF-GHJ`, with spaces
 * or dashes), lower case, and a URL whose last path segment is a code — so a card page,
 * should one exist later, can be scanned by the same reader without re-issuing cards.
 */
export function parseCardCode(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  let candidate = raw.trim();
  if (/^https?:\/\//i.test(candidate)) {
    try {
      const segments = new URL(candidate).pathname.split("/").filter(Boolean);
      candidate = segments[segments.length - 1] ?? "";
    } catch {
      return null;
    }
  }
  const upper = candidate
    .replace(/\.png$/i, "")
    .trim()
    .toUpperCase();
  if (CARD_CODE_PATTERN.test(upper)) return upper;
  const grouped = GROUPED_PATTERN.exec(upper);
  return grouped ? `${grouped[1]}${grouped[2]}${grouped[3]}` : null;
}

/** `ABCDEFGHJ` → `ABC-DEF-GHJ`: how the code is printed and read aloud. */
export function formatCardCode(code: string): string {
  return code.match(/.{1,3}/g)?.join("-") ?? code;
}
