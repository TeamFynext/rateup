import prisma from "../../../utils/prisma.js";
import shopify from "./shopify.config.js";
import { GraphqlClient, Session } from "@shopify/shopify-api";
import isEmpty from "lodash/isEmpty.js";
import _get from "lodash/get.js";
import { log } from "../../../utils/logger.js";
import {
  createSession,
  deleteSession,
  getSession,
  sendMessage,
} from "../../whatsapp/whatsappSurvey/wasurvey.service.js";
import {
  convertComponentForSenting,
  updateButtonText,
  wait,
} from "../../whatsapp/whatsappSurvey/wasurvey.controller.js";
import { updateMonthlyStat } from "../../stats/stats.service.js";
import {
  IntegratedApps,
  ShopifyEvents,
  SubscriptionFeaturePathName,
} from "../../../types/enums.js";
import {
  createTemplateMessage,
  validateSession,
} from "../../whatsapp/whatsappSurvey/wasurvey.utils.js";
import { getDbTemplate } from "../../whatsapp/messageTemplates/wa_templates.service.js";
import { getFlowIdFromTemplateComponents } from "../../whatsapp/messageTemplates/wa_templates.utils.js";
import { parsePhoneNumber } from "libphonenumber-js";
import {
  getScheduledTime,
  PaymentSource,
  ShopifyOrderWebhookTopicEventMap,
  ShopifyPlanMap,
  shopifyRecurringChargeStatus,
  shopifyRecurringChargeSubscriptionStatusMap,
} from "./shopify.util.js";
import {
  getIntegrationByName,
  updateIntegrationByName,
} from "../integrations.service.js";
import { UpdateIntgrationInput } from "../integrations.schema.js";
import { API_URL } from "../../../utils/constants/constants.js";
import {
  OrderStatus,
  Org,
  PaymentStatus,
  SubscriptionStatus,
} from "../../../../generated/prisma/client.js";
import { getSubscription } from "../../subscription/subscription.service.js";
import dayjs from "dayjs";
import { createEmailBodySubscriptionActivated } from "../../../utils/email/payments/subscriptionActivated.js";
import { sendAWSEmail } from "../../../utils/email/sendAWSEmail.js";
import { pauseOrg } from "../../org/org.services.js";
import { WEBHOOK_API_ROUTE } from "./shopify.handler.js";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller.js";
import { getScheduleTime } from "../../../utils/date.js";
import {
  getLCustomerByPhone,
  handleLCustomerAction,
  updateLCustomer,
} from "../../loyalty/customer/customer.service.js";
import { processActionWebhook } from "../../external/v1/loyalty/action/internal-copy/actions/actions.service.js";
import { processRedeemWebhook } from "../../external/v1/loyalty/redeem/internal-copy/redeems/redeem.service.js";
import { verifyTemplateMessageLimit } from "../../whatsapp/messageTemplates/wa_templates.auth.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";

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

export async function createScheduleOnShopifyEvent({
  customerPhone,
  event,
  shopifyInfo,
  productIds,
  webhookId,
  scheduleFromDate,
  amount,
  body,
}: {
  customerPhone: string;
  event: ShopifyEvents;
  shopifyInfo: ShopifyIntegration;
  productIds: string[];
  webhookId?: string;
  scheduleFromDate: Date;
  amount?: number;
  body: any;
}) {
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

  if (
    shopifySurvey.isProductSpecific &&
    !productIds.includes(shopifySurvey.productId)
  ) {
    log.trace(`Specified product is not in the list`);
    return;
  }

  const phoneWithoutPlus = phone.countryCallingCode + phone.nationalNumber;
  if (!phoneWithoutPlus) {
    log.trace(`No customer phone number found`);
    return;
  }

  let actionStatus = null;
  if (shopifySurvey.actionId) {
    const customer = await getLCustomerByPhone(
      phoneWithoutPlus,
      shopifyInfo.orgId,
    );
    if (customer) {
      const { success } = await handleLCustomerAction({
        actionId: shopifySurvey.actionId,
        customerId: customer.id,
        amount,
      });
      actionStatus = success ? "success" : "failed";
      if (!customer.active)
        await updateLCustomer(phoneWithoutPlus, shopifyInfo.orgId, {
          active: true,
        });
    }
  }
  let apiStatus = null;
  if (shopifySurvey.loyaltyApiFeature) {
    if (shopifySurvey.loyaltyApiFeature === "action") {
      apiStatus = await processActionWebhook(body, shopifyInfo.orgId);
    } else {
      apiStatus = await processRedeemWebhook(body, shopifyInfo.orgId);
    }
  }

  const schedules = [...shopifySurvey.schedules];
  const scheduleObj = {
    scheduledAt: getScheduleTime(shopifySurvey.timeDelay, scheduleFromDate),
    createdAt: new Date(),
    status: shopifySurvey.waTemplateId ? "SCHEDULED" : null,
  };
  const data = {
    ...scheduleObj,
    phone: phoneWithoutPlus,
    webhookId,
    actionStatus,
    history: [scheduleObj],
    apiStatus,
    body,
  };
  schedules.push(data);
  shopifySurvey.schedules = schedules;
  const newShopifySurveys = [...shopifyInfo.credential.shopifySurveys];
  newShopifySurveys.forEach((s) => {
    if (s.event === shopifySurvey.event) {
      s.schedules = schedules;
    }
  });
  await updateShopifyIntegrationByOrgId(shopifyInfo.orgId, {
    credential: {
      ...shopifyInfo.credential,
      shopifySurveys: newShopifySurveys,
    },
  });
}

export async function sendShopifySurveyCronAction() {
  const currentTime = new Date();
  const fiveMinutesLater = new Date(currentTime.getTime() + 5 * 60000);

  const integrations = (await prisma.integration.findMany({
    where: {
      name: IntegratedApps.shopify,
    },
  })) as unknown as ShopifyIntegration[];

  if (!integrations.length) {
    log.trace("No shopify integration found");
    return;
  }

  for (const integration of integrations) {
    log.trace("integration => %o", integration);
    const {
      credential: { shopifySurveys, session },
      orgId,
    } = integration;

    if (!shopifySurveys || !shopifySurveys.length) {
      log.trace("No config found");
      continue;
    }
    const newShopifySurveys = [...shopifySurveys];
    const callShopifyApi = newShopifySurveys.some(
      (s) =>
        s.event === ShopifyEvents.ABANDONED_CHECKOUTS &&
        s.schedules &&
        s.schedules.some(
          (sch) =>
            sch.status === "SCHEDULED" ||
            (s.repeatInterval.value &&
              dayjs().diff(dayjs(sch.sentAt), s.repeatInterval.unit) >=
                s.repeatInterval.value),
        ),
    );

    let allCheckouts;

    if (callShopifyApi) {
      try {
        const client = new shopify.clients.Graphql({ session });
        allCheckouts = await getAbandonedCheckouts(client);
      } catch (e) {
        log.error("Error getting abandoned checkouts => %o", e);
        continue;
      }
    }

    for (const config of newShopifySurveys) {
      const { event, schedules, repeatInterval, waTemplateId, teamId, active } =
        config;
      if (!schedules || !schedules.length || !active) {
        log.trace("No schedules found");
        continue;
      }
      const newSchedules = [...schedules];
      const isAbandonedEvent = event === ShopifyEvents.ABANDONED_CHECKOUTS;
      if (isAbandonedEvent && !callShopifyApi) continue;
      for (const sch of newSchedules) {
        let tobeSent = false;
        const isCheckoutNotExist =
          isAbandonedEvent &&
          !allCheckouts.find((c) => c.id === sch.checkoutId);
        if (
          sch.status === "SCHEDULED" &&
          new Date(sch.scheduledAt) <= fiveMinutesLater
        ) {
          if (isCheckoutNotExist) {
            sch.status = "CHECKOUT DELETED";
            sch.history.forEach((h) => {
              if (h.scheduledAt === sch.scheduledAt)
                h.status = "CHECKOUT DELETED";
            });
          } else {
            tobeSent = true;
          }
        } else {
          if (isAbandonedEvent && !isCheckoutNotExist) {
            if (
              repeatInterval?.value &&
              dayjs().diff(dayjs(sch.sentAt), repeatInterval?.unit) >=
                repeatInterval?.value
            ) {
              tobeSent = true;
              //add new schedule history and update
              const newSchedule = {
                createdAt: new Date(),
                scheduledAt: new Date(),
                sentAt: null,
                status: null,
              };
              sch.createdAt = newSchedule.createdAt;
              sch.scheduledAt = newSchedule.scheduledAt;
              sch.sentAt = newSchedule.sentAt;
              sch.history = [...sch.history, newSchedule];
            }
          }
        }
        console.log("tobeSent", tobeSent);
        if (tobeSent) {
          try {
            const subscription = await getSubscription(orgId);
            await verifyTemplateMessageLimit(subscription);
            let parameterData = [];
            if (config.variableMapping && sch.body) {
              const bodyParameters = [];
              const sortedMappings = [...config.variableMapping].sort(
                (a, b) => a.templateParamIndex - b.templateParamIndex,
              );
              const maxIndex = Math.max(
                ...sortedMappings.map((m) => m.templateParamIndex),
                -1,
              );

              if (maxIndex !== -1) {
                for (let i = 0; i <= maxIndex; i++) {
                  const mapping = sortedMappings.find(
                    (m) => m.templateParamIndex === i,
                  );
                  const value = mapping
                    ? _get(sch.body, mapping.shopifyPath)
                    : "";
                  bodyParameters.push({
                    type: "text",
                    text: String(value ?? ""),
                  });
                }
                parameterData.push({
                  type: "body",
                  parameters: bodyParameters,
                });
              }
            }

            const res = await sendTemplateToUserCore(
              orgId,
              waTemplateId,
              sch.phone,
              parameterData,
              teamId,
            );
            sch.status = res.status ? "SENT" : `FAILED: ${res.message}`;
            let messageSentAt = null;
            if (res.status) {
              const message = await prisma.waMessage.findFirst({
                where: {
                  messageId: res.message,
                },
              });
              messageSentAt = message.waCreatedAt;
            }
            sch.sentAt = messageSentAt;
            sch.history.forEach((h) => {
              if (h.scheduledAt === sch.scheduledAt) {
                h.status = sch.status;
                h.sentAt = messageSentAt;
              }
            });
          } catch (e) {
            log.error("error sending template => %o", e);
            continue;
          }
        }
      }
      config.schedules = newSchedules;
    }
    try {
      await updateShopifyIntegrationByOrgId(orgId, {
        credential: {
          ...integration.credential,
          shopifySurveys: newShopifySurveys,
        },
      });
    } catch (e) {
      log.error(
        "error updating shopify integration for orgId => %s, error => %o",
        orgId,
        e,
      );
      continue;
    }
  }
}

export async function deleteWebhookById(webhookId, client) {
  await client.request(
    `mutation webhookSubscriptionDelete($id: ID!) {
    webhookSubscriptionDelete(id: $id) {
      userErrors {
        field
        message
      }
      deletedWebhookSubscriptionId
    }
  }`,
    { variables: { id: webhookId } },
  );
}

export async function sendWhatsAppTemplateToCustomer(
  orgId: string,
  phone: string,
  waTemplateId: string,
  teamId: string,
  customerName?: string,
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
    await wait(50);
    const res = await sendMessage(orgId, templateMessage, customerName);
    await updateMonthlyStat(
      SubscriptionFeaturePathName.WhatsAppTemplate,
      orgId,
    );
    return res;
  } catch (e) {
    console.error(e);
    // log.error(e);
    return false;
  }
}

export async function deleteAllWebhooks(session) {
  const client = new shopify.clients.Graphql({ session });
  const webhookslist = await getManagableWebhooks(client);
  await Promise.all(
    webhookslist.map(async (webhook) => {
      await deleteWebhookById(webhook.id, client);
    }),
  );
}

export async function registerWebhookByTopic(topic, session) {
  const client = new shopify.clients.Graphql({ session });
  await client.request(
    `mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
  webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
    webhookSubscription {
      id
      topic
      format
      endpoint {
        __typename
        ... on WebhookHttpEndpoint {
          callbackUrl
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}`,
    {
      variables: {
        topic,
        webhookSubscription: {
          callbackUrl: `${API_URL}${WEBHOOK_API_ROUTE}`,
          format: "JSON",
        },
      },
    },
  );
}

export async function getManagableWebhooks(client) {
  const webhookslist = [];
  let hasNextPage = true;
  let cursor = null;
  while (hasNextPage) {
    const data = await client.request(
      `query getWebhooks($topics: [WebhookSubscriptionTopic!], $cursor: String){
      webhookSubscriptions(first: 50,after: $cursor, topics:$topics,) {
      edges {
        node {
          id
          topic
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    } 
    }`,
      {
        variables: {
          topics: ShopifyOrderWebhookTopicEventMap.map((t) => t.key),
          cursor,
        },
      },
    );
    hasNextPage = data.data.webhookSubscriptions.pageInfo.hasNextPage;
    cursor = data.data.webhookSubscriptions.pageInfo.endCursor;
    webhookslist.push(
      ...data.data.webhookSubscriptions.edges.map((e) => e.node),
    );
  }
  return webhookslist;
}

export async function handleSubscriptionUpdateFromShopify(shop, payload) {
  const integration = await getShopifyIntegrationByShop(shop);
  const subscription = await getSubscription(integration.orgId);
  let rateupPlan;
  if (payload?.app_subscription?.name === "FREE PLAN") {
    rateupPlan = await prisma.rateupPlan.findFirst({
      where: {
        name: "FREE PLAN",
      },
    });
  } else {
    rateupPlan = await prisma.rateupPlan.findFirst({
      where: {
        displayName: payload?.app_subscription?.name,
        name: {
          contains: "WhatsApp",
        },
      },
    });
  }

  const currentPlanInRateup = subscription.basePlan.displayName;
  const chargeId = payload.app_subscription?.admin_graphql_api_id;

  const client = new shopify.clients.Graphql({
    session: integration.credential.session,
  });
  const recurringCharge = await getRecurringCharge(chargeId, integration);

  let haltSubscription = false;

  const data = await client.request(`query { shop { name, email, phone } }`);
  const shopDetails = data.data.shop;

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
  const data = {
    name: recurringCharge.name,
    createdById: integration.org.ownerId,
    orgId: integration.orgId,
    rateupPlanId: rateupPlan.id,
    subscriptionStatus:
      shopifyRecurringChargeSubscriptionStatusMap[recurringCharge.status],
    subscriptionChargeAt: recurringCharge.currentPeriodEnd
      ? new Date(recurringCharge.currentPeriodEnd)
      : null,
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
  if (recurringCharge.name !== "FREE PLAN") {
    const payment = await prisma.payments.create({
      data: {
        payId: chargeId,
        amount: Number(
          recurringCharge?.lineItems[0].plan.pricingDetails.price.amount,
        ),
        currency:
          recurringCharge?.lineItems[0].plan.pricingDetails.price.currencyCode,
        method: PaymentSource.Shopify,
        description: "Subscription activated through shopify",
        customer_email: shopDetails.email || "",
        customer_phone: shopDetails.phone || "",
        rateupOrderId: order.id,
        createdAt: Math.floor(
          new Date(recurringCharge.createdAt).getTime() / 1000,
        ),
      },
    });
  }
  const expiresAt = dayjs(recurringCharge.createdAt).add(29, "days").toDate();
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
      paymentStatus:
        recurringCharge.name === "FREE PLAN"
          ? undefined
          : PaymentStatus.SUCCESS,
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
    case ShopifyEvents.DRAFT_ORDERS_CREATE:
    case ShopifyEvents.ORDERS_CREATE:
    case ShopifyEvents.ORDERS_CANCELLED:
    case ShopifyEvents.ORDERS_PAID:
    case ShopifyEvents.ORDERS_PARTIALLY_FULFILLED:
    case ShopifyEvents.ORDERS_FULFILLED:
    case ShopifyEvents.FULFILLMENT_ORDERS_CANCELLED:
      await handleShopifyOrderEvents(webhook);
      break;
    case ShopifyEvents.APP_UNINSTALLED:
      await handleShopifyAppUnistalled(webhook);
      break;
  }
}

export async function getRecurringCharge(chargeId, integration) {
  if (!integration) return null;
  const client = new shopify.clients.Graphql({
    session: integration.credential.session,
  });
  const appSubscriptions = await client.request(
    `query GetRecurringApplicationCharges($id: ID!) {
      node(id: $id) {
        ...on AppSubscription {
          createdAt
          currentPeriodEnd
          id
          name
          status
          lineItems {
            plan {
              pricingDetails {
                ...on AppRecurringPricing {
                  interval
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }`,
    { variables: { id: chargeId } },
  );
  return appSubscriptions.data.node;
}

export async function handleShopifyOrderEvents(webhook) {
  const { webhookId, body, shop, topic } = webhook;
  const shopifyInfo = await getShopifyIntegrationByShop(shop);
  if (!shopifyInfo) {
    log.trace(`No shopify session found`);
    return;
  }
  let customerPhone;
  const productIds = [];
  if (topic === ShopifyEvents.FULFILLMENT_ORDERS_CANCELLED) {
    const fulfillmentOrderGId = body.fulfillment_order.id;
    const client = new shopify.clients.Graphql({
      session: shopifyInfo.credential.session,
    });
    let hasNextPage = false;
    let cursor = null;
    while (hasNextPage) {
      const data = await client.request(
        `query FulfillmentOrderShow($id: ID!, $cursor: String) {
        fulfillmentOrder(id: $id) {
          order {
            customer {
              phone
            }
          }
          lineItems(first: 10, after: $cursor) {
            edges {
              node {
                lineItem {
                  product {
                    id
                  }
                }  
              }
            }
            pageInfo {
            hasNextPage
            endCursor
            }
          }
        }
      }`,
        { variables: { id: fulfillmentOrderGId, cursor } },
      );
      hasNextPage = data.data.fulfillmentOrder.pageInfo.hasNextPage;
      cursor = data.data.fulfillmentOrder.pageInfo.endCursor;
      productIds.push(
        ...data.data.fulfillmentOrder.lineItems.map(
          (item) => item.lineItem.product.id,
        ),
      );
      customerPhone = data.data.fulfillmentOrder.order.cutsomer.phone;
    }
  } else {
    customerPhone =
      body?.customer?.phone ||
      body?.customer?.default_address?.phone ||
      body?.billing_address?.phone ||
      webhook.body?.shipping_address?.phone;
    productIds.push(
      ...body.line_items?.map(
        (product) => `gid://shopify/Product/${product.product_id}`,
      ),
    );
  }
  if (!customerPhone) {
    log.trace("No cutsomer phone number found");
    return;
  }
  await createScheduleOnShopifyEvent({
    customerPhone,
    event: topic,
    shopifyInfo,
    productIds,
    webhookId,
    scheduleFromDate: new Date(),
    amount: Number(body?.total_price),
    body,
  });
}

export async function handleShopifyAppUnistalled(webhook) {
  const { shop } = webhook;
  const shopifyInfo = await getShopifyIntegrationByShop(shop);
  if (!shopifyInfo) return;
  if (dayjs(shopifyInfo.org.createdAt).isBefore(dayjs(shopifyInfo.createdAt)))
    await updateShopifyIntegrationByShop(shop, { active: false });
  else {
    await pauseOrg(shopifyInfo.orgId, { isPaused: true });
  }
}

export async function deleteShopifyIntegrationByShop(shop: string) {
  await prisma.integration.deleteMany({
    where: {
      credential: {
        path: ["session", "shop"],
        equals: shop,
      },
    },
  });
}

export async function getAbandonedCheckouts(client: GraphqlClient) {
  const allCheckouts = [];
  let hasNextPage = true;
  let cursor = null;
  while (hasNextPage) {
    const data = await client.request(
      `query getAbandonedCheckouts($cursor: String) {
      abandonedCheckouts(first: 50, after: $cursor){
      edges {
       nodes {
         id
         createdAt
         completedAt
       }
       cursor
      }
      pageInfo {
       endCursor
       hasNextPage
      }
      }
  }`,
      { variables: { cursor } },
    );
    hasNextPage = data.data.abandonedCheckouts.pageInfo.hasNextPage;
    cursor = data.data.abandonedCheckouts.pageInfo.endCursor;
    allCheckouts.push(
      ...data.data.abandonedCheckouts.nodes.filter((a) => !a.completedAt),
    );
  }
  return allCheckouts;
}

export async function sendTemplateForShopifyAbandonedCheckouts() {
  try {
    const integrations = (await prisma.integration.findMany({
      where: {
        name: IntegratedApps.shopify,
      },
    })) as unknown as ShopifyIntegration[];

    await Promise.all(
      integrations.map(async (integration) => {
        const { orgId, credential } = integration;
        const abandonedCheckoutConfig = credential.shopifySurveys.find(
          (s) => s.event === ShopifyEvents.ABANDONED_CHECKOUTS,
        );
        if (!abandonedCheckoutConfig) {
          log.trace("No abandoned checkout template config found");
          return false;
        }
        const { waTemplateId, teamId } = abandonedCheckoutConfig;
        const client = new shopify.clients.Graphql({
          session: credential.session,
        });
        const allCheckouts = await getAbandonedCheckouts(client);

        if (!allCheckouts || !allCheckouts.length) {
          log.trace("No abandoned checkouts found");
          return false;
        }
        //checkouts created within one hour
        const lastCheckouts = allCheckouts.filter(
          (checkout) => dayjs().diff(checkout.createdAt, "hours") < 1,
        );

        if (!lastCheckouts.length) {
          log.trace("No recent checkouts ");
          if (!abandonedCheckoutConfig.repeatInterval.value) return false;
        }

        let sentNowCheckoutList: Array<{ phone: string; checkoutId: string }> =
          [];

        const {
          timeDelay,
          schedules = [],
          repeatInterval,
        } = abandonedCheckoutConfig;
        const shopifySurveys = [...credential.shopifySurveys];

        lastCheckouts.map(async (checkout) => {
          const phone = validateAndParseCheckoutPhone(checkout);

          if (!phone) {
            log.trace("invalid phone number");
            return false;
          }
          if (timeDelay) {
            const scheduledTime = getScheduleTime(
              timeDelay,
              checkout.created_at,
            );
            const schedule = {
              status: "SCHEDULED",
              createdAt: new Date(),
              scheduledAt: scheduledTime,
            };
            schedules.push({
              ...schedule,
              history: [schedule],
              phone,
              checkoutId: checkout.id.toString(),
            });
          } else {
            sentNowCheckoutList.push({
              phone,
              checkoutId: checkout.id.toString(),
            });
          }
        });
        if (repeatInterval?.value) {
          allCheckouts
            .filter((checkout) =>
              schedules.find(
                (c) =>
                  checkout.id === c.checkoutId &&
                  dayjs().diff(dayjs(c.sentAt), repeatInterval?.unit) >=
                    repeatInterval?.value,
              ),
            )
            .map((checkout) => {
              const phone = validateAndParseCheckoutPhone(checkout);
              if (phone)
                sentNowCheckoutList.push({
                  phone,
                  checkoutId: checkout.id.toString(),
                });
            });
        }
        const subscription = await getSubscription(orgId);
        sentNowCheckoutList.map(async (checkout) => {
          await verifyTemplateMessageLimit(subscription);
          const res = await sendTemplateToUserCore(
            orgId,
            waTemplateId,
            checkout.phone,
            [],
            teamId,
          );

          let messageSentAt = new Date();
          if (res.status) {
            const message = await prisma.waMessage.findFirst({
              where: {
                messageId: res.message,
              },
            });
            messageSentAt = message.waCreatedAt;
          }
          const schedule = {
            status: res.status ? "SENT" : `FAILED: ${res.message}`,
            createdAt: messageSentAt,
            scheduledAt: messageSentAt,
            sentAt: res.status ? messageSentAt : null,
          };
          let index;
          const existingSchedule = schedules.find((s, i) => {
            if (s.checkoutId === checkout.checkoutId) {
              index = i;
              return s;
            }
          });
          if (existingSchedule) {
            const history = existingSchedule.history ?? [];
            history.push(schedule);
            schedules[index] = {
              ...schedule,
              phone: checkout.phone,
              history,
            };
          } else {
            schedules.push({
              ...schedule,
              history: [schedule],
              phone: checkout.phone,
              checkoutId: checkout.checkoutId,
            });
          }
        });

        shopifySurveys.forEach((s) => {
          if (s.event === ShopifyEvents.ABANDONED_CHECKOUTS)
            s.schedules = schedules;
        });

        const resp1 = await updateShopifyIntegrationByOrgId(orgId, {
          credential: { ...credential, shopifySurveys },
        });
      }),
    );
  } catch (e) {
    log.error(e);
  }
}

function validateAndParseCheckoutPhone(checkout) {
  const phoneNumber =
    checkout.phone ||
    checkout.customer.phone ||
    checkout.customer.default_address.phone ||
    checkout.billing_address.phone;
  if (!phoneNumber) {
    log.trace("No Phone Number found");
    return false;
  }
  const phone = parsePhoneNumber(phoneNumber, "IN");
  if (phone.isValid() === false) {
    log.trace("Invalid Phone number");
    return false;
  }
  return phone.number;
}
