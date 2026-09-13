import z from "zod";

import { memberRefSchema } from "./memberRef.js";

/**
 * The partner API's wire contract.
 *
 * Every one of these is attached to a route as a `response` schema, which matters for two
 * reasons. The generated reference becomes usable — previously not one loyalty route
 * declared a response, so the published docs said nothing about what came back. And,
 * because `fastify-type-provider-zod`'s serializer drops keys a schema does not mention,
 * these are a real boundary rather than documentation: the old handlers sent Prisma rows
 * back whole, so a partner asking for a customer list received `chatbotId`,
 * `lastReceivedMetadata`, `lifecycleId` and every other inbox internal hanging off Contact.
 *
 * Members are named by phone and card code here, never by id — see `memberRef.ts`.
 */

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const tierRefSchema = z
  .object({
    name: z.string(),
    color: z.string().nullable(),
  })
  .nullable();

export const memberSchema = z.object({
  name: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  /** The code printed on the member's card; what a scanner reads. */
  cardCode: z.string().nullable(),
  cardSentAt: z.string().nullable(),
  status: z.string(),
  referralCode: z.string().nullable(),
  points: z.object({ current: z.number(), lifetime: z.number() }),
  totalSpend: z.number(),
  tier: tierRefSchema,
  joinedAt: z.string(),
});

export const rewardSchema = z.object({
  /** Stable identifier. Configure a till against this, not a UUID. */
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  pointsCost: z.number(),
  rewardType: z.string(),
  rewardValue: z.unknown(),
  /** null = unlimited. */
  stockRemaining: z.number().nullable(),
  /** Tier *names*, not ids — an id here would be unusable to an external caller. */
  availableForTiers: z.array(z.string()),
});

export const tierSchema = z.object({
  name: z.string(),
  threshold: z.number(),
  pointsMultiplier: z.number(),
  color: z.string().nullable(),
  benefitsDescription: z.string().nullable(),
  priority: z.number(),
});

export const earningRuleSchema = z.object({
  name: z.string(),
  pointsPerUnit: z.number(),
  multiplier: z.number(),
  bonusPoints: z.number(),
  minPurchaseAmount: z.number().nullable(),
  maxPurchaseAmount: z.number().nullable(),
  validFrom: z.string().nullable(),
  validUntil: z.string().nullable(),
  isDefault: z.boolean(),
});

export const programSchema = z.object({
  name: z.string().nullable(),
  businessName: z.string().nullable(),
  status: z.string(),
  currency: z.object({ name: z.string(), symbol: z.string() }),
  defaultCountryCode: z.string(),
  signupBonus: z.number(),
  tiersEnabled: z.boolean(),
  tierQualificationWindowMonths: z.number().nullable(),
});

export const transactionSchema = z.object({
  transactionId: z.string(),
  type: z.string(),
  source: z.string(),
  points: z.number(),
  balanceAfter: z.number(),
  description: z.string().nullable(),
  purchaseAmount: z.number().nullable(),
  /** Echoed back so a caller can reconcile against its own order numbers. */
  orderId: z.string().nullable(),
  /** The probe field: search by this to find out whether a write you lost the reply to landed. */
  idempotencyKey: z.string().nullable(),
  createdAt: z.string(),
});

/** A voucher is either a coupon bought with points or a gift issued outright. */
export const voucherSchema = z.object({
  code: z.string(),
  kind: z.enum(["redemption", "issued_reward"]),
  status: z.string(),
  valid: z.boolean(),
  /** Why it cannot be handed over, when `valid` is false. */
  invalidReason: z.string().nullable(),
  reward: z.object({ code: z.string().nullable(), name: z.string(), rewardType: z.string() }),
  member: memberSchema.nullable(),
  expiresAt: z.string().nullable(),
  usedAt: z.string().nullable(),
  createdAt: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

/** Everything a till needs to serve someone, in one round trip. */
export const memberDetailSchema = z.object({
  member: memberSchema,
  /** Rewards this member can buy now: in stock, affordable, and allowed at their tier. */
  availableRewards: z.array(rewardSchema),
  /** Rewards staff may hand over without spending points. */
  issuableRewards: z.array(rewardSchema),
  /** Already paid for and waiting to be collected. */
  pendingVouchers: z.array(voucherSchema),
  awaitingApproval: z.array(voucherSchema),
  recentTransactions: z.array(transactionSchema),
  tier: z.object({
    current: tierRefSchema,
    next: z.object({ name: z.string(), threshold: z.number() }).nullable(),
    amountToNext: z.number().nullable(),
    /** The spend the ladder is judged on — lifetime, or the trailing window's. */
    qualifyingSpend: z.number(),
    qualificationWindowMonths: z.number().nullable(),
  }),
  program: z.object({
    currencySymbol: z.string(),
    pointsName: z.string(),
    signupBonus: z.number(),
  }),
});

export const memberListSchema = z.object({
  data: z.array(memberSchema),
  pagination: paginationSchema,
});

export const transactionListSchema = z.object({
  data: z.array(transactionSchema),
  pagination: paginationSchema,
});

export const preflightSchema = z.object({
  /** The org already has a contact on this number. */
  contactExists: z.boolean(),
  alreadyMember: z.boolean(),
  name: z.string().nullable(),
});

export const awardResultSchema = z.object({
  /** True when this call found an award an earlier identical one had already made. */
  replayed: z.boolean(),
  transactionId: z.string(),
  pointsAwarded: z.number(),
  balance: z.object({ current: z.number(), lifetime: z.number() }),
  rule: z.object({ name: z.string(), multiplier: z.number(), bonusPoints: z.number() }).nullable(),
  tier: z.object({
    current: tierRefSchema,
    /** Whether *this* call moved them. Always false on a replay. */
    upgraded: z.boolean(),
    next: z.object({ name: z.string(), threshold: z.number() }).nullable(),
    amountToNext: z.number().nullable(),
  }),
});

export const adjustResultSchema = z.object({
  status: z.enum(["applied", "pending_approval"]),
  approvalId: z.string(),
  transactionId: z.string().nullable(),
  balance: z.object({ current: z.number(), lifetime: z.number() }).nullable(),
});

export const cardSendResultSchema = z.object({
  sent: z.boolean(),
  /** `session_closed` is the ordinary one: WhatsApp only allows this inside a 24h window. */
  skippedReason: z.string().nullable(),
  cardCode: z.string().nullable(),
  cardSentAt: z.string().nullable(),
});

export const issueResultSchema = z.object({
  voucherCode: z.string(),
  kind: z.literal("issued_reward"),
  reward: z.object({ code: z.string().nullable(), name: z.string() }),
});

export const redeemResultSchema = z.object({
  voucherCode: z.string().nullable(),
  status: z.string(),
  pointsSpent: z.number(),
  balance: z.object({ current: z.number(), lifetime: z.number() }),
  expiresAt: z.string().nullable(),
});

export const voucherRedeemResultSchema = z.object({
  code: z.string(),
  kind: z.enum(["redemption", "issued_reward"]),
  status: z.literal("redeemed"),
  redeemedAt: z.string(),
  reward: z.object({ code: z.string().nullable(), name: z.string() }),
});

export const pingSchema = z.object({
  ok: z.boolean(),
  orgId: z.string(),
  programStatus: z.string(),
});

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

/**
 * Enrolment.
 *
 * Purpose-built rather than derived from the internal `customerLoyaltyAccountSchema`, which
 * carried two things that had no business on a partner API: `dob` arrived *required* (the
 * internal schema has it optional — the `.extend()` tightened it by accident), and the
 * public join form's `website` honeypot came along for the ride, so an anti-bot trap was
 * part of the published contract. `orgId` comes from the path and `source` is stamped
 * server-side; neither is a caller's to set.
 */
export const createMemberSchema = z.object({
  phone: z.string().trim().min(4).max(32),
  name: z.string().trim().min(1).max(120),
  email: z.email().max(200).optional(),
  dob: z.iso.date().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  /** Someone else's `referralCode`, to credit the referrer. */
  referralCode: z.string().trim().max(64).optional(),
});

export const updateMemberSchema = z.object({
  member: memberRefSchema,
  name: z.string().trim().min(1).max(120).optional(),
  email: z.email().max(200).optional(),
  dob: z.iso.date().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const awardPointsBodySchema = z.object({
  member: memberRefSchema,
  purchaseAmount: z.number().min(0),
  /** Your order number. Stored and searchable, and echoed on the transaction. */
  orderId: z.string().max(200).optional(),
  locationId: z.string().max(200).optional(),
  productCategories: z.array(z.string().max(100)).max(50).optional(),
  productSkus: z.array(z.string().max(100)).max(200).optional(),
  paymentMethod: z.string().max(50).optional(),
  channel: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Correcting a balance, including undoing an award — the only route to it, because points
 * are only ever moved through the approval system, which is what keeps the audit trail.
 * Negative `points` takes them away.
 */
export const adjustPointsBodySchema = z.object({
  member: memberRefSchema,
  points: z.int().refine((n) => n !== 0, { message: "points must not be zero" }),
  reason: z.string().trim().min(1).max(500),
});

export const memberListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const transactionQuerySchema = z.object({
  phone: z.string().trim().max(32).optional(),
  cardCode: z.string().trim().max(64).optional(),
  orderId: z.string().max(200).optional(),
  /** Search by the key you sent, to find out whether a write you lost the reply to landed. */
  idempotencyKey: z.string().max(200).optional(),
  type: z.enum(["earn", "redeem", "adjust", "expire", "refund"]).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const preflightQuerySchema = z.object({
  phone: z.string().trim().min(4).max(32),
});

export const rewardCodeParamSchema = z.object({
  rewardCode: z.string().trim().min(1).max(64),
});

export const voucherCodeParamSchema = z.object({
  /** A redemption code or a gift's short code — whichever the scanner read. */
  code: z.string().trim().min(1).max(64),
});

export const redeemRewardBodySchema = z.object({
  member: memberRefSchema,
  locationId: z.string().max(200).optional(),
  orderId: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export const issueRewardBodySchema = z.object({
  member: memberRefSchema,
  notes: z.string().max(500).optional(),
});

export const applyVoucherBodySchema = z.object({
  /** Who handed it over, for the audit trail. */
  appliedBy: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

export const sendCardBodySchema = z.object({ member: memberRefSchema });

/** Declared so the header shows up in the generated reference. */
export const idempotencyHeaderSchema = z.object({
  "idempotency-key": z.string().min(8).max(200),
});
