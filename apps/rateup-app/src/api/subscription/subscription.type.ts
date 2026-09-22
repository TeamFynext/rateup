import { SubscriptionFeaturePathName } from "../../../enums";

export interface Subscription {
  orgId: string;
  features: SubscriptionFeatures;
  expiresAt: Date;
  renewedAt?: Date;
  createdAt: Date;
  basePlan: SPlan;
  id?: string;
  paymentPlanId?: string;
  subscriptionRef?: string;
  isAnnualMessageLimit: boolean;
  shopifyPlanId?: string;
}

/**
 * Mirrors `SubscriptionFeatures` in `rateup-api/src/types/global.d.ts`.
 *
 * The previous shape here described a product that no longer exists — a `menu` feature,
 * per-loyalty-action counts, ticketing, reputation management — none of which the server
 * has sent for some time. What it does send is below.
 */
interface SubscriptionFeatures {
  [SubscriptionFeaturePathName.Team]: {
    teamMember: subscriptionCountRestriction & subscriptionActiveField;
  } & subscriptionActiveField &
    subscriptionCountRestriction;
  // No count restriction on forms themselves: they are capped by monthly responses, not
  // by how many you build.
  [SubscriptionFeaturePathName.WebSurvey]: subscriptionActiveField & {
    encryption: subscriptionActiveField;
    googleReview: subscriptionActiveField;
    emailNotification: subscriptionActiveField;
    htmlCodePage: subscriptionActiveField;
    webhook: subscriptionActiveField;
    count: {
      monthlyResponseLimit: number;
    };
  };
  [SubscriptionFeaturePathName.Whatsapp]: subscriptionActiveField & {
    conversation: subscriptionWithActiveAndCount;
    /**
     * The tier gates. Optional on purpose, matching the server: subscriptions stored
     * before these existed have no such key, so "absent" is a real state a reader has to
     * handle rather than a type error to silence. `hasFeature` treats absent as closed.
     */
    campaign?: subscriptionActiveField;
    loyalty?: subscriptionActiveField;
    referrals?: subscriptionActiveField;
    catalog?: subscriptionActiveField;
  };
  [SubscriptionFeaturePathName.AI]: subscriptionActiveField & {
    count: {
      completionTokens: number;
      promptTokens: number;
    };
  };
}

interface SPlan {
  id: string;
  name: string;
  displayName: string;
  paymentPlan?: {
    period: string;
    amount: number;
  };
  paymentPlanId?: string;
}

type subscriptionCountRestrictionCountType = {
  max: number;
};
type subscriptionCountRestriction = {
  count: subscriptionCountRestrictionCountType;
};
type subscriptionActiveField = {
  active: boolean;
};
type subscriptionWithActiveAndCount = subscriptionCountRestriction & subscriptionActiveField;
