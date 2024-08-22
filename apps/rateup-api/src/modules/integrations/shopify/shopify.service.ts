import prisma from "../../../utils/prisma";
import shopify from "./shopify.config";
import { Session } from "@shopify/shopify-api";
import { isEmpty } from "lodash";
import { log } from "../../../utils/logger";
import {
  createSession,
  deleteSession,
  getSession,
  sendMessage,
} from "../../whatsapp/whatsappSurvey/wasurvey.service";
import {
  convertComponentForSenting,
  updateButtonText,
  wait,
} from "../../whatsapp/whatsappSurvey/wasurvey.controller";
import { updateMonthlyStat } from "../../stats/stats.service";
import {
  IntegratedApps,
  ShopifyEvents,
  SubscriptionFeaturePathName,
} from "../../../types/enums";
import {
  createTemplateMessage,
  validateSession,
} from "../../whatsapp/whatsappSurvey/wasurvey.utils";
import { getDbTemplate } from "../../whatsapp/messageTemplates/wa_templates.service";
import { getFlowIdFromTemplateComponents } from "../../whatsapp/messageTemplates/wa_templates.utils";
import { parsePhoneNumber } from "libphonenumber-js";
import {
  getScheduledTime,
  PaymentSource,
  ShopifyPlanMap,
  shopifyRecurringChargeStatus,
  shopifyRecurringChargeSubscriptionStatusMap,
  ShopifyWebhookTopicEventMap,
} from "./shopify.util";
import {
  getIntegrationByName,
  updateIntegrationByName,
} from "../integrations.service";
import { UpdateIntgrationInput } from "../integrations.schema";
import { API_URL } from "../../../utils/constants/constants";
import {
  OrderStatus,
  Org,
  PaymentStatus,
  SubscriptionStatus,
} from "@prisma/client";
import { getSubscription } from "../../subscription/subscription.service";
import dayjs from "dayjs";
import { createEmailBodySubscriptionActivated } from "../../../utils/email/payments/subscriptionActivated";
import { sendAWSEmail } from "../../../utils/email/sendAWSEmail";

export async function getShopifyAuthUrl(rawRequest, rawResponse, shop) {
  return await shopify.auth.begin({
    shop: shopify.utils.sanitizeShop(shop, true),
    callbackPath: "/api/public/integrations/shopify/auth/callback",
    isOnline: false,
    rawRequest,
    rawResponse,
  });
}

export async function handleShopifyAuthCallback(request, reply) {
  return await shopify.auth.callback({
    rawRequest: request.raw,
    rawResponse: reply.raw,
  });
}

export async function getShopifyInfo(orgId: string) {
  return (await getIntegrationByName(
    orgId,
    IntegratedApps.shopify,
  )) as unknown as ShopifyIntegration;
}

export async function getShopifyIntegrationByShop(shop: string) {
  return (await prisma.integration.findFirst({
    where: {
      credential: {
        path: ["session", "shop"],
        equals: shop,
      },
    },
    include: {
      org: true,
    },
  })) as unknown as ShopifyIntegration & { org: Org };
}

export async function updateShopifyIntegrationByOrgId(
  orgId: string,
  data: UpdateIntgrationInput,
) {
  return await updateIntegrationByName(orgId, IntegratedApps.shopify, data);
}

export async function updateShopifyIntegrationByShop(
  shop,
  data: UpdateIntgrationInput,
) {
  return await prisma.integration.updateMany({
    where: {
      credential: {
        path: ["session", "shop"],
        equals: shop,
      },
    },
    data,
  });
}

export async function registerShopifyWebhook(session: Session) {
  const response = await shopify.webhooks.register({
    session,
  });
  console.dir(response, { depth: null });
  if (!response || isEmpty(response))
    throw new Error("Error registering webhook");

  for (const hook of Object.keys(response)) {
    if (response[hook].length && !response[hook][0].success) {
      throw new Error(`Error registering webhook with topic ${hook}`);
    }
  }
}

export async function createScheduleOnShopifyEvent(
  customerPhone: string,
  event: ShopifyEvents,
  shopifyInfo: ShopifyIntegration,
  productIds: string[],
  webhookId: string,
  shop: string,
) {
  log.info(`checking survey for shopify event ${event}`);
  const phone = parsePhoneNumber(customerPhone, "IN");
  if (phone.isValid() === false) {
    log.trace("Invalid phone number");
    return;
  }
  const shopifySurvey = shopifyInfo.credential.shopifySurveys?.find(
    (s) => s.event === event,
  );
  if (!shopifySurvey || !shopifySurvey.active) {
    log.trace(`No Survey schedule found`);
    return;
  }

  const phoneWithoutPlus = phone.countryCallingCode + phone.nationalNumber;
  if (!phoneWithoutPlus) {
    log.trace(`No customer phone number found`);
    return;
  }
  const data = {
    scheduleTime: getScheduledTime(shopifySurvey.sendAfter),
    phone: phoneWithoutPlus,
    webhookId,
    createdAt: new Date(),
    status: "SCHEDULED",
  };

  const schedules = [...shopifySurvey.schedules];
  schedules.push(data);
  shopifySurvey.schedules = schedules;
  const newShopifySurveys = [...shopifyInfo.credential.shopifySurveys];
  newShopifySurveys.forEach((s) => {
    if (s.event === shopifySurvey.event) {
      s.schedules = schedules;
    }
  });
  if (shopifySurvey.isProductSpecific) {
    if (productIds.includes(shopifySurvey.productId)) {
      await updateShopifyIntegrationByShop(shop, {
        credential: {
          ...shopifyInfo.credential,
          shopifySurveys: newShopifySurveys,
        },
      });
    }
  } else {
    await updateShopifyIntegrationByShop(shop, {
      credential: {
        ...shopifyInfo.credential,
        shopifySurveys: newShopifySurveys,
      },
    });
  }
}

export async function sendShopifySurveyCronAction() {
  const currentTime = new Date();
  const fiveMinutesLater = new Date(currentTime.getTime() + 5 * 60000);

  const integrations = (await prisma.integration.findMany({
    where: {
      name: IntegratedApps.shopify,
    },
  })) as unknown as ShopifyIntegration[];

  if (!integrations.length) return;

  const schedules = integrations.flatMap((i) =>
    i.credential.shopifySurveys.flatMap((s) =>
      s.schedules.map((sch) => ({ ...sch, orgId: i.orgId, event_details: s })),
    ),
  );
  if (!schedules) return;
  const schedulesNotSent = schedules.filter(
    (s) =>
      s.status === "SCHEDULED" && new Date(s.scheduleTime) <= fiveMinutesLater,
  );
  if (!schedulesNotSent || !schedulesNotSent.length) return;

  for (const schedule of schedulesNotSent) {
    const res = await sendWhatsAppTemplateToCustomer(
      schedule.orgId,
      schedule.phone,
      schedule.event_details.waTemplateId,
      schedule.event_details.teamId,
    );
    const integration = integrations.find(
      (i) => i.orgId === schedule.orgId,
    ) as ShopifyIntegration;
    const shopifySurveys = integration.credential?.shopifySurveys;
    shopifySurveys.forEach((s) => {
      if (s.event === schedule.event_details.event) {
        s.schedules.forEach((sch) => {
          if (sch.webhookId === schedule.webhookId)
            sch.status = res
              ? res.status
                ? "SENT"
                : `FAILED: ${res?.message}`
              : "FAILED";
        });
      }
    });
    const updateData = { ...integration.credential, shopifySurveys };
    updateShopifyIntegrationByOrgId(schedule.orgId, { credential: updateData });
  }
}

export async function sendWhatsAppTemplateToCustomer(
  orgId,
  phone,
  waTemplateId,
  teamId,
) {
  try {
    if (!teamId) {
      throw new Error("TeamId not found");
    }
    const dbTemplate = await getDbTemplate(waTemplateId);
    if (!dbTemplate) {
      throw new Error(`Template with id ${waTemplateId} not found`);
    }
    const flowId = getFlowIdFromTemplateComponents(dbTemplate.data.components);
    let surveyTeamMap;
    if (flowId) {
      surveyTeamMap = await prisma.surveyTeamMap.findFirst({
        where: {
          teamId,
          survey: {
            WaFlow: {
              flowId: flowId,
            },
          },
        },
        select: {
          id: true,
          survey: {
            select: {
              languages: true,
            },
          },
        },
      });
      if (!surveyTeamMap) {
        throw new Error("SurveyTeamMap not found for flowId " + flowId);
      }
    } else {
      log.trace("No flow button identified in template");
    }
    const components = convertComponentForSenting(dbTemplate);
    const updatedComponent = updateButtonText(components, phone);
    const templateComponents = [...updatedComponent];
    if (flowId) {
      const existingSession = await getSession(orgId, phone);

      if (existingSession) {
        if (validateSession(existingSession)) {
          await deleteSession(orgId, phone);
        } else {
          log.warn("Session already exists for %o. Skipping...", phone);
        }
      }
      // creating session
      const newSession = await createSession({
        phone,
        surveyTeamMapId: surveyTeamMap.id,
        orgId: orgId,
        language: surveyTeamMap.survey.languages[0],
      });
      // adding flow button
      templateComponents.push({
        type: "button",
        sub_type: "flow",
        index: 0,
        parameters: [
          {
            type: "action",
            action: {
              flow_token: phone,
            },
          },
        ],
      });
    }
    const templateQuery = {
      name: dbTemplate.data.name,
      language: {
        code: dbTemplate.data?.language,
      },
      components: templateComponents,
    };
    const templateMessage = createTemplateMessage(phone, templateQuery);
    await updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
    await wait(50);
    return await sendMessage(orgId, templateMessage);
  } catch (e) {
    console.error(e);
    // log.error(e);
    return false;
  }
}

export async function deleteAllWebhooks(session) {
  const webhookslist = await shopify.rest.Webhook.all({ session });
  await Promise.all(
    webhookslist.data.map(async (webhook) => {
      const response = await shopify.rest.Webhook.delete({
        session,
        id: webhook.id,
      });
    }),
  );
}

export async function registerWebhookByTopic(topic, orgId) {
  const shopifyInfo = await getShopifyInfo(orgId);
  const webhook = new shopify.rest.Webhook({
    session: shopifyInfo.credential?.session,
  });
  webhook.address = `${API_URL}/api/shopify/webhooks`;
  (webhook.topic = ShopifyWebhookTopicEventMap.find(
    (webhookTopic) => webhookTopic.key == topic,
  ).value),
    (webhook.format = "json");
  await webhook.save({ update: true });
}

export async function handleSubscriptionUpdateFromShopify(shop, payload) {
  const integration = await getShopifyIntegrationByShop(shop);
  const subscription = await getSubscription(integration.orgId);
  const rateupPlan = await prisma.rateupPlan.findFirst({
    where: {
      displayName: payload?.app_subscription?.name,
    },
  });
  const currentPlanInRateup = subscription.basePlan.displayName;

  const chargeIdSplitArray =
    payload.app_subscription?.admin_graphql_api_id?.split("/");
  const chargeId = chargeIdSplitArray[chargeIdSplitArray.length - 1];
  const recurringCharge = await shopify.rest.RecurringApplicationCharge.find({
    session: integration.credential.session,
    id: parseInt(chargeId),
  });
  let haltSubscription = false;

  const shopDetails = await shopify.rest.Shop.current({
    session: integration.credential.session,
  });

  switch (payload.app_subscription?.status) {
    case shopifyRecurringChargeStatus.pending:
      const order = await prisma.order.create({
        data: {
          name: payload?.app_subscription?.name,
          createdById: integration.org.ownerId,
          orgId: integration.orgId,
          subscriptionId: chargeId,
          rateupPlanId: rateupPlan.id,
          subscriptionStatus: SubscriptionStatus.pending,
          shopifyPlanId: Object.values(ShopifyPlanMap)
            .find((plan) => plan.name === payload?.app_subscription?.name)
            ?.id?.toString(),
        },
      });
      break;
    case shopifyRecurringChargeStatus.declined:
      haltSubscription = true;
      break;
    case shopifyRecurringChargeStatus.active:
      if (payload.app_subscription?.name === "FREE PLAN") break;
      activateSubscriptionThroughShopify(
        recurringCharge,
        integration,
        chargeId,
        rateupPlan,
        shopDetails,
      );
      break;
    case shopifyRecurringChargeStatus.cancelled:
      if (currentPlanInRateup === payload?.app_subscription.name) {
        const order = await prisma.order.findUnique({
          where: {
            subscriptionId: chargeId,
          },
        });
        if (order) {
          const subscriptionStatus = await prisma.order.update({
            data: {
              subscriptionStatus: SubscriptionStatus.cancelled,
              subscriptionEndedAt: new Date(),
            },
            where: {
              subscriptionId: chargeId,
            },
          });
        }
      }
      break;
    case shopifyRecurringChargeStatus.expired:
      haltSubscription = true;
      break;
    case shopifyRecurringChargeStatus.frozen:
      await prisma.order.update({
        where: {
          subscriptionId: chargeId,
        },
        data: {
          subscriptionStatus: SubscriptionStatus.pending,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        },
      });
      break;
    default:
      await prisma.order.create({
        data: {
          name: payload?.name,
          createdById: integration.org.ownerId,
          orgId: integration.orgId,
          subscriptionId: chargeId,
          rateupPlanId: rateupPlan.id,
          subscriptionStatus: SubscriptionStatus.none,
          shopifyPlanId: Object.values(ShopifyPlanMap)
            .find((plan) => plan.name === payload?.app_subscription?.name)
            ?.id?.toString(),
        },
      });
      break;
  }

  if (haltSubscription) {
    const order = await prisma.order.update({
      where: {
        subscriptionId: chargeId,
      },
      data: {
        subscriptionStatus: SubscriptionStatus.halted,
        status: OrderStatus.FAILED,
        paymentStatus: PaymentStatus.FAILED,
      },
    });
  }
}

async function activateSubscriptionThroughShopify(
  recurringCharge,
  integration,
  chargeId,
  rateupPlan,
  shopDetails,
) {
  if (recurringCharge.name === "FREE PLAN") return;
  const data = {
    name: recurringCharge.name,
    createdById: integration.org.ownerId,
    orgId: integration.orgId,
    rateupPlanId: rateupPlan.id,
    subscriptionStatus:
      shopifyRecurringChargeSubscriptionStatusMap[recurringCharge.status],
    subscriptionChargeAt: new Date(recurringCharge.billing_on),
    shopifyPlanId: Object.values(ShopifyPlanMap)
      .find((plan) => plan.name === recurringCharge.name)
      ?.id?.toString(),
  };
  const order = await prisma.order.upsert({
    where: {
      subscriptionId: chargeId,
    },
    create: {
      ...data,
      subscriptionId: chargeId,
    },
    update: data,
  });
  const payment = await prisma.payments.create({
    data: {
      payId: chargeId,
      amount: Number(recurringCharge?.price),
      currency: recurringCharge?.currency,
      method: PaymentSource.Shopify,
      description: "Subscription activated through shopify",
      customer_email: shopDetails.email || "",
      customer_phone: shopDetails.phone || "",
      rateupOrderId: order.id,
      createdAt: Math.floor(
        new Date(recurringCharge.activated_on).getTime() / 1000,
      ),
    },
  });
  const expiresAt = dayjs(recurringCharge.activated_on)
    .add(29, "days")
    .toDate();
  const updatedSubscription = await prisma.subscription.update({
    where: { orgId: integration?.orgId },
    data: {
      basePlanId: rateupPlan?.id,
      features: rateupPlan.features,
      renewedAt: new Date(),
      expiresAt,
      subscriptionRef: chargeId,
      lastLimitAlertSentAt: null,
    },
  });

  const updatedOrder = await prisma.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: OrderStatus.COMPLETE,
      paymentStatus: PaymentStatus.SUCCESS,
    },
  });

  if (updatedOrder) {
    log.info("sending email..");
    const user = await prisma.user.findUnique({
      where: {
        id: integration.org.ownerId,
      },
    });

    const msg = {
      to: user.email,
      subject: "Rateup Subscription Activated - Rateup.app",
      text: `Your subscription from shopify for the Rateup ${recurringCharge.name} has activated`,
      html: createEmailBodySubscriptionActivated(
        rateupPlan?.displayName,
        expiresAt,
      ),
    };
    try {
      sendAWSEmail(msg);
    } catch (error) {
      console.error(error);
      throw new Error("Email sending failed. E:" + error);
    }
  }
}

export async function handleWebhook(webhook) {
  switch (webhook.topic) {
    case ShopifyEvents.APP_SUBSCRIPTIONS_UPDATE:
      await handleSubscriptionUpdateFromShopify(webhook.shop, webhook.body);
      break;
  }
}

export async function getRecurringCharge(chargId, orgId) {
  const integration = await getShopifyInfo(orgId);
  if (integration)
    return await shopify.rest.RecurringApplicationCharge.find({
      session: integration.credential.session,
      id: parseInt(chargId),
    });
  return null;
}
