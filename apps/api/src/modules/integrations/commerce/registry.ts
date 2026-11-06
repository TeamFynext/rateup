import { shopifyCommerce } from "../shopify/shopify.commerce.js";
import { wooCommerceCommerce } from "../woocommerce/woocommerce.commerce.js";
import type { CommerceProvider } from "./commerce.types.js";

/** Every store integration. */
export const COMMERCE_PROVIDERS: readonly CommerceProvider[] = [
  shopifyCommerce,
  wooCommerceCommerce,
];

export function getCommerceProvider(name: string): CommerceProvider | undefined {
  return COMMERCE_PROVIDERS.find((provider) => provider.name === name);
}
