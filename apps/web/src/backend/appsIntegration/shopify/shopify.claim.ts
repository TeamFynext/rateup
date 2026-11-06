import { isNotFound } from "@/utils/apiError.ts";

/** The query string the API's Shopify OAuth callback redirects to `/auth/shopify` with. */
export interface ShopifyCallbackSearch {
  shop?: string;
  /** Single-use token that lets this RateUp login take the install (rateup-api shopify.claim.ts). */
  claim?: string;
}

const optionalString = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : undefined;

export function parseShopifyCallbackSearch(search: Record<string, unknown>): ShopifyCallbackSearch {
  return { shop: optionalString(search.shop), claim: optionalString(search.claim) };
}

/** Where to come back to after the login detour; it must keep the claim or the link is lost. */
export function shopifyCallbackPath(shop: string, claim: string | undefined): string {
  const params = new URLSearchParams({ shop });
  if (claim) params.set("claim", claim);
  return `/auth/shopify?${params.toString()}`;
}

/**
 * True when linking failed because this install link can no longer be used: the API answers
 * 404 alike for an unknown shop, an already-linked shop and a bad or expired claim.
 */
export function isExpiredShopifyClaim(error: unknown): boolean {
  return isNotFound(error);
}
