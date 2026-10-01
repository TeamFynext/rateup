import _get from "lodash/get.js";
import { log } from "../../../utils/logger.js";
import type { ShopifyWebhookBody } from "./shopify.types.js";

export function resolveShopifyPathValue(
  shopifyBody: ShopifyWebhookBody | null | undefined,
  path: string,
): string {
  if (!shopifyBody) return "";

  let resolvedValue = "";

  if (path === "items_fulfilled") {
    const items = (shopifyBody.line_items ?? [])
      .filter((item) => item.fulfillment_status === "fulfilled")
      .map((item) => `${item.title} (x${item.quantity})`);
    resolvedValue = items.join(", ");
  } else if (path === "pending_items") {
    const items = (shopifyBody.line_items ?? [])
      .filter((item) => item.fulfillment_status !== "fulfilled")
      .map((item) => `${item.title} (x${item.quantity})`);
    resolvedValue = items.join(", ");
  } else if (path === "tracking_number") {
    resolvedValue = String(
      shopifyBody.tracking_number ??
        shopifyBody.fulfillments?.[0]?.tracking_number ??
        shopifyBody.fulfillment?.tracking_number ??
        "",
    );
  } else if (path === "tracking_url") {
    resolvedValue = String(
      shopifyBody.tracking_url ??
        shopifyBody.fulfillments?.[0]?.tracking_url ??
        shopifyBody.fulfillment?.tracking_url ??
        "",
    );
  } else if (path === "order_number") {
    resolvedValue = String(shopifyBody.order_number ?? "");
  } else if (path === "abandoned_checkout_url") {
    resolvedValue = String(
      shopifyBody.abandoned_checkout_url ??
        shopifyBody.recovery_url ??
        shopifyBody.checkout_url ??
        "",
    );
  } else {
    const val = _get(shopifyBody, path);
    resolvedValue = String(val ?? "");
  }

  log.info(`[Shopify Webhook Variable] Resolved path: "${path}" -> value: "${resolvedValue}"`);

  return resolvedValue;
}
