import type { ShopOrder } from "../../../generated/prisma/client.js";
import { checkPlanLimit, type PlanLimitStatus } from "../../settings/subscription/planLimits.js";
import { ShopError } from "./shop.errors.js";

/** What a shopper is told when the plan's monthly orders are spent. */
export const ORDER_LIMIT_MESSAGE =
  "This shop can't take new orders online right now. Send us a message to order.";

type Counted = Pick<ShopOrder, "orgId" | "source">;

/** Test orders from setup are never counted or refused. */
export const countsTowardOrders = (order: Pick<ShopOrder, "source">) => order.source !== "test";

/** Where the org stands against its monthly orders. Unmetered for test orders. */
export async function orderAllowance(order: Counted): Promise<PlanLimitStatus> {
  if (!countsTowardOrders(order)) return { metered: false, used: 0, exceeded: false };
  return checkPlanLimit(order.orgId, "orders");
}

export function orderLimitError(audience: "customer" | "staff", max: number) {
  return new ShopError(
    "ORDER_LIMIT",
    audience === "staff"
      ? `Your shop has taken this month's ${max} orders. Upgrade your plan to keep taking orders.`
      : ORDER_LIMIT_MESSAGE,
  );
}

/**
 * Refuses a new order before the customer is asked to pay. Only for unpaid steps: once money
 * is taken the order always goes through and is counted (see placeOrder).
 */
export async function assertCanTakeOrder(
  order: Counted,
  audience: "customer" | "staff" = "customer",
) {
  const status = await orderAllowance(order);
  if (status.exceeded) throw orderLimitError(audience, status.max ?? 0);
}

/** False once the plan's monthly orders are spent, so a storefront can stop taking carts. */
export async function storeAcceptingOrders(orgId: string): Promise<boolean> {
  return !(await orderAllowance({ orgId, source: "storefront" })).exceeded;
}
