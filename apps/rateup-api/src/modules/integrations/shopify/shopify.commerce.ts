import type { CommerceProvider } from "../commerce/commerce.types.js";
import { saveShopifySurveys } from "./shopify.credential.js";
import { resolveShopifyPathValue } from "./shopify.mapping.js";
import { runShopifyOrderAutomation } from "./shopify.messages.js";
import {
  createShopifyDiscountCode,
  deactivateShopifyDiscountCode,
} from "./shopifyDiscount.service.js";
import { shopifyLoyaltyEnabled } from "./shopify.util.js";

/**
 * Shopify as a commerce store. Every member defers to a function rather than
 * holding a reference: `shopify.orders.ts` imports this module, and the rule
 * engine behind `runShopifyOrderAutomation` reaches back into Shopify, so a
 * reference taken while that cycle is still loading could be undefined.
 */
export const shopifyCommerce: CommerceProvider = {
  name: "shopify",
  label: "Shopify",

  surveysField: "shopifySurveys",
  saveSurveys: (store, surveys) => saveShopifySurveys(store, surveys),
  resolveTemplateValue: (raw, path) => resolveShopifyPathValue(raw as never, path),

  loyaltyEnabled: (program) => shopifyLoyaltyEnabled(program),

  discountRulesKey: "shopify",
  createDiscountCode: (orgId, input) => createShopifyDiscountCode(orgId, input),
  deactivateDiscountCode: (orgId, discountId) => deactivateShopifyDiscountCode(orgId, discountId),

  runOrderAutomation: (store, order, phone) => runShopifyOrderAutomation(store, order, phone),
};
