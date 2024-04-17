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
