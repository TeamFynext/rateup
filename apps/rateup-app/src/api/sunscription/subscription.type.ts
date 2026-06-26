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

interface SubscriptionFeatures {
  // [subscriptionFeatureName] : {subfeatures & activeField & countRestriction}
  [SubscriptionFeaturePathName.Menu]: subscriptionCountRestriction &
    subscriptionActiveField & {
      count: {
        monthlyViewLimit: number;
      };
    };
  [SubscriptionFeaturePathName.Team]: {
    teamMember: subscriptionCountRestriction & subscriptionActiveField;
  } & subscriptionActiveField &
    subscriptionCountRestriction;
  [SubscriptionFeaturePathName.WebSurvey]: subscriptionActiveField &
    subscriptionCountRestriction & {
      encryption: subscriptionActiveField;
      googleReview: subscriptionActiveField;
      emailNotification: subscriptionActiveField;
      htmlCodePage: subscriptionActiveField;
      webhook: subscriptionActiveField;
      count: {
        monthlyResponseLimit: number;
      };
    };
  [SubscriptionFeaturePathName.Whatsapp]: subscriptionWithActiveAndCount & {
    survey: subscriptionWithActiveAndCount;
    campaign: subscriptionWithActiveAndCount;
    flow: subscriptionWithActiveAndCount;
    template: subscriptionWithActiveAndCount & {
      carouselTemplate: subscriptionWithActiveAndCount;
    };
    count: {
      monthlyMessageLimit: number;
      max: number;
    };
    automation: subscriptionWithActiveAndCount & {
      automationTrigger: subscriptionWithActiveAndCount;
      leadAdAutomation: subscriptionWithActiveAndCount;
    };
  };
  [SubscriptionFeaturePathName.ReputationManagement]: subscriptionActiveField &
    subscriptionCountRestriction;
  [SubscriptionFeaturePathName.Ticket]: subscriptionActiveField &
    subscriptionCountRestriction;
  [SubscriptionFeaturePathName.AI]: subscriptionActiveField & {
    count: {
      completionTokens: number;
      promptTokens: number;
    };
  };
  [SubscriptionFeaturePathName.Loyalty]: subscriptionActiveField & {
    action: subscriptionWithActiveAndCount;
    reward: subscriptionWithActiveAndCount;
    customer: subscriptionWithActiveAndCount;
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
type subscriptionWithActiveAndCount = subscriptionCountRestriction &
  subscriptionActiveField;
