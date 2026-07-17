function getSampleSubscriptionFeatures(count: number): SubscriptionFeatures {
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
        count: { max: 1000 },
      },
    },
    reputationManagement: { count: { max: count }, active: true },
    ai: {
      count: { completionTokens: 12000, promptTokens: 120000 },
      active: false,
    },
  };
}
export const SampleSubscriptionFeatures = getSampleSubscriptionFeatures(10);

// TODO: check if Math.infinity is a good idea or use null value for unlimited
export const UnlimitedAccess = getSampleSubscriptionFeatures(10000);

export function getFreeSubscriptionFeatures(
  overrides?: Partial<SubscriptionFeatures>,
): SubscriptionFeatures {
  const base = {
    team: {
      count: { max: 1 },
      teamMember: { count: { max: 1 }, active: true },
      active: true,
    },
    webSurvey: {
      count: { max: 2, monthlyResponseLimit: 50 },
      active: true,
      encryption: { active: false },
      googleReview: { active: false },
      emailNotification: { active: false },
      htmlCodePage: { active: false },
      webhook: {
        active: false,
      },
    },
    whatsapp: {
      active: true,
      conversation: {
        active: true,
        count: { max: 500 },
      },
    },
    reputationManagement: { count: { max: 0 }, active: false },
    ai: { count: { completionTokens: 0, promptTokens: 0 }, active: false },
  };

  return {
    ...base,
    ...overrides,
  };
}

export const FreePlanSubscriptionFeatures = getFreeSubscriptionFeatures();
