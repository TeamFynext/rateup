import type { MemberCardSendResult } from "@/api/loyalty/loyalty.type";

/**
 * The member card code — what the QR on a customer's card encodes.
 *
 * A mirror of `rateup-api/src/modules/loyalty/accounts/cardCode.ts`: twelve characters
 * from the till-code alphabet (A–Z and 2–9 without I, O, 0 and 1). The two parsers must
 * accept the same inputs, because the server is the one that finally decides.
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
 * should one exist later, scans with the same reader.
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

/**
 * What the counter says after "Send card". Every skip has a next step staff can actually
 * take, because the common one — no open WhatsApp window — is fixed by the customer, not
 * by retrying.
 */
export function cardSendMessage(outcome: MemberCardSendResult): string {
  if (outcome.sent) return "Card sent on WhatsApp.";
  switch (outcome.skippedReason) {
    case "session_closed":
      return "Ask them to message you on WhatsApp first, then try again.";
    case "not_active":
      return "The card can only be sent to an active member of an active programme.";
    case "no_public_url":
      return "This server has no public address for card images yet — ask an admin.";
    case "send_failed":
      return "WhatsApp did not accept the message. Try again in a moment.";
    default:
      return "The card was not sent.";
  }
}
