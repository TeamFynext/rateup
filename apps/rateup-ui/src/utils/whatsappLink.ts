/**
 * Shared helpers for the public WhatsApp link/QR tools under `/tools`.
 *
 * WhatsApp's click-to-chat endpoint (`wa.me`) expects the number in E.164 form
 * *without* the leading `+` and without spaces, dashes or brackets. Getting that
 * wrong is the single most common reason a hand-built link fails, so all of the
 * normalisation lives here and both tools import it.
 */
import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js";

/** Max length WhatsApp reliably accepts in a prefilled `?text=` parameter. */
export const WHATSAPP_PREFILL_MAX_LENGTH = 1000;

export interface WhatsAppLinkResult {
  /** The finished `https://wa.me/...` URL, or "" when the number is unusable. */
  url: string;
  /** Digits-only E.164 (no `+`) — what `wa.me` actually wants. */
  digits: string;
  /** Human-readable international form, for display back to the user. */
  formatted: string;
  isValid: boolean;
  error: string | null;
}

const EMPTY: WhatsAppLinkResult = {
  url: "",
  digits: "",
  formatted: "",
  isValid: false,
  error: null,
};

/**
 * Turn a raw phone number + optional prefilled message into a wa.me link.
 *
 * `phone` is expected in E.164 (`+919876543210`) — which is what the shared
 * `PhoneInput` component emits — but a number typed with spaces or brackets is
 * parsed too, so the tool stays forgiving.
 */
export function buildWhatsAppLink(phone: string, message = ""): WhatsAppLinkResult {
  const raw = phone.trim();
  if (!raw) return EMPTY;

  const parsed = parsePhoneNumberFromString(raw);
  if (!parsed || !isValidPhoneNumber(raw)) {
    return {
      ...EMPTY,
      error:
        "That doesn't look like a valid number. Include the country code, e.g. +91 98765 43210.",
    };
  }

  // `.number` is E.164 with the leading "+", which wa.me must not receive.
  const digits = parsed.number.replace(/\D/g, "");
  const trimmedMessage = message.slice(0, WHATSAPP_PREFILL_MAX_LENGTH);
  const query = trimmedMessage ? `?text=${encodeURIComponent(trimmedMessage)}` : "";

  return {
    url: `https://wa.me/${digits}${query}`,
    digits,
    formatted: parsed.formatInternational(),
    isValid: true,
    error: null,
  };
}

/** Copy text to the clipboard, resolving to whether it worked. */
export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await globalThis.navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
