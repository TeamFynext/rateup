import prisma from "../../utils/prisma";

export async function updateSubscriptionFeatures() {
  console.log("Updating subscription..............");

  const subscriptions = await prisma.subscription.findMany();

  for (const subscription of subscriptions) {
    const currentFeatures: any = subscription.features;
    let updatedFeatures = currentFeatures;

    const ticket = {
      count: {
        max: 100,
      },
      active: false,
    };

    const newFeat = {
      active: false,
    };

    if (!updatedFeatures?.ticket) {
      updatedFeatures = { ...updatedFeatures, ticket };
    }

    if (!updatedFeatures?.webSurvey?.encryption) {
      let webSurvey = { ...updatedFeatures.webSurvey, encryption: newFeat };
      updatedFeatures = { ...updatedFeatures, webSurvey };
    }
    if (!updatedFeatures?.webSurvey?.emailNotification) {
      let webSurvey = {
        ...updatedFeatures.webSurvey,
        emailNotification: newFeat,
      };
      updatedFeatures = { ...updatedFeatures, webSurvey };
    }
    if (!updatedFeatures?.webSurvey?.googleReview) {
      let webSurvey = { ...updatedFeatures.webSurvey, googleReview: newFeat };
      updatedFeatures = { ...updatedFeatures, webSurvey };
    }
    if (!updatedFeatures?.webSurvey?.count?.monthlyResponseLimit) {
      updatedFeatures.webSurvey.count.monthlyResponseLimit = 1000;
    }

    if (!updatedFeatures?.menu?.count?.monthlyViewLimit) {
      updatedFeatures.menu.count.monthlyViewLimit = 1000;
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

  const UpdatedSubscriptions = await prisma.subscription.findMany();

  return JSON.stringify(UpdatedSubscriptions);
}

updateSubscriptionFeatures();
