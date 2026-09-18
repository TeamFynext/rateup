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
  [TeamFeature.campaigns]: sfpn.WhatsappCampaign,
  [TeamFeature.flows]: sfpn.Whatsapp,
  [TeamFeature.chatbots]: sfpn.Whatsapp,
  [TeamFeature.templates]: sfpn.Whatsapp,
  [TeamFeature.automation]: sfpn.Whatsapp,
  [TeamFeature.loyalty]: sfpn.WhatsappLoyalty,
  [TeamFeature.web_forms]: sfpn.WebSurvey,
  // The lead pipeline has no subscription feature behind it, so there is no
  // subscription gate — access is governed only by team/RBAC perms.
  [TeamFeature.pipeline]: null,
  [TeamFeature.ai_chatbot]: sfpn.AI,

  [TeamFeature.analytics]: null,
  [TeamFeature.contacts]: null,
  [TeamFeature.qr_studio]: null,
  [TeamFeature.apps_services]: null,
  [TeamFeature.settings]: null,

  // RETIRED: ticket boards were removed and every Ticket* table dropped, but the
  // enum value stays in Postgres because teams in production still carry it in
  // TeamFeatureAccess. This map must be total over TeamFeature, so the key stays
  // too. Nothing reads it.
  [TeamFeature.tickets]: null,
};

/**
 * Every TeamFeature a team can actually be granted — the enum minus retired values like
 * `tickets`, which survives only because production rows carry it. Use this when granting.
 */
export const GRANTABLE_TEAM_FEATURES: readonly TeamFeature[] = (
  Object.values(TeamFeature) as TeamFeature[]
).filter((feature) => feature !== TeamFeature.tickets);

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

  const subOk = subGate ? isSubscriptionGateOpen(subscriptionFeatures, subGate) : true;

  const teamOk = userFeatures.has(feature);

  return subOk && teamOk;
}

/**
 * Resolves one dotted subscription gate to a boolean.
 *
 * The `whatsapp.*` tier gates (campaign, loyalty, referrals, catalog) were split out
 * of `whatsapp.active` after subscriptions were already in the wild. A stored blob
 * written before the split has no such key, and reading absent-as-false would revoke
 * campaigns and loyalty from every org currently paying for them. So an absent
 * sub-gate inherits its parent's `active` instead. Once a record is rewritten by
 * migrateFeaturesToCurrentSchema or a plan assignment, the key is explicit and this
 * fallback stops applying.
 *
 * Only ABSENT inherits — an explicit `{ active: false }` (how Free is written) is
 * honoured as a closed gate.
 */
export function isSubscriptionGateOpen(
  subscriptionFeatures: SubscriptionFeatures,
  gate: string,
): boolean {
  const node = getNestedProperty<subscriptionActiveField>(subscriptionFeatures, gate);
  if (node && typeof node.active === "boolean") return node.active;

  const lastDot = gate.lastIndexOf(".");
  if (lastDot === -1) return false;

  const parent = getNestedProperty<subscriptionActiveField>(
    subscriptionFeatures,
    gate.slice(0, lastDot),
  );
  return Boolean(parent?.active);
}
