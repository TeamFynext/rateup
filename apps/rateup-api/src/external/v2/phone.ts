import { parsePhoneNumberFromString } from "libphonenumber-js";
import z from "zod";

import { isBsuid } from "../../modules/whatsapp/bsuid.js";

const EXAMPLE = "Digits with the country code, no `+`, e.g. 919876543210";

/**
 * A phone number on the partner API: digits with the country code and no `+`, e.g.
 * `"919876543210"` — the shape v1 used, and how Contact.phone is stored.
 *
 * A JSON number (`919876543210`) is accepted too, as v1 took one. For tolerance a leading `+`
 * and spaces, dashes, dots or brackets are stripped, so `"+91 98765-43210"` still works.
 * Either way the value handed on is digits only, country code first, checked with
 * libphonenumber.
 */
export const phoneSchema = z
  .union([z.string().trim().min(4).max(32), z.number().int().positive()])
  .transform((value, ctx) => {
    const digits = String(value)
      .replace(/^\+/, "")
      .replace(/[\s().-]/g, "");
    const parsed = /^\d+$/.test(digits) ? parsePhoneNumberFromString(`+${digits}`) : undefined;
    if (!parsed?.isValid()) {
      ctx.addIssue({ code: "custom", message: "Not a valid phone number with a country code" });
      return z.NEVER;
    }
    return parsed.number.slice(1);
  })
  .describe(EXAMPLE);

/**
 * Who a WhatsApp send goes to: a phone number (normalised exactly as `phoneSchema`), or a
 * WhatsApp business-scoped user ID (BSUID) such as `"US.13491208655302741918"` — what a contact
 * with a WhatsApp username has instead of a phone (see `businessScopedUserId` on a contact).
 * A BSUID is passed through verbatim.
 */
export const waRecipientSchema = z
  .union([z.string().trim().min(4).max(160), z.number().int().positive()])
  .transform((value, ctx) => {
    if (typeof value === "string" && isBsuid(value)) return value;
    const result = phoneSchema.safeParse(value);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        message:
          "Not a valid phone number with a country code, or a business-scoped user ID (BSUID)",
      });
      return z.NEVER;
    }
    return result.data;
  })
  .describe(
    "Digits with the country code, no `+` (e.g. 919876543210), or the contact's `businessScopedUserId` (e.g. US.13491208655302741918)",
  );

/** A phone in a response: same shape as `phoneSchema`'s output. */
export const wirePhoneSchema = z.string().describe(EXAMPLE);

/**
 * A stored phone as the partner API emits it: digits only, no `+`.
 *
 * Contact.phone is meant to be digits already, but some rows were written with a leading `+`
 * (or spaces) by older paths; every v2 response goes through this so the wire shape does not
 * depend on how a row happened to be stored.
 */
export function toWirePhone(phone: string | null | undefined): string | null {
  if (phone == null) return null;
  const digits = phone.replace(/\D/g, "");
  return digits || null;
}

/**
 * Every way a digits-only phone may be stored on Contact.phone. Most rows hold digits, but some
 * paths stored a leading `+`; a lookup or duplicate check that only tried the digits would miss
 * those rows and create a second contact for the same person.
 */
export function storedPhoneSpellings(digits: string): string[] {
  return [digits, `+${digits}`];
}
