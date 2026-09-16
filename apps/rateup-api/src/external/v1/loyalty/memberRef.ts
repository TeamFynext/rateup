import z from "zod";

import { parseCardCode } from "../../../modules/loyalty/accounts/cardCode.js";
import {
  getCustomerAccountByCardCode,
  getCustomerAccountByPhone,
} from "../../../modules/loyalty/accounts/account.service.js";
import { normalisePhone } from "../../../modules/loyalty/util.js";
import { ExternalApiError } from "../errors.js";

/**
 * How an external caller names a member.
 *
 * **Phone or card code, never an id.** The old surface asked for `contactId` / `customerId`
 * — RateUp UUIDs that a till has no way to obtain — which is why `award-points` could not
 * actually be called by the systems it was built for. A POS has exactly two things: the
 * number the customer gives, and the code on the card it just scanned.
 *
 * **Two named fields rather than one polymorphic path segment.** A card code is twelve
 * characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, and that alphabet includes the digits
 * 2-9 — so a twelve-digit phone number made only of those digits parses as a perfectly
 * valid card code. On an endpoint that moves points, an identifier that can be read two
 * ways is not acceptable, so the caller says which one it means.
 */

export const memberRefSchema = z
  .object({
    /** Any format: E.164, spaced, or local to the programme's country. */
    phone: z.string().trim().min(4).max(32).optional(),
    /** Bare, grouped (`ABCD-EFGH-JKLM`), lower case, or the card URL. */
    cardCode: z.string().trim().min(1).max(64).optional(),
  })
  .refine((r) => Boolean(r.phone) !== Boolean(r.cardCode), {
    message: "Provide exactly one of phone or cardCode",
  });

export type MemberRef = z.infer<typeof memberRefSchema>;

/** Reads: `?phone=` or `?cardCode=`. */
export const memberRefQuerySchema = memberRefSchema;

/** Writes: the same pair, nested so it reads as one thing in the body. */
export const memberRefBodySchema = z.object({ member: memberRefSchema });

export interface ResolvableProgram {
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

  const phone = normalisePhone(ref.phone!, program.defaultCountryCode);
  if (!phone) {
    throw new ExternalApiError(400, "phone_invalid", "That is not a valid phone number");
  }
  // Already E.164 digits, which is how contacts are stored — the normalisation inside
  // `getCustomerAccountByPhone` then has nothing left to do.
  const account = await getCustomerAccountByPhone(program.id, phone, orgId);
  if (!account) {
    throw new ExternalApiError(404, "member_not_found", "No member with that phone number");
  }
  return account;
}

/** For the enrolment pre-check, where "nobody" is an answer rather than an error. */
export function normaliseRefPhone(program: ResolvableProgram, phone: string): string {
  const normalised = normalisePhone(phone, program.defaultCountryCode);
  if (!normalised) {
    throw new ExternalApiError(400, "phone_invalid", "That is not a valid phone number");
  }
  return normalised;
}
