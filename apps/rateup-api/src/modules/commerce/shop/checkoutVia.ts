/** Whether the merchant's Shopify or WooCommerce store, not RateUp, takes the payment. */
export const inStoreCheckout = (via: string | null | undefined) =>
  via === "SHOPIFY" || via === "WOOCOMMERCE";

export const STORE_LABEL = { SHOPIFY: "Shopify", WOOCOMMERCE: "WooCommerce" } as const;

export const storeLabel = (via: string | null | undefined) =>
  via === "SHOPIFY" || via === "WOOCOMMERCE" ? STORE_LABEL[via] : "your store";

/**
 * An order the customer pays in the store: one already sent there, or one whose own
 * `checkoutVia` says so. RateUp must never take a second payment for it.
 */
export const paysInStore = (order: {
  checkoutVia: string | null | undefined;
  externalCheckoutUrl?: string | null;
}) => inStoreCheckout(order.checkoutVia) || Boolean(order.externalCheckoutUrl);

/** Fulfilled in the store: checked out there, or a RateUp-checkout order written back to it. */
export const fulfilledInStore = (order: {
  checkoutVia: string | null | undefined;
  externalProvider?: string | null;
  externalId?: string | null;
}) => inStoreCheckout(order.checkoutVia) || Boolean(order.externalProvider && order.externalId);

/**
 * The products a shop can sell: while checkout is in Shopify or WooCommerce, only that store's
 * own, since a product made in RateUp can't be paid for there.
 */
export const sellableWhere = (store: { checkoutVia: string | null | undefined }) =>
  store.checkoutVia === "SHOPIFY"
    ? { externalSource: "shopify" }
    : store.checkoutVia === "WOOCOMMERCE"
      ? { externalSource: "woocommerce" }
      : {};
