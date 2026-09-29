import type { CommerceProvider } from "../commerce/commerce.types.js";
import {
  resolveShopifyPathValue,
  runShopifyOrderAutomation,
  saveShopifySurveys,
} from "./shopify.service.js";
import {
  createShopifyDiscountCode,
  deactivateShopifyDiscountCode,
} from "./shopifyDiscount.service.js";
import { shopifyLoyaltyEnabled } from "./shopify.util.js";

/**
 * Shopify as a commerce store. Every member defers to a function rather than
 * holding a reference: this module and `shopify.service.ts` import each other,
 * and a reference taken while that cycle is still loading would be undefined.
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
