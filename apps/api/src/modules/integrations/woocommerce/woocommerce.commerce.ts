import prisma from "../../../utils/prisma.js";
import type { CommerceProvider } from "../commerce/commerce.types.js";
import { createWooDiscountCode, deactivateWooDiscountCode } from "./woocommerce.coupons.js";
import { resolveWooPathValue } from "./woocommerce.mapping.js";

/** Whether the org's loyalty programme earns points on WooCommerce orders. */
export const wooLoyaltyEnabled = (program: Record<string, unknown>) =>
  Boolean(program.enableWooOrderPoints);

/** WooCommerce as a commerce store. */
export const wooCommerceCommerce: CommerceProvider = {
  name: "woocommerce",
  label: "WooCommerce",

  // Survey settings on the integration are Shopify's legacy path; WooCommerce's
  // order messages are automation rules. Kept so the shared survey code has a
  // field to read, which will simply be empty.
  surveysField: "orderSurveys",
  saveSurveys: async (store, surveys) => {
    await prisma.integration.update({
      where: { id: (store.integration as { id: string }).id },
      data: {
        credential: {
          ...(store.integration.credential as Record<string, unknown>),
          orderSurveys: surveys,
        } as never,
      },
    });
  },
  resolveTemplateValue: (raw, path) => resolveWooPathValue(raw, path),

  loyaltyEnabled: wooLoyaltyEnabled,
  // A WooCommerce order is `processing` once paid, and many stores never move
  // it past there when something goes wrong; `completed` is the store saying
  // the customer has their goods.
  awardStatus: "fulfilled",

  discountRulesKey: "woocommerce",
  createDiscountCode: (orgId, input) => createWooDiscountCode(orgId, input),
  deactivateDiscountCode: (orgId, discountId) => deactivateWooDiscountCode(orgId, discountId),

  runOrderAutomation: async (store, order, phone) => {
    // Loaded on use: the automation engine pulls in most of the messaging stack,
    // which the registries importing this module have no need for.
    const { checkAndExecuteRuleByTriggerEvent } =
      await import("../../whatsapp/automatedReply/wa_automatedReply.utils.js");
    const { TriggerEvent } = await import("../../../../generated/prisma/enums.js");
    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.WOOCOMMERCE_EVENT, {
      orgId: store.orgId,
      phone,
      wooEvent: order.eventKey,
      wooProductIds: order.productIds,
      wooBody: order.raw,
      platform: "WHATSAPP",
    });
  },
};
