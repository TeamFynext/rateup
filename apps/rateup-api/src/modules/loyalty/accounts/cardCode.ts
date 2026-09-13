/**
 * The member card code — what the QR on a customer's card encodes.
 *
 * Twelve characters from the till-code alphabet (`randomCode` in random.utils: A–Z and
 * 2–9 without I, O, 0 and 1), so the same code can be read by a camera or typed at the
 * counter when the camera cannot. The space is 32^12 ≈ 1.2 × 10^18, which is what makes a
 * bare code safe to treat as the member's identifier without a signature.
 *
 * Pure, and mirrored by `logic/cardCode.ts` in rateup-app: the two parsers must accept the
 * same inputs.
 */

export const CARD_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CARD_CODE_LENGTH = 12;

const CARD_CODE_PATTERN = new RegExp(`^[${CARD_CODE_ALPHABET}]{${CARD_CODE_LENGTH}}$`);
/** The printed form: three groups of four. Only this grouping is unpicked, so a redemption
 * code (`RU-` + ten characters from the same alphabet) can never be mistaken for a card. */
const GROUPED_PATTERN = new RegExp(
  `^([${CARD_CODE_ALPHABET}]{4})[\\s-]+([${CARD_CODE_ALPHABET}]{4})[\\s-]+([${CARD_CODE_ALPHABET}]{4})$`,
);

/**
 * The canonical code in `raw`, or null.
 *
 * Accepts the bare code, the grouped form the caption prints (`ABCD-EFGH-JKLM`, with spaces
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

/** `ABCDEFGHJKLM` → `ABCD-EFGH-JKLM`: how the code is printed and read aloud. */
export function formatCardCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}
