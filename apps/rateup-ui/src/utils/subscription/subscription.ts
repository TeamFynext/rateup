import type { SubscriptionFeaturePathName } from "@/types/enums.ts";

import { getNestedProperty } from "../misc/obj.utils";

export function hasFeature(
  subscription: { features?: SubscriptionFeatures } | null | undefined,
  featurePath: SubscriptionFeaturePathName,
) {
  if (!subscription) return false;
  if (!subscription.features) return false;
  return getNestedProperty<{ active?: boolean }>(subscription.features, featurePath)?.active;
}

/**
 * Whether a plan gate is open, mirroring `isSubscriptionGateOpen` in
 * rateup-api/src/utils/canAccess.ts.
 *
 * The difference from {@link hasFeature} is the fallback, and it is not cosmetic. The
 * `whatsapp.*` tier gates (campaign, loyalty, referrals, catalog) were split out of
 * `whatsapp.active` after subscriptions were already live, so a blob written before the
 * split simply has no such key. Reading absent-as-false — which `hasFeature` does —
 * would tell every org still on a pre-split record that the feature they are paying for
 * is not on their plan. An absent sub-gate inherits its parent's `active` instead.
 *
 * Only ABSENT inherits. An explicit `{ active: false }`, which is how Free is written,
 * stays closed.
 */
export function isPlanGateOpen(
  subscription: { features?: SubscriptionFeatures } | null | undefined,
  gate: SubscriptionFeaturePathName,
): boolean {
  const features = subscription?.features;
  if (!features) return false;

  const node = getNestedProperty<{ active?: boolean }>(features, gate);
  if (node && typeof node.active === "boolean") return node.active;

  const lastDot = gate.lastIndexOf(".");
  if (lastDot === -1) return false;

  const parent = getNestedProperty<{ active?: boolean }>(features, gate.slice(0, lastDot));
  return Boolean(parent?.active);
}

export function getSampleSubscriptionFeatures(count: number): SubscriptionFeatures {
  return {
    team: {
      count: { max: count },
      teamMember: { count: { max: count }, active: true },
      active: true,
    },
    webSurvey: {
      count: { max: count, monthlyResponseLimit: 1000 },
      active: true,
      encryption: { active: true },
      googleReview: { active: true },
      emailNotification: { active: true },
      htmlCodePage: { active: true },
      webhook: {
        active: false,
      },
    },
    whatsapp: {
      active: true,
      conversation: {
        active: true,
        count: { max: count },
      },
    },
    ai: {
      count: { completionTokens: 120000, promptTokens: 120000 },
      active: false,
    },
  };
}
