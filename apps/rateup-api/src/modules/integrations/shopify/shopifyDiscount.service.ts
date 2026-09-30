import shopify from "./shopify.config.js";
import { getActiveShopifySession } from "./shopify.session.js";
import { getShopifyInfo } from "./shopify.service.js";
import { log } from "../../../utils/logger.js";
import type { LoyaltyRedemptionRules } from "../../../types/loyalty.js";
import type {
  CommerceDiscountInput,
  CommerceDiscountOutcome,
  CommerceDiscountRules,
  CommerceDiscountValue,
} from "../commerce/commerce.types.js";
import {
  buildCommerceDiscountInput,
  discountWindow as commerceDiscountWindow,
  hasUnsupportedCap as commerceHasUnsupportedCap,
  parseRewardDiscount,
} from "../commerce/discountRules.js";

/**
 * Shopify's half of loyalty discount codes: the Admin API calls and their input
 * format. What a reward means as a discount, and when its code is live, is the
 * commerce layer's (`commerce/discountRules.ts`); the sync that records the
 * outcome on the redemption is `commerce/discounts.ts`.
 *
 * Requires the `write_discounts` access scope. Shops that installed the app before this
 * feature existed granted no such scope, so their first sync fails with an access error and
 * the redemption still works as an ordinary cashier code.
 */

/** What the merchant configured on the reward, under `redemptionRules.shopify`. */
export type ShopifyDiscountRules = CommerceDiscountRules;

export type ShopifySyncStatus = CommerceDiscountOutcome["status"];

export type ShopifySyncOutcome = CommerceDiscountOutcome;

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
 * A discount value in the form Shopify's `customerGets.value` takes: a fixed
 * amount applies to the order, not each item; a percentage is a fraction.
 *
 * `max_discount_amount` is dropped: a basic code discount has no cap field. Capped
 * rewards sync uncapped rather than not at all, and the sync logs when that happens.
 */
export function toShopifyDiscountValue(value: CommerceDiscountValue): Record<string, unknown> {
  return value.kind === "fixed"
    ? { discountAmount: { amount: asShopifyDecimal(value.amount), appliesOnEachItem: false } }
    : { percentage: asShopifyPercentage(value.percentage) };
}

/** A reward's value as Shopify's `customerGets.value`, or null when it has none. */
export function buildDiscountValue(rewardValue: unknown): Record<string, unknown> | null {
  const value = parseRewardDiscount(rewardValue);
  return value ? toShopifyDiscountValue(value) : null;
}

export const hasUnsupportedCap = commerceHasUnsupportedCap;

/** The code's live window, with Shopify's `valid_for_days`; see `commerce/discountRules.ts`. */
export function discountWindow(params: {
  rules: LoyaltyRedemptionRules & { shopify?: ShopifyDiscountRules };
  issuedAt: Date;
  expiresAt: Date | null;
}): { startsAt: Date; endsAt: Date | null } | null {
  return commerceDiscountWindow({ ...params, validForDays: params.rules?.shopify?.valid_for_days });
}

/** The store-neutral input in the form `discountCodeBasicCreate` takes. */
export function toShopifyDiscountInput(input: CommerceDiscountInput): BasicCodeDiscountInput {
  return {
    title: input.title,
    code: input.code,
    startsAt: input.startsAt.toISOString(),
    ...(input.endsAt ? { endsAt: input.endsAt.toISOString() } : {}),
    // `customerSelection` was removed from DiscountCodeBasicInput; `context` replaces it.
    context: { all: "ALL" },
    customerGets: { value: toShopifyDiscountValue(input.value), items: { all: true } },
    ...(input.minimumSpend
      ? {
          minimumRequirement: {
            subtotal: { greaterThanOrEqualToSubtotal: asShopifyDecimal(input.minimumSpend) },
          },
        }
      : {}),
    // One redemption, one use. Without both of these the code is a public coupon the moment
    // one customer forwards the WhatsApp message.
    appliesOncePerCustomer: true,
    usageLimit: 1,
    combinesWith: {
      orderDiscounts: input.combinesWith.order,
      productDiscounts: input.combinesWith.product,
      shippingDiscounts: input.combinesWith.shipping,
    },
  };
}

/**
 * The Shopify input for one redemption's code, or null when there is nothing to create.
 *
 * Stock and per-customer limits are deliberately not sent: both govern issuing, which
 * happens in RateUp, and each issued code is its own discount with `usageLimit: 1`. Turning
 * a per-customer limit of 3 into a Shopify usage limit of 3 would let one customer use one
 * code three times — the opposite of the rule.
 */
export function buildBasicCodeDiscountInput(params: {
  code: string;
  rewardName: string;
  value: unknown;
  rules: LoyaltyRedemptionRules & { shopify?: ShopifyDiscountRules };
  issuedAt: Date;
  expiresAt: Date | null;
}): BasicCodeDiscountInput | null {
  const input = buildCommerceDiscountInput({ ...params, storeRules: params.rules?.shopify });
  return input ? toShopifyDiscountInput(input) : null;
}

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
 * Creates the code in the merchant's shop. Never throws: a shop that has not granted
 * `write_discounts`, or has hit its discount limit, must not fail the redemption the
 * customer already paid points for. `skipped` means the shop was never reached.
 */
export async function createShopifyDiscountCode(
  orgId: string,
  input: CommerceDiscountInput,
): Promise<ShopifySyncOutcome> {
  if (!shopify) return { status: "skipped", reason: "shopify_not_configured" };

  const integration = await getShopifyInfo(orgId);
  if (!integration?.credential?.session?.shop) {
    return { status: "skipped", reason: "shop_not_connected" };
  }
  const session = await getActiveShopifySession(integration);

  try {
    const client = new shopify.clients.Graphql({ session });
    const response = await client.request<DiscountCodeBasicCreateData>(CREATE_MUTATION, {
      variables: { basicCodeDiscount: toShopifyDiscountInput(input) },
    });

    const result = response.data?.discountCodeBasicCreate;
    const userErrors = result?.userErrors ?? [];
    if (userErrors.length > 0 || !result?.codeDiscountNode?.id) {
      const reason =
        userErrors.map((e) => `${(e.field ?? []).join(".")}: ${e.message}`).join("; ") ||
        "no_discount_returned";
      log.warn(
        { orgId, shop: session.shop, code: input.code, reason },
        "Shopify discount sync failed",
      );
      return { status: "failed", reason };
    }

    return {
      status: "created",
      discountId: result.codeDiscountNode.id,
      discountUrl: discountShareUrl(session.shop, input.code),
    };
  } catch (error) {
    // Most commonly a 403 from a shop whose token predates the `write_discounts` scope.
    log.error({ err: error, orgId, code: input.code }, "Shopify discount sync threw");
    return {
      status: "failed",
      reason: error instanceof Error ? error.message.slice(0, 500) : "unknown_error",
    };
  }
}

/** Turns a code off in the shop. Shopify keeps the row so the merchant can still see it. */
export async function deactivateShopifyDiscountCode(
  orgId: string,
  discountId: string,
): Promise<boolean> {
  if (!shopify) return false;
  try {
    const integration = await getShopifyInfo(orgId);
    if (!integration?.credential?.session?.shop) return false;
    const session = await getActiveShopifySession(integration);

    const client = new shopify.clients.Graphql({ session });
    await client.request(DEACTIVATE_MUTATION, { variables: { id: discountId } });
    return true;
  } catch (error) {
    log.error({ err: error, orgId, discountId }, "Shopify discount deactivate failed");
    return false;
  }
}
