function getSampleSubscriptionFeatures(count: number): SubscriptionFeatures {
  return {
    menu: { count: { max: count, monthlyViewLimit: 1000 }, active: true },
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
    },
    whatsappSurvey: { count: { max: count }, active: true },
    whatsappCampaign: { count: { max: count }, active: true },
    reputationManagement: { count: { max: count }, active: true },
    ticket: { count: { max: count }, active: true },
  };
}
export const SampleSubscriptionFeatures = getSampleSubscriptionFeatures(10);

// TODO: check if Math.infinity is a good idea or use null value for unlimited
export const UnlimitedAccess = getSampleSubscriptionFeatures(10000);

function getFreeSubscriptionFeatures(): SubscriptionFeatures {
  return {
    menu: { count: { max: 1, monthlyViewLimit: 50 }, active: true },
    team: {
      count: { max: 1 },
      teamMember: { count: { max: 1 }, active: true },
      active: true,
    },
    webSurvey: {
      count: { max: 1, monthlyResponseLimit: 50 },
      active: true,
      encryption: { active: false },
      googleReview: { active: false },
      emailNotification: { active: false },
    },
    whatsappSurvey: { count: { max: 0 }, active: false },
    whatsappCampaign: { count: { max: 0 }, active: false },
    reputationManagement: { count: { max: 0 }, active: false },
    ticket: { count: { max: 0 }, active: false },
  };
}

export const FreePlanSubscriptionFeatures = getFreeSubscriptionFeatures();
