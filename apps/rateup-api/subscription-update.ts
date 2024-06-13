import prisma from "./src/utils/prisma";

export async function updateSubscriptionFeatures() {
  console.log("Updating subscription........whatsapp......");

  const subscriptions = await prisma.subscription.findMany();

  for (const subscription of subscriptions) {
    const currentFeatures: any = subscription.features;
    let updatedFeatures = currentFeatures;

    // Check and remove 'whatsappSurvey' if it exists
    if (updatedFeatures.hasOwnProperty("whatsappSurvey")) {
      delete updatedFeatures.whatsappSurvey;
    }

    // Check and remove 'whatsappCampaign' if it exists
    if (updatedFeatures.hasOwnProperty("whatsappCampaign")) {
      delete updatedFeatures.whatsappCampaign;
    }

    // Adding the new 'whatsapp' object
    if (!updatedFeatures.hasOwnProperty("whatsapp")) {
      updatedFeatures.whatsapp = {
        active: true,
        count: {
          max: 999,
          monthlyMessageLimit: 100,
        },
        survey: {
          active: true,
          count: {
            max: 999,
          },
        },
        campaign: {
          active: true,
          count: {
            max: 999,
          },
        },
        flow: {
          active: true,
          count: {
            max: 999,
          },
        },
        template: {
          active: true,
          count: {
            max: 999,
          },
        },
      };
    }

    let updatedSub = await prisma.subscription.update({
      where: {
        orgId: subscription.orgId,
      },
      data: {
        features: updatedFeatures,
      },
    });

    console.log(updatedSub);
  }
}

// updateSubscriptionFeatures();
