import prisma from "../../../utils/prisma";

export async function updateSubscriptionFeatures2() {
  console.log("--> Updating subscription........AI & HTML Editor......");

  const subscriptions = await prisma.subscription.findMany();

  for (const subscription of subscriptions) {
    if (subscription?.features) {
      const currentFeatures: any = subscription.features;
      let updatedFeatures = currentFeatures;

      if (updatedFeatures.hasOwnProperty("webSurvey")) {
        let webSurvey = updatedFeatures.webSurvey;

        if (!webSurvey.hasOwnProperty("htmlCodePage")) {
          let newWebSurvey = {
            ...webSurvey,
            htmlCodePage: { active: false },
          };
          updatedFeatures.webSurvey = newWebSurvey;
        }
      }

      if (!updatedFeatures.hasOwnProperty("ai")) {
        updatedFeatures.ai = {
          count: { completionTokens: 0, promptTokens: 0 },
          active: false,
        };
      }

      let UpdatedSUB = await prisma.subscription.update({
        where: {
          orgId: subscription.orgId,
        },
        data: {
          features: updatedFeatures,
        },
      });
    }
  }
}
