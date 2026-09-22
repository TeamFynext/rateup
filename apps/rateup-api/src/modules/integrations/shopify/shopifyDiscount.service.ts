import shopify from "./shopify.config.js";
import { getActiveShopifySession } from "./shopify.session.js";
import { getShopifyInfo } from "./shopify.service.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { LoyaltyPointRewardSubType, type LoyaltyRedemptionRules } from "../../../types/loyalty.js";

/**
 * Mirrors a loyalty redemption into the merchant's Shopify storefront as a discount code,
 * so the code we hand the customer over WhatsApp is the same code they type at checkout.
 *
 * The redemption code is the discount code — one row, one code, one Shopify discount. That
 * is what makes this safe to re-run: `discountCodeBasicCreate` rejects a code that already
 * exists in the shop, and we only ever call it for a redemption that has no discount id yet.
 *
 * Requires the `write_discounts` access scope. Shops that installed the app before this
 * feature existed granted no such scope, so their first sync fails with an access error and
 * the redemption still works as an ordinary cashier code — see `SyncOutcome.reason`.
 */

/** What the merchant configured on the reward, under `redemptionRules.shopify`. */
export interface ShopifyDiscountRules {
  enabled?: boolean;
  /** Days the code stays valid from issue. Omitted = no end date. */
  valid_for_days?: number | null;
  /** Let Shopify stack this on top of the shop's own discounts. All default to false. */
  combines_with?: {
    order_discounts?: boolean;
    product_discounts?: boolean;
    shipping_discounts?: boolean;
  };
}

export type ShopifySyncStatus = "created" | "skipped" | "failed";

export interface ShopifySyncOutcome {
  status: ShopifySyncStatus;
  /** gid://shopify/DiscountCodeNode/… */
  discountId?: string;
  /** Share link: opening it applies the code to the cart, so the customer never types it. */
  discountUrl?: string;
  reason?: string;
}

/** Shopify's `DiscountPercentage.percentage` is a fraction, not a number out of 100. */
const asShopifyPercentage = (percentage: number) => Math.min(Math.max(percentage, 0), 100) / 100;

const asShopifyDecimal = (amount: number) => amount.toFixed(2);

interface BasicCodeDiscountInput {
  title: string;
  code: string;
  startsAt: string;
  endsAt?: string;
  context: { all: "ALL" };
  customerGets: { value: Record<string, unknown>; items: { all: boolean } };
  minimumRequirement?: { subtotal: { greaterThanOrEqualToSubtotal: string } };
  appliesOncePerCustomer: boolean;
  usageLimit: number;
  combinesWith: {
    orderDiscounts: boolean;
    productDiscounts: boolean;
    shippingDiscounts: boolean;
  };
}

/**
 * Turns a reward's value into the `customerGets.value` Shopify understands.
 *
 * `LoyaltyReward.rewardValue` is an untyped JSON blob and three vocabularies are live on
 * real rows — the same split `giveback.ts`'s `rewardWorth` documents and handles:
 *
 *   dialect A  `{ type: "discount_fixed" | "discount_percentage", amount | percentage }`
 *              — the presets, the onboarding wizard, `reward.schema.ts`
 *   dialect B  `{ rewardType: "fixed-discount" | "percentage-discount", cashbackAmount |
 *              discountPercentage }` — the standalone editor at /dashboard/loyalty/rewards
 *   coupons    `{ discountType: "fixed" | "percentage", discountValue }` — the coupon tab
 *
 * Reading only dialect A would mean every reward built in the rewards dashboard — most of
 * them — silently failed to sync with "not expressible as a discount".
 *
 * A free item is genuinely not expressible: "one free X" needs a BXGY discount, whose input
 * names the product by its Shopify id, which a loyalty reward does not carry. Returning null
 * keeps such a reward a cashier-redeemed code rather than silently turning it into money off
 * the whole order.
 */
export function buildDiscountValue(rewardValue: unknown): Record<string, unknown> | null {
  if (!rewardValue || typeof rewardValue !== "object" || Array.isArray(rewardValue)) return null;
  const v = rewardValue as Record<string, unknown>;

  const num = (raw: unknown): number | null => {
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const fixed = (amount: number | null) =>
    amount === null
      ? null
      : { discountAmount: { amount: asShopifyDecimal(amount), appliesOnEachItem: false } };

  // `max_discount_amount` is deliberately dropped: a basic code discount has no cap field,
  // and a capped percentage can only be modelled as a Shopify Function. Capped rewards sync
  // uncapped rather than not at all — `syncRedemptionToShopify` logs when that happens.
  const percentage = (pct: number | null) =>
    pct === null ? null : { percentage: asShopifyPercentage(pct) };

  // ── dialect A
  if (v.type === LoyaltyPointRewardSubType.DISCOUNT_FIXED) return fixed(num(v.amount));
  if (v.type === LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE) {
    return percentage(num(v.percentage));
  }
  if (v.type === LoyaltyPointRewardSubType.FREE_ITEM) return null;

  // ── dialect B
  if (v.rewardType === "fixed-discount") return fixed(num(v.cashbackAmount));
  if (v.rewardType === "percentage-discount") return percentage(num(v.discountPercentage));
  if (v.rewardType === "free-item" || v.rewardType === "free-service") return null;

  // ── coupon tab
  if (v.discountType === "fixed") return fixed(num(v.discountValue));
  if (v.discountType === "percentage") return percentage(num(v.discountValue));

  return null;
}

/** True when the reward's percentage carries a cap Shopify's basic discount cannot express. */
export function hasUnsupportedCap(rewardValue: unknown): boolean {
  if (!rewardValue || typeof rewardValue !== "object") return false;
  const cap = (rewardValue as Record<string, unknown>).max_discount_amount;
  return cap !== undefined && cap !== null && Number(cap) > 0;
}

/**
 * When the code is live, reconciled from every deadline the reward carries.
 *
 * Three can each close the window and the earliest one wins:
 *
 *   `time_restrictions.valid_until` — the offer's own end date (the coupon form's "Valid To").
 *                                     A code outliving the promotion it belongs to is a code
 *                                     the merchant thought they had switched off.
 *   `shopify.valid_for_days`        — per code, counted from the moment this customer redeemed.
 *   `redemption.expiresAt`          — this one code's expiry, when a caller sets one.
 *
 * `startsAt` is the later of the redemption and `valid_from`: a code handed out before the
 * promotion opens must not work early, and Shopify will not accept one with no start at all.
 *
 * Returns null when the window is already shut — Shopify rejects `endsAt <= startsAt`, and a
 * code that could never be used is not worth creating.
 */
export function discountWindow(params: {
  rules: LoyaltyRedemptionRules & { shopify?: ShopifyDiscountRules };
  issuedAt: Date;
  expiresAt: Date | null;
}): { startsAt: Date; endsAt: Date | null } | null {
  const date = (raw: string | null | undefined): Date | null => {
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const time = params.rules?.time_restrictions;
  const validFrom = date(time?.valid_from);
  const startsAt =
    validFrom && validFrom.getTime() > params.issuedAt.getTime() ? validFrom : params.issuedAt;

  const validForDays = params.rules?.shopify?.valid_for_days;
  const deadlines = [
    params.expiresAt,
    date(time?.valid_until),
    validForDays ? new Date(params.issuedAt.getTime() + validForDays * 86_400_000) : null,
  ].filter((d): d is Date => d !== null);

  const endsAt = deadlines.length ? new Date(Math.min(...deadlines.map((d) => d.getTime()))) : null;

  if (endsAt && endsAt.getTime() <= startsAt.getTime()) return null;
  return { startsAt, endsAt };
}

/**
 * Note what is deliberately *not* sent to Shopify:
 *
 *   stock (`stockQuantity`)                  — how many codes the programme will ever issue
 *   per-customer limit (`quantity_restrictions`) — how many times a customer may redeem the reward
 *
 * Both govern issuing, which happens here, not redeeming, which happens in the shop. Each
 * issued code is its own discount with `usageLimit: 1`, so turning a per-customer limit of 3
 * into a Shopify usage limit of 3 would let one customer use one code three times — the
 * opposite of the rule. They stay enforced by `redemptionValidator` and `burnStock`.
 */
export function buildBasicCodeDiscountInput(params: {
  code: string;
  rewardName: string;
  value: unknown;
  rules: LoyaltyRedemptionRules & { shopify?: ShopifyDiscountRules };
  issuedAt: Date;
  expiresAt: Date | null;
}): BasicCodeDiscountInput | null {
  const discountValue = buildDiscountValue(params.value);
  if (!discountValue) return null;

  const window = discountWindow(params);
  if (!window) return null;

  const minimumSpend = params.rules?.spend_requirements?.minimum_spend;

  return {
    title: `Loyalty reward: ${params.rewardName} (${params.code})`,
    code: params.code,
    startsAt: window.startsAt.toISOString(),
    ...(window.endsAt ? { endsAt: window.endsAt.toISOString() } : {}),
    // `customerSelection` was removed from DiscountCodeBasicInput; `context` replaces it.
    context: { all: "ALL" },
    customerGets: { value: discountValue, items: { all: true } },
    ...(minimumSpend && minimumSpend > 0
      ? {
          minimumRequirement: {
            subtotal: { greaterThanOrEqualToSubtotal: asShopifyDecimal(minimumSpend) },
          },
        }
      : {}),
    // One redemption, one use. Without both of these the code is a public coupon the moment
    // one customer forwards the WhatsApp message.
    appliesOncePerCustomer: true,
    usageLimit: 1,
    combinesWith: {
      orderDiscounts: shopifyRules(params.rules).combines_with?.order_discounts ?? false,
      productDiscounts: shopifyRules(params.rules).combines_with?.product_discounts ?? false,
      shippingDiscounts: shopifyRules(params.rules).combines_with?.shipping_discounts ?? false,
    },
  };
}

const shopifyRules = (rules: LoyaltyRedemptionRules & { shopify?: ShopifyDiscountRules }) =>
  rules?.shopify ?? {};

/** The link that applies the code for the customer instead of making them type it. */
export const discountShareUrl = (shop: string, code: string) =>
  `https://${shop}/discount/${encodeURIComponent(code)}`;

interface DiscountCodeBasicCreateData {
  discountCodeBasicCreate: {
    codeDiscountNode: { id: string } | null;
    userErrors: { field: string[] | null; message: string }[];
  } | null;
}

const CREATE_MUTATION = `mutation CreateLoyaltyDiscount($basicCodeDiscount: DiscountCodeBasicInput!) {
  discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
    codeDiscountNode { id }
    userErrors { field message }
  }
}`;

const DEACTIVATE_MUTATION = `mutation DeactivateLoyaltyDiscount($id: ID!) {
  discountCodeDeactivate(id: $id) {
    userErrors { field message }
  }
}`;

/**
 * Create the Shopify discount for one redemption and record it on the row.
 *
 * Never throws: a shop that has not granted `write_discounts`, or has hit its discount
 * limit, must not fail the redemption the customer already paid points for. The failure is
 * stored on the redemption so the dashboard can say why the code is cashier-only.
 */
export async function syncRedemptionToShopify(redemptionId: string): Promise<ShopifySyncOutcome> {
  const redemption = await prisma.loyaltyRedemption.findUnique({
    where: { id: redemptionId },
    include: { reward: true, account: { include: { contact: { select: { orgId: true } } } } },
  });

  if (!redemption) return { status: "skipped", reason: "redemption_not_found" };
  if (redemption.shopifyDiscountId) {
    return {
      status: "skipped",
      reason: "already_synced",
      discountId: redemption.shopifyDiscountId,
      discountUrl: redemption.shopifyDiscountUrl ?? undefined,
    };
  }

  const rules = (redemption.reward.redemptionRules ?? {}) as LoyaltyRedemptionRules & {
    shopify?: ShopifyDiscountRules;
  };
  if (!rules.shopify?.enabled) return { status: "skipped", reason: "not_enabled" };

  const orgId = redemption.account.contact?.orgId;
  if (!orgId) return { status: "skipped", reason: "no_org" };

  const input = buildBasicCodeDiscountInput({
    code: redemption.redemptionCode,
    rewardName: redemption.reward.name,
    value: redemption.reward.rewardValue,
    rules,
    issuedAt: redemption.createdAt,
    expiresAt: redemption.expiresAt,
  });

  if (!input) {
    // Two different refusals, and telling them apart is the whole point of recording one: a
    // reward that can never sync, versus one whose promotion has already ended.
    return await record(redemptionId, {
      status: "skipped",
      reason: buildDiscountValue(redemption.reward.rewardValue)
        ? "discount_window_already_closed"
        : "reward_value_not_expressible_as_discount",
    });
  }

  if (hasUnsupportedCap(redemption.reward.rewardValue)) {
    log.warn(
      { redemptionId, orgId, rewardId: redemption.rewardId },
      "Shopify discount synced without its max_discount_amount cap — basic code discounts have no cap field",
    );
  }

  if (!shopify) return { status: "skipped", reason: "shopify_not_configured" };

  const integration = await getShopifyInfo(orgId);
  if (!integration?.credential?.session?.shop) {
    return { status: "skipped", reason: "shop_not_connected" };
  }
  const session = await getActiveShopifySession(integration);

  try {
    const client = new shopify.clients.Graphql({ session });
    const response = await client.request<DiscountCodeBasicCreateData>(CREATE_MUTATION, {
      variables: { basicCodeDiscount: input },
    });

    const result = response.data?.discountCodeBasicCreate;
    const userErrors = result?.userErrors ?? [];
    if (userErrors.length > 0 || !result?.codeDiscountNode?.id) {
      const reason =
        userErrors.map((e) => `${(e.field ?? []).join(".")}: ${e.message}`).join("; ") ||
        "no_discount_returned";
      log.warn({ redemptionId, orgId, shop: session.shop, reason }, "Shopify discount sync failed");
      return await record(redemptionId, { status: "failed", reason });
    }

    const outcome: ShopifySyncOutcome = {
      status: "created",
      discountId: result.codeDiscountNode.id,
      discountUrl: discountShareUrl(session.shop, redemption.redemptionCode),
    };
    log.info(
      { redemptionId, orgId, shop: session.shop, discountId: outcome.discountId },
      "Shopify discount created for loyalty redemption",
    );
    return await record(redemptionId, outcome);
  } catch (error) {
    // Most commonly a 403 from a shop whose token predates the `write_discounts` scope.
    log.error({ err: error, redemptionId, orgId }, "Shopify discount sync threw");
    return await record(redemptionId, {
      status: "failed",
      reason: error instanceof Error ? error.message.slice(0, 500) : "unknown_error",
    });
  }
}

/**
 * Turn the code off in the shop — for a redemption that was cancelled or expired before it
 * was ever used. Shopify keeps the row so the merchant can still see it in Discounts.
 */
export async function deactivateRedemptionDiscount(redemptionId: string): Promise<boolean> {
  const redemption = await prisma.loyaltyRedemption.findUnique({
    where: { id: redemptionId },
    select: {
      shopifyDiscountId: true,
      account: { select: { contact: { select: { orgId: true } } } },
    },
  });

  const discountId = redemption?.shopifyDiscountId;
  const orgId = redemption?.account.contact?.orgId;
  if (!discountId || !orgId || !shopify) return false;

  try {
    const integration = await getShopifyInfo(orgId);
    if (!integration?.credential?.session?.shop) return false;
    const session = await getActiveShopifySession(integration);

    const client = new shopify.clients.Graphql({ session });
    await client.request(DEACTIVATE_MUTATION, { variables: { id: discountId } });
    return true;
  } catch (error) {
    log.error({ err: error, redemptionId, discountId }, "Shopify discount deactivate failed");
    return false;
  }
}

async function record(
  redemptionId: string,
  outcome: ShopifySyncOutcome,
): Promise<ShopifySyncOutcome> {
  await prisma.loyaltyRedemption.update({
    where: { id: redemptionId },
    data: {
      shopifyDiscountId: outcome.discountId ?? null,
      shopifyDiscountUrl: outcome.discountUrl ?? null,
      shopifyDiscountError: outcome.status === "created" ? null : (outcome.reason ?? null),
      shopifySyncedAt: new Date(),
    },
  });
  return outcome;
}
