/**
 * The loyalty shapes as the API actually returns them.
 *
 * These mirror `rateup-ui/src/backend/loyalty/*`, which in turn mirrors the handlers in
 * `rateup-api/src/modules/loyalty/`. The two clients share no code, so a column added on
 * the server has to be added in both places — keeping the field order and the comments
 * aligned with the web file is what makes that a diff rather than an archaeology exercise.
 *
 * Where a field is nullable here it is nullable on the wire. The previous version of this
 * file typed several of them as non-null (`currentTier`, `email`, `description`), which
 * type-checked and then read `.name` off `null` at the counter.
 */

/* ── rewards ────────────────────────────────────────────────────────────────── */

export type LoyaltyRewardStatus = "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK" | "EXPIRED";

export type LoyaltyRewardType = "point" | "coupon" | "assigned" | "review";

/** The reward's payload; which fields are set depends on `rewardType`. */
export interface LoyaltyRewardValue {
  points?: number;
  code?: string | null;
  description?: string | null;
  cashbackAmount?: number;
  discountPercentage?: number;
  estimatedValue?: number;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  termsAndConditions?: string;
  restrictions?: string;
  maxAmount?: number | null;
  percentage?: number;
  amount?: number;
  itemId?: string;
}

/** A reward from the catalogue (`GET /loyalty/rewards`). */
export interface LoyaltyReward {
  id: string;
  programId: string;
  name: string;
  description?: string | null;
  rewardType: LoyaltyRewardType;
  pointsCost: number;
  rewardValue: LoyaltyRewardValue;
  status: LoyaltyRewardStatus;
  stockQuantity?: number | null;
  stockRedeemed: number;
  waTemplateId?: string | null;
  availableForTiers: string[];
  createdAt: string;
  updatedAt: string;
}

/** A reward as the phone lookup embeds it — the same row, fewer relations. */
export interface CustomerReward {
  id: string;
  programId: string;
  name: string;
  description: string | null;
  status: LoyaltyRewardStatus;
  pointsCost: number;
  rewardType: "assigned" | "coupon" | "point";
  rewardValue: LoyaltyRewardValue;
  stockQuantity: number | null;
  stockRedeemed: number;
  redemptionRules: Record<string, unknown>;
  availableForTiers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CashierRewardSummary {
  id: string;
  name: string;
  pointsCost: number;
  rewardType: string;
}

/* ── redemptions ────────────────────────────────────────────────────────────── */

/** `RedemptionStatus` is a Prisma enum — uppercase on the wire. */
export type RedemptionStatus =
  | "PENDING"
  | "APPROVED"
  | "USED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export interface CustomerRedemption {
  id: string;
  accountId: string;
  rewardId: string;
  redemptionCode: string;
  status: RedemptionStatus;
  usedAt: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  reward: {
    id: string;
    name: string;
    description?: string | null;
    rewardType: "point" | "coupon" | "assigned";
    pointsCost: number;
    rewardValue: LoyaltyRewardValue;
  };
}

/**
 * Something the counter still has to hand over. Two kinds because two tables hold them:
 * an approved redemption is used with its code (`POST /redemptions/apply`); an issued gift
 * with its short code (`POST /accounts/rewards/:shortCode/redeem`).
 */
export type PendingRedemption =
  | {
      kind: "redemption";
      id: string;
      code: string;
      status: "APPROVED";
      createdAt: string;
      expiresAt: string | null;
      reward: CashierRewardSummary | null;
    }
  | {
      kind: "assigned";
      id: string;
      code: string;
      status: "ISSUED";
      createdAt: string;
      expiresAt: null;
      reward: CashierRewardSummary | null;
    };

export interface RedeemRewardResponse {
  message?: string;
  redemptionCode?: string;
  redemption?: { id: string; status?: string };
}

export interface ShortCodeRedeemResponse {
  id: string;
  shortCode?: string;
  status?: string;
}

/** What a code turns out to be, before it is marked used. */
export interface VerifyRedemptionResponse {
  valid: boolean;
  redemption: {
    id: string;
    redemptionCode: string;
    status: string;
    usedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
  } | null;
  account?: { id: string; contact?: { name: string | null; phone: string } | null } | null;
  reward?: { id: string; name: string; pointsCost: number; rewardType: string } | null;
  message?: string;
}

/* ── the customer, as the counter reads them ────────────────────────────────── */

export interface CashierRecentTransaction {
  id: string;
  transactionType: string;
  source: string;
  points: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
  purchaseAmount: number | null;
}

export interface CashierTierSummary {
  id: string;
  name: string;
  threshold: number;
  pointsMultiplier: number;
  color: string | null;
}

/** Mirrors `getCustomerAccountByPhoneHandler` in rateup-api. */
export interface CustomerRewardsResponse {
  customer: {
    id: string;
    contactId: string;
    currentPoints: number;
    lifetimePoints: number;
    totalSpend: number;
    referralCode: string;
    currentTier: {
      id: string;
      name: string;
      threshold?: string | number;
      pointsMultiplier?: string | number;
      color?: string;
    } | null;
    name: string;
    phone: string;
    email: string | null;
    points: number;
    status: string;
    createdAt: string;
    /** The code their QR card carries; null for a member who has never been sent one. */
    cardCode: string | null;
    /** When WhatsApp last accepted their card image; null if never. */
    cardSentAt: string | null;
  };
  availableRewards: CustomerReward[];
  issuableRewards: CustomerReward[];
  activeCoupons: Array<Record<string, unknown>>;
  redeemedRewards: CustomerRedemption[];
  pendingRedemptions: PendingRedemption[];
  awaitingApproval: Array<{
    id: string;
    code: string;
    createdAt: string;
    reward: CashierRewardSummary | null;
  }>;
  recentTransactions: CashierRecentTransaction[];
  tier: {
    current: CashierTierSummary | null;
    next: { id: string; name: string; threshold: number } | null;
    amountToNext: number | null;
  };
  program: { currencySymbol: string; pointsName: string; signupBonus: number };
}

/** One row of `GET /accounts?search=` — the account with its contact. */
export interface CustomerSearchResult {
  id: string;
  contactId: string;
  currentPoints: number;
  lifetimePoints: number;
  referralCode?: string;
  status?: string;
  currentTier: { id: string; name: string; color?: string } | null;
  contact: { id: string; name: string | null; phone: string; email?: string | null };
}

/* ── enrolment ──────────────────────────────────────────────────────────────── */

/** Prisma's `Gender` enum, as the API takes and returns it. */
export type LoyaltyGender = "MALE" | "FEMALE" | "OTHER";
export const LOYALTY_GENDERS: readonly LoyaltyGender[] = ["MALE", "FEMALE", "OTHER"];

/** What the org already knows about a phone number, for the add-customer form. */
export interface ContactLookupResult {
  contact: {
    id: string;
    name: string | null;
    email: string | null;
    dob: string | null;
    gender: LoyaltyGender | null;
  } | null;
  /** True only for an *active* member — an inactive account is reactivated on submit. */
  alreadyMember: boolean;
}

/** One of the org's contacts, as a candidate for enrolment from the counter. */
export interface EnrolmentContact {
  id: string;
  name: string | null;
  /** Never null: the endpoint only returns contacts that have a number. */
  phone: string;
  email: string | null;
  dob: string | null;
  gender: LoyaltyGender | null;
  /** `null` when they have never joined; otherwise the account's status (`active`, `inactive`, …). */
  memberStatus: string | null;
}

export interface CreateLoyaltyCustomerInput {
  name: string;
  phone: string;
  /**
   * Required by the endpoint's body schema even though the handler ignores it and takes the
   * org from the session — omit it and the request is refused at validation with a 400
   * before any handler runs. It comes from `useAuth()`.
   */
  orgId: string;
  email?: string | null;
  /** A `YYYY-MM-DD` string is accepted as-is. */
  dob?: string | null;
  gender?: LoyaltyGender | null;
  referCode?: string;
}

export interface CreateLoyaltyCustomerResponse {
  id?: string;
  contactId?: string;
  currentPoints?: number;
  referralCode?: string;
}

/* ── the programme ──────────────────────────────────────────────────────────── */

/**
 * The programme, narrowed to what the counter reads. The web type carries the whole record
 * (referral copy, expiry policy, the onboarding state); none of that is on this screen, and
 * a narrower type is one fewer thing to keep in step.
 */
export interface LoyaltyProgram {
  id: string;
  name: string;
  status: string;
  pointsName: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  defaultCountryCode?: string | null;
  averageOrderValue?: number | null;
  signupBonus: number;
  tiersEnabled: boolean;
  whatsappNotifications?: boolean;
  pointsActivityAlerts?: boolean;
  whatsappSettingsId?: string | null;
}

export interface LoyaltyTier {
  id: string;
  programId: string;
  name: string;
  threshold: number;
  /** A Prisma `Decimal` — a string on the wire. */
  pointsMultiplier: string | number;
  color: string;
  benefitsDescription?: string | null;
  priority: number;
  createdAt: string;
}

/* ── messages ───────────────────────────────────────────────────────────────── */

/** Every loyalty message the programme can send. Mirrors `LoyaltyEventType` in rateup-api. */
export enum LoyaltyEventType {
  POINTS_ISSUED = "POINTS_ISSUED",
  POINTS_ADJUSTED = "POINTS_ADJUSTED",
  REWARD_ISSUED = "REWARD_ISSUED",
  REWARD_REDEEMED = "REWARD_REDEEMED",
  TIER_UPGRADED = "TIER_UPGRADED",
  BIRTHDAY = "BIRTHDAY",
  INACTIVITY_REMINDER = "INACTIVITY_REMINDER",
  POINTS_EXPIRY_ALERT = "POINTS_EXPIRY_ALERT",
  POINTS_EXPIRED = "POINTS_EXPIRED",
  TIER_AT_RISK = "TIER_AT_RISK",
  REWARD_EXPIRING = "REWARD_EXPIRING",
  SIGNUP_ANNIVERSARY = "SIGNUP_ANNIVERSARY",
}

/** Which message an event sends, and whether it is switched on. */
export interface EventTrigger {
  id: string;
  programId: string;
  eventType: LoyaltyEventType;
  enabled: boolean;
  /** For INACTIVITY_REMINDER. */
  triggerDays?: number;
  /** Days ahead of a dated occasion to send — set on the web Reminders page. */
  leadDays?: number | null;
  /** Local hour to send at, in the programme's own timezone. */
  sendHour?: number | null;
  waTemplateId?: string;
  whatsappSettingsId?: string;
  rewardId?: string;
}

/**
 * What the dispatcher did with the WhatsApp message, so a receipt can show it.
 *
 * Only `award-points` reports this. The other writes do not, which is why the receipt's
 * WhatsApp block falls back to deriving the outcome from the trigger and template.
 */
export interface LoyaltyNotificationOutcome {
  sent: boolean;
  channel: "whatsapp" | null;
  /** The Meta template, or — inside an open 24-hour chat — the same words as plain text. */
  mode: "template" | "text" | null;
  templateId: string | null;
  text: string | null;
  skippedReason:
    | "no_program"
    | "program_inactive"
    | "whatsapp_disabled"
    | "points_alerts_disabled"
    | "no_phone"
    | "no_template"
    | "template_not_approved"
    | "send_failed"
    | null;
}

/* ── earning ────────────────────────────────────────────────────────────────── */

export interface TimeRange {
  /** `HH:mm`, e.g. "09:00". */
  start: string;
  end: string;
}

/**
 * An earning rule. Every field is optional because the rule editor writes them piecemeal;
 * the estimator in `points-estimate.ts` treats an absent field as "no restriction".
 *
 * The estimator deliberately does not model `conditions`, `maxUsesPerCustomer` or
 * `maxTotalUses` — see that file's note on why its number can legitimately differ from the
 * server's.
 */
export interface LoyaltyEarningRule {
  id?: string;
  name: string;
  description?: string | null;
  priority?: number;
  status?: "active" | "inactive" | "scheduled" | "expired";
  pointsPerUnit?: number;
  multiplier?: number;
  bonusPoints?: number;
  minPurchaseAmount?: number | null;
  maxPurchaseAmount?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  allowedDays?: string[];
  allowedTimeRanges?: TimeRange[];
  applicableToTiers?: string[];
  maxUsesPerCustomer?: number | null;
  maxTotalUses?: number | null;
  isDefault?: boolean;
  maxPointsPerTransaction?: number | null;
}

/* ── the writes ─────────────────────────────────────────────────────────────── */

export interface AwardPointsInput {
  contactId: string;
  purchaseAmount: number;
  locationId?: string;
  productCategories?: string[];
  productSkus?: string[];
  paymentMethod?: string;
  channel?: string;
  /**
   * A client-generated reference. The server stores it in the ledger row's `metadata`, so
   * it is the one field that lets the offline queue ask "did this one already land?".
   */
  orderId?: string;
  notes?: string;
}

export interface AwardPointsTierSummary {
  id: string;
  name: string;
  threshold: number;
  pointsMultiplier: number;
  color: string | null;
}

/** Mirrors `awardPoints` in rateup-api — everything a counter receipt reads. */
export interface AwardPointsResponse {
  customer: {
    id: string;
    currentPoints: number;
    lifetimePoints: number;
    totalSpend: number | string;
  };
  transaction: { id: string; points: number; balanceAfter: number; createdAt: string };
  pointsAwarded: number;
  rule: { id: string; name: string; multiplier: number; bonusPoints: number } | null;
  tier: {
    current: AwardPointsTierSummary | null;
    previous: string | null;
    upgraded: boolean;
    next: AwardPointsTierSummary | null;
    amountToNext: number | null;
  };
  notification: LoyaltyNotificationOutcome;
  tierNotification: LoyaltyNotificationOutcome | null;
}

export interface AssignRewardRequest {
  rewardId: string;
  notes?: string;
  customerId: string;
}

export interface AssignRewardResponse {
  success: boolean;
  message: string;
  /** The `CustomerReward` row the API minted — `shortCode` is what staff read out to use it. */
  data?: {
    id: string;
    customerId?: string;
    accountId?: string;
    rewardId: string;
    shortCode?: string;
    status?: string;
    assignedAt: string;
    notes?: string;
    reward?: { id: string; name: string; pointsCost: number; rewardType: string };
  };
}

export interface RedeemRewardInput {
  customerId: string;
  rewardId: string;
  locationId?: string;
  orderId?: string;
  notes?: string;
}

export type ApprovalRequestType =
  | "REWARD_REDEMPTION"
  | "POINTS_ADJUSTMENT"
  | "TIER_OVERRIDE"
  | "ACCOUNT_SUSPENSION"
  | "ACCOUNT_REACTIVATION"
  | "BULK_OPERATION";

/**
 * An adjustment for someone to approve. The counter files one to undo a purchase — there is
 * no endpoint that reverses an award, so the correction goes through the approvals queue.
 */
export interface CreateApprovalRequestInput {
  requestType: ApprovalRequestType;
  accountId: string;
  points?: number | null;
  reason: string;
  requestData?: Record<string, unknown>;
  requestedByType?: "CUSTOMER" | "STAFF" | "SYSTEM";
  requestedByName?: string | null;
  transactionId?: string | null;
}

/** `POST /accounts/:customerId/card/send` — whether the card image went out, and if not why. */
export interface MemberCardSendResult {
  sent: boolean;
  skippedReason: "not_active" | "session_closed" | "no_public_url" | "send_failed" | null;
  cardCode: string | null;
  cardSentAt: string | null;
}
