import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { normalisePhone } from "../util.js";

/**
 * Finding the member behind an inbound event, for callers who hold a phone number, an email
 * address, or both — the Shopify bridge and the partner API.
 *
 * Two things here are deliberate and easy to undo by accident:
 *
 * **Normalisation is `normalisePhone`, not `parsePhoneforWa`.** The latter only strips a
 * leading "+", so Shopify's `"+91 98765 43210"` — spaces and all — never matched a stored
 * contact, and neither did a bare local `"09876543210"`. Contacts hold E.164 digits without
 * the "+" (see `createCustomerAccount`), which is exactly what `normalisePhone` returns.
 *
 * **An ambiguous email awards nothing.** `Contact.email` has no uniqueness, so two members
 * can share one. Points are money-equivalent, and a silent wrong guess is unauditable — so
 * beyond one narrow tie-break (a supplied phone that singles a candidate out) this reports
 * `ambiguous` and leaves the decision to a human who can merge the contacts.
 */

const MEMBER_INCLUDE = {
  contact: {
    select: { id: true, name: true, phone: true, email: true, orgId: true },
  },
  currentTier: { select: { id: true, name: true } },
} as const;

export type MemberAccount = Awaited<
  ReturnType<typeof prisma.customerLoyaltyAccount.findFirst<{ include: typeof MEMBER_INCLUDE }>>
>;

export type MemberMatch =
  | { status: "matched"; account: NonNullable<MemberAccount>; matchedBy: "phone" | "email" }
  | {
      status: "not_found";
      reason: "no_identifier" | "phone_invalid" | "not_enrolled";
    }
  | { status: "ambiguous"; matchedBy: "email"; candidateAccountIds: string[] };

export interface ResolveMemberInput {
  programId: string;
  orgId: string;
  /** `LoyaltyProgram.defaultCountryCode` — what a local-format number is interpreted against. */
  defaultCountryCode: string;
  phone?: string | null;
  email?: string | null;
  /**
   * Include accounts that are not `active`. Off by default: a suspended or closed account
   * must not earn from an online order. Lookups that need to *show* such an account (a
   * support view) opt in.
   */
  includeInactive?: boolean;
}

/**
 * Phone first, then email. A phone that fails to parse is not fatal — it falls through to
 * the email branch rather than dropping an order that carried a usable address.
 */
export async function resolveProgramMember(input: ResolveMemberInput): Promise<MemberMatch> {
  const { programId, orgId, defaultCountryCode, includeInactive = false } = input;

  const statusFilter = includeInactive ? {} : { status: "active" };
  const scope = { programId, ...statusFilter, contact: { orgId } };

  let phoneInvalid = false;
  const rawPhone = input.phone?.trim();
  let normalisedPhone: string | null = null;

  if (rawPhone) {
    normalisedPhone = normalisePhone(rawPhone, defaultCountryCode);
    if (!normalisedPhone) {
      phoneInvalid = true;
    } else {
      const byPhone = await prisma.customerLoyaltyAccount.findFirst({
        // `[phone, orgId]` is unique on Contact, so this is single-valued by construction.
        where: { ...scope, contact: { orgId, phone: normalisedPhone } },
        include: MEMBER_INCLUDE,
      });
      if (byPhone) return { status: "matched", account: byPhone, matchedBy: "phone" };
    }
  }

  const email = input.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await prisma.customerLoyaltyAccount.findMany({
      where: { ...scope, contact: { orgId, email: { equals: email, mode: "insensitive" } } },
      include: MEMBER_INCLUDE,
      // One more than we can act on, so "exactly one" is distinguishable from "several"
      // without scanning a large shared address.
      take: 10,
    });

    if (byEmail.length === 1) {
      return { status: "matched", account: byEmail[0]!, matchedBy: "email" };
    }

    if (byEmail.length > 1) {
      // The only tie-break: a phone that was supplied, parsed, and singles one out. Anything
      // looser would be guessing.
      const narrowed = normalisedPhone
        ? byEmail.filter((a) => a.contact?.phone === normalisedPhone)
        : [];
      if (narrowed.length === 1) {
        return { status: "matched", account: narrowed[0]!, matchedBy: "phone" };
      }
      return {
        status: "ambiguous",
        matchedBy: "email",
        candidateAccountIds: byEmail.map((a) => a.id),
      };
    }
  }

  if (!rawPhone && !email) return { status: "not_found", reason: "no_identifier" };
  if (phoneInvalid && !email) return { status: "not_found", reason: "phone_invalid" };
  return { status: "not_found", reason: "not_enrolled" };
}

/** The matched account, or null — for callers that do not care why a lookup missed. */
export async function findProgramMember(
  input: ResolveMemberInput,
): Promise<NonNullable<MemberAccount> | null> {
  const match = await resolveProgramMember(input);
  if (match.status === "matched") return match.account;
  if (match.status === "ambiguous") {
    log.warn(
      { programId: input.programId, candidates: match.candidateAccountIds.length },
      "Loyalty member lookup was ambiguous by email; refusing to guess",
    );
  }
  return null;
}
