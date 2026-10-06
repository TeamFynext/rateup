import { IntegratedApps } from "../../../types/enums.js";
import type { IntegrationProvider } from "../providers/integrationProvider.types.js";

/**
 * WhatsApp Payments (India): the payment gateways a business linked to its
 * WhatsApp Business account in WhatsApp Manager. RateUp keeps a copy of the
 * list (`wapayment.service.ts`) for the order-details template send, and the
 * verification link each gateway needs.
 *
 * It rides on the WhatsApp connection, so there is nothing of its own to
 * connect or disconnect remotely, and it acts on no RateUp event.
 */
export const waPaymentProvider: IntegrationProvider = {
  name: IntegratedApps.waPayment,
  label: "WhatsApp Payment",
  auth: "custom",
  connection: "integration",
  events: [],
  subscribedEvents: () => [],
  async handleEvent() {},
};
