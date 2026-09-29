import { isAxiosError } from "axios";

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
import type { CommerceDiscountInput, CommerceDiscountOutcome } from "../commerce/commerce.types.js";
import {
  createWooClient,
  createWooCoupon,
  updateWooCoupon,
  type WooCouponInput,
} from "./woocommerce.client.js";
import { readWooCredential } from "./woocommerce.types.js";

/**
 * WooCommerce's half of loyalty discount codes: a reward's redemption code
 * becomes a single-use coupon (`POST /wc/v3/coupons`). What the reward means
 * as a discount, and when it is live, is the commerce layer's
 * (`commerce/discountRules.ts`); recording the outcome is `commerce/discounts.ts`.
 *
 * WooCommerce stores coupon codes in lower case and matches them without
 * regard to case, so `RU-ABCDEFGHJK` works typed either way; the order mapping
 * upper-cases the codes it reads back so they meet the redemption row.
 */

/** Tolerance for "starts now": the redemption and this call are moments apart. */
const START_SLACK_MS = 60_000;

const decimal = (amount: number) => amount.toFixed(2);

/** `2026-09-28T10:00:00` — UTC without the zone, which `date_expires_gmt` expects. */
const asWooGmt = (date: Date) => date.toISOString().slice(0, 19);

/**
 * The store-neutral input as a WooCommerce coupon, or a reason it cannot be one.
 *
 * WooCommerce coupons have no start date, so a code whose promotion opens
 * later would work at once; that is refused rather than created early. There
 * is no per-class "combines with" either: `individual_use` is all or nothing,
 * so the coupon stands alone unless the reward allows any combination.
 */
export function toWooCoupon(
  input: CommerceDiscountInput,
  now: Date = new Date(),
): { coupon: WooCouponInput } | { reason: string } {
  if (input.startsAt.getTime() > now.getTime() + START_SLACK_MS) {
    return { reason: "woocommerce_coupons_cannot_start_later" };
  }

  const combines =
    input.combinesWith.order || input.combinesWith.product || input.combinesWith.shipping;

  return {
    coupon: {
      code: input.code,
      description: input.title,
      ...(input.value.kind === "fixed"
        ? { discount_type: "fixed_cart", amount: decimal(input.value.amount) }
        : {
            discount_type: "percent",
            amount: decimal(Math.min(Math.max(input.value.percentage, 0), 100)),
          }),
      date_expires_gmt: input.endsAt ? asWooGmt(input.endsAt) : null,
      ...(input.minimumSpend ? { minimum_amount: decimal(input.minimumSpend) } : {}),
      individual_use: !combines,
      // One redemption, one use: without these the code becomes a public coupon
      // the moment one customer forwards the WhatsApp message.
      usage_limit: 1,
      usage_limit_per_user: 1,
    },
  };
}

async function wooClientFor(orgId: string) {
  const integration = await prisma.integration.findUnique({
    where: { orgid_integration_name_unique: { orgId, name: IntegratedApps.woocommerce } },
  });
  const credential = integration?.active ? readWooCredential(integration.credential) : null;
  return credential ? createWooClient(credential) : null;
}

/** WooCommerce's own words for a refusal (`{ code, message }`), else axios's. */
function wooReason(error: unknown) {
  if (isAxiosError(error)) {
    const body = error.response?.data as { code?: string; message?: string } | undefined;
    const reason = [body?.code, body?.message].filter(Boolean).join(": ");
    if (reason) return reason.slice(0, 500);
  }
  return error instanceof Error ? error.message.slice(0, 500) : "unknown_error";
}

/**
 * Creates the coupon in the store. Never throws: a store that refuses must not
 * fail the redemption the customer already paid points for. `skipped` means
 * the store was never reached.
 */
export async function createWooDiscountCode(
  orgId: string,
  input: CommerceDiscountInput,
): Promise<CommerceDiscountOutcome> {
  const client = await wooClientFor(orgId);
  if (!client) return { status: "skipped", reason: "store_not_connected" };

  const built = toWooCoupon(input);
  if ("reason" in built) return { status: "failed", reason: built.reason };

  try {
    const coupon = await createWooCoupon(client, built.coupon);
    // No share link: WooCommerce core has no URL that applies a coupon.
    return { status: "created", discountId: String(coupon.id) };
  } catch (error) {
    const reason = wooReason(error);
    log.warn({ orgId, code: input.code, reason }, "WooCommerce coupon sync failed");
    return { status: "failed", reason };
  }
}

/**
 * Turns a coupon off by expiring it now. WooCommerce has no "inactive" state;
 * expiring rather than trashing keeps it in the merchant's coupon list, as
 * Shopify does with a deactivated discount.
 */
export async function deactivateWooDiscountCode(
  orgId: string,
  discountId: string,
): Promise<boolean> {
  try {
    const client = await wooClientFor(orgId);
    if (!client) return false;
    await updateWooCoupon(client, discountId, { date_expires_gmt: asWooGmt(new Date()) });
    return true;
  } catch (error) {
    log.error({ err: error, orgId, discountId }, "WooCommerce coupon deactivate failed");
    return false;
  }
}
