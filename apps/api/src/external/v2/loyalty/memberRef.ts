import { parsePhoneNumberFromString } from "libphonenumber-js";
import z from "zod";

import { parseCardCode } from "../../../modules/loyalty/accounts/cardCode.js";
import {
  getCustomerAccountByCardCode,
  getCustomerAccountByPhone,
} from "../../../modules/loyalty/accounts/account.service.js";
import { normalisePhone } from "../../../modules/loyalty/util.js";
import { ExternalApiError } from "../../shared/errors.js";

/**
 * How an external caller names a member.
 *
 * **Phone or card code, never an id.** The old surface asked for `contactId` / `customerId`
 * — RateUp UUIDs that a till has no way to obtain — which is why `award-points` could not
 * actually be called by the systems it was built for. A POS has exactly two things: the
 * number the customer gives, and the code on the card it just scanned.
 *
 * **Two named fields rather than one polymorphic path segment.** A card code is nine
 * characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, and that alphabet includes the digits
 * 2-9 — so a card code can be all digits, and a short local number made only of those
 * digits parses as a perfectly valid card code. On an endpoint that moves points, an identifier that can be read two
 * ways is not acceptable, so the caller says which one it means.
 */

/**
 * A member's phone in a request body. Digits with the country code, no `+`
 * (`"919876543210"`), like the rest of v2; a JSON number, a leading `+`, separators, or a
 * number local to the programme's country are accepted too. Parsed by `normaliseMemberPhone`
 * once the programme (and so its country) is known.
 */
export const memberPhoneSchema = z
  .union([z.string().trim().min(4).max(32), z.number().int().positive()])
  .transform(String)
  .describe(
    "Digits with the country code, no `+`, e.g. 919876543210. A number local to the " +
      "programme's country also works",
  );

export const memberRefSchema = z
  .object({
    phone: memberPhoneSchema.optional(),
    /** Bare, grouped (`ABC-DEF-GHJ`), lower case, or the card URL. */
    cardCode: z.string().trim().min(1).max(64).optional(),
  })
  .refine((r) => Boolean(r.phone) !== Boolean(r.cardCode), {
    message: "Provide exactly one of phone or cardCode",
  });

export type MemberRef = z.infer<typeof memberRefSchema>;

/** Reads: `?phone=` or `?cardCode=`. */
export const memberRefQuerySchema = memberRefSchema;

interface ResolvableProgram {
  id: string;
  defaultCountryCode: string;
}

/**
 * The member behind a ref, or a 4xx explaining which half of the request was wrong.
 *
 * A card code that does not parse and a phone that is not a number are 400s (the caller
 * sent nonsense); a well-formed identifier that matches nobody is a 404.
 */
export async function resolveMember(program: ResolvableProgram, orgId: string, ref: MemberRef) {
  if (ref.cardCode) {
    const code = parseCardCode(ref.cardCode);
    if (!code) {
      throw new ExternalApiError(400, "card_code_invalid", "That is not a valid card code");
    }
    const account = await getCustomerAccountByCardCode(program.id, code);
    if (!account) {
      throw new ExternalApiError(404, "member_not_found", "No member holds that card");
    }
    return account;
  }

  const phone = normaliseRefPhone(program, ref.phone!);
  // Already digits with the country code, which is how contacts are stored — the
  // normalisation inside `getCustomerAccountByPhone` then has nothing left to do.
  const account = await getCustomerAccountByPhone(program.id, phone, orgId);
  if (!account) {
    throw new ExternalApiError(404, "member_not_found", "No member with that phone number");
  }
  return account;
}

/**
 * A caller's phone → digits with the country code, or null.
 *
 * v2 documents phones as digits with the country code and no `+` (`919876543210`), but
 * `normalisePhone` reads a `+`-less string as local to the programme's country — so a
 * foreign member's `971501234567` on an Indian programme came back as `91971501234567`.
 * Digits-only input is therefore tried as an international number first, and only read as
 * local when that is not a valid number (`9876543210` on an Indian programme). Anything with
 * a `+` or a trunk `0` goes straight to `normalisePhone`.
 */
export function normaliseMemberPhone(raw: string, defaultCountry: string): string | null {
  const digits = raw.trim().replace(/[\s().-]/g, "");
  if (/^[1-9]\d+$/.test(digits)) {
    const international = parsePhoneNumberFromString(`+${digits}`);
    if (international?.isValid()) return international.number.slice(1);
  }
  return normalisePhone(raw, defaultCountry);
}

/** For the enrolment pre-check, where "nobody" is an answer rather than an error. */
export function normaliseRefPhone(program: ResolvableProgram, phone: string): string {
  const normalised = normaliseMemberPhone(phone, program.defaultCountryCode);
  if (!normalised) {
    throw new ExternalApiError(400, "phone_invalid", "That is not a valid phone number");
  }
  return normalised;
}
