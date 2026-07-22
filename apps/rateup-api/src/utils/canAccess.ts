export { TeamFeature } from "../../generated/prisma/client.js";
import { TeamFeature } from "../../generated/prisma/client.js";
import { SubscriptionFeaturePathName as sfpn } from "../types/enums.js";
import { getNestedProperty } from "./misc/obj.utils.js";

/**
 * Subscription-level gate for each TeamFeature.
 * null = no subscription gate (feature is always subscription-ok).
 */
export const subscriptionGates: Record<TeamFeature, string | null> = {
  [TeamFeature.inbox]: sfpn.Whatsapp,
  [TeamFeature.campaigns]: sfpn.Whatsapp,
  [TeamFeature.flows]: sfpn.Whatsapp,
  [TeamFeature.chatbots]: sfpn.Whatsapp,
  [TeamFeature.templates]: sfpn.Whatsapp,
  [TeamFeature.automation]: sfpn.Whatsapp,
  [TeamFeature.loyalty]: sfpn.Whatsapp,
  [TeamFeature.web_forms]: sfpn.WebSurvey,
  // Tickets are free with no limits (no subscription feature backs them), so
  // there is no subscription gate — access is governed only by team/RBAC perms.
  [TeamFeature.tickets]: null,
  [TeamFeature.ai_chatbot]: sfpn.AI,

  [TeamFeature.analytics]: null,
  [TeamFeature.contacts]: null,
  [TeamFeature.qr_studio]: null,
  [TeamFeature.apps_services]: null,
  [TeamFeature.settings]: null,
};

/**
 * Returns true when BOTH the subscription gate (if any) AND the team feature
 * permission are satisfied.
 *
 * @param subscriptionFeatures - the subscription.features JSON object
 * @param userFeatures         - Set<TeamFeature> from getUserFeatures()
 * @param feature              - the TeamFeature to check
 */
export function canAccess(
  subscriptionFeatures: SubscriptionFeatures,
  userFeatures: Set<TeamFeature>,
  feature: TeamFeature,
): boolean {
  const subGate = subscriptionGates[feature];

  const subOk = subGate ? Boolean(getNestedProperty(subscriptionFeatures, subGate)?.active) : true;

  const teamOk = userFeatures.has(feature);

  return subOk && teamOk;
}
