import z from "zod";

export enum CustomerAccountStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  CLOSED = "CLOSED",
}

const customerLoyaltyAccountSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().optional(),
  referCode: z.string().optional(),
  source: z.string().optional(),
  orgId: z.string().min(1),
  /**
   * A birthday is a calendar date, so a plain `YYYY-MM-DD` is accepted alongside the full
   * timestamp older clients send (which is a local midnight run through `toISOString`).
   */
  dob: z.iso.datetime().or(z.iso.date()).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  /**
   * Honeypot. The public join form renders this off-screen and no person fills it in; a
   * bot that autofills every field does. The public handler answers a filled one with a
   * fake success and creates nothing.
   */
  website: z.string().max(200).optional(),
});

/**
 * Editing a member from the Customers page.
 *
 * `status` is the account's own; the rest live on the `Contact` behind it and are written
 * through. A birthday matters beyond the profile: the birthday reminder matches on
 * `Contact.dob`, so a member enrolled at the counter without one can never be greeted
 * until it is filled in here.
 *
 * `null` clears a field, `undefined` leaves it alone — so a mistyped birthday can be
 * removed rather than only overwritten.
 */
const customerLoyaltyAccountUpdateSchema = z.object({
  status: z.enum(["active", "suspended", "closed", "inactive"]).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  /** A plain `YYYY-MM-DD` or the full timestamp older clients send. */
  dob: z.iso.datetime().or(z.iso.date()).nullable().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
});

const customerIdParamSchema = z.object({
  customerId: z.string(),
});

const contactIdParamSchema = z.object({
  contactId: z.string(),
});

const phoneNumberParamSchema = z.object({
  phoneNumber: z.string().min(1),
});

/** A scanned or typed card code; the handler normalises it, so anything short is accepted. */
const cardCodeParamSchema = z.object({
  cardCode: z.string().min(1).max(64),
});

const awardPointsSchema = z.object({
  contactId: z.string().min(1),
  purchaseAmount: z.number().min(0),
  locationId: z.string().optional(),
  productCategories: z.array(z.string()).optional(),
  productSkus: z.array(z.string()).optional(),
  paymentMethod: z.string().optional(),
  channel: z.string().optional(),
  orderId: z.string().optional(),
  notes: z.string().optional(),
});

const redeemRewardSchema = z.object({
  customerId: z.string().min(1),
  rewardId: z.string().min(1),
  locationId: z.string().optional(),
  orderId: z.string().optional(),
  notes: z.string().optional(),
});

const verifyRedemptionSchema = z.object({
  redemptionCode: z.string().min(1),
});

const applyRedemptionSchema = z.object({
  redemptionCode: z.string().min(1),
  /** Who marked it used. Optional: the controller fills it from the session. */
  appliedBy: z.string().min(1).optional(),
  notes: z.string().optional(),
});

const assignRewardSchema = z.object({
  customerId: z.string().min(1),
  rewardId: z.string().min(1),
  notes: z.string().optional(),
});

const shortCodeParamSchema = z.object({
  shortCode: z.string().min(1),
});

const searchQuerySchema = z.object({
  search: z.string().optional(),
  name: z.string().optional(),
});

/** `GET /accounts/contacts` — the org's contacts, for enrolling one from the counter. */
const contactSearchQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CustomerLoyaltyAccountInput = z.infer<typeof customerLoyaltyAccountSchema>;
export type CustomerLoyaltyAccountUpdateInput = z.infer<typeof customerLoyaltyAccountUpdateSchema>;
export type CustomerIdParam = z.infer<typeof customerIdParamSchema>;
export type ContactIdParam = z.infer<typeof contactIdParamSchema>;
export type PhoneNumberParam = z.infer<typeof phoneNumberParamSchema>;
export type CardCodeParam = z.infer<typeof cardCodeParamSchema>;
export type AwardPointsInput = z.infer<typeof awardPointsSchema>;
export type RedeemRewardInput = z.infer<typeof redeemRewardSchema>;
export type VerifyRedemptionInput = z.infer<typeof verifyRedemptionSchema>;
export type ApplyRedemptionInput = z.infer<typeof applyRedemptionSchema>;
export type AssignRewardInput = z.infer<typeof assignRewardSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type ContactSearchQueryInput = z.infer<typeof contactSearchQuerySchema>;

// Auto-exported after fastify-zod migration
export {
  customerLoyaltyAccountSchema,
  customerLoyaltyAccountUpdateSchema,
  customerIdParamSchema,
  contactIdParamSchema,
  phoneNumberParamSchema,
  cardCodeParamSchema,
  awardPointsSchema,
  redeemRewardSchema,
  verifyRedemptionSchema,
  applyRedemptionSchema,
  assignRewardSchema,
  shortCodeParamSchema,
  searchQuerySchema,
  contactSearchQuerySchema,
};
