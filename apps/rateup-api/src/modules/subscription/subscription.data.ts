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
      htmlCodePage: { active: true },
      webhook: {
        active: false,
      },
    },
    whatsapp: {
      active: true,
      count: {
        max: 0,
        monthlyMessageLimit: 100,
      },
      survey: {
        active: true,
        count: {
          max: 0,
        },
      },
      campaign: {
        active: true,
        count: {
          max: 0,
        },
      },
      flow: {
        active: true,
        count: {
          max: 0,
        },
      },
      template: {
        active: true,
        count: {
          max: 0,
        },
        carouselTemplate: {
          active: false,
          count: {
            max: 1,
          },
        },
      },
      automation: {
        active: true,
        count: { max: count },
        automationTrigger: { count: { max: count }, active: true },
        leadAdAutomation: { count: { max: 0 }, active: false },
      },
    },
    reputationManagement: { count: { max: count }, active: true },
    ticket: { count: { max: count }, active: true },
    ai: {
      count: { completionTokens: 12000, promptTokens: 120000 },
      active: false,
    },
    loyalty: {
      action: { count: { max: count }, active: true },
      reward: { count: { max: count }, active: true },
      customer: { count: { max: count }, active: true },
      active: true,
    },
  };
}
export const SampleSubscriptionFeatures = getSampleSubscriptionFeatures(10);

// TODO: check if Math.infinity is a good idea or use null value for unlimited
export const UnlimitedAccess = getSampleSubscriptionFeatures(10000);

function getFreeSubscriptionFeatures(): SubscriptionFeatures {
  return {
    menu: { count: { max: 1, monthlyViewLimit: 50 }, active: false },
    team: {
      count: { max: 1 },
      teamMember: { count: { max: 1 }, active: true },
      active: true,
    },
    webSurvey: {
      count: { max: 5, monthlyResponseLimit: 1000 },
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
      count: {
        max: 0,
        monthlyMessageLimit: 1000,
      },
      survey: {
        active: true,
        count: {
          max: 0,
        },
      },
      campaign: {
        active: true,
        count: {
          max: 1,
        },
      },
      flow: {
        active: true,
        count: {
          max: 1,
        },
      },
      template: {
        active: true,
        count: {
          max: 1,
        },
        carouselTemplate: {
          active: false,
          count: {
            max: 1,
          },
        },
      },
      automation: {
        active: true,
        count: { max: 1 },
        automationTrigger: { count: { max: 1000 }, active: true },
        leadAdAutomation: { count: { max: 0 }, active: false },
      },
    },
    reputationManagement: { count: { max: 0 }, active: false },
    ticket: { count: { max: 0 }, active: false },
    ai: { count: { completionTokens: 0, promptTokens: 0 }, active: false },
    loyalty: {
      action: { count: { max: 0 }, active: true },
      reward: { count: { max: 0 }, active: true },
      customer: { count: { max: 0 }, active: true },
      active: false,
    },
  };
}

export const FreePlanSubscriptionFeatures = getFreeSubscriptionFeatures();
