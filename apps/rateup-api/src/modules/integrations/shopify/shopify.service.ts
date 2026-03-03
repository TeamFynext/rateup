import prisma from "../../../utils/prisma.js";
import shopify from "./shopify.config.js";
import { GraphqlClient, Session, DataType } from "@shopify/shopify-api";
import isEmpty from "lodash/isEmpty.js";
import baseRedis, {
  shopifySurveyQueue,
} from "../../../utils/redisConnection.js";
import crypto from "crypto";
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
import { verifyTemplateMessageLimit } from "../../whatsapp/messageTemplates/wa_templates.auth.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { getLCustomerByPhone } from "../../loyalty/accounts/account.service.js";

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
  log.info("Checking survey for shopify event %o", {
    event,
    webhookId,
    customerPhone,
  });
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
    webhookId &&
    shopifySurvey.schedules?.some((s) => s.webhookId === webhookId)
  ) {
    log.trace(`Duplicate webhook event for ${webhookId}. Skipping...`);
    return;
  }

  // Cross-event dedup: Shopify fires both orders/create and orders/paid for the
  // same order. If another survey (different event) already scheduled the same
  // template for the same order ID + customer phone, skip this one.
  const orderId = body?.id;

  if (orderId && shopifySurvey.waTemplateId) {
    const phoneWithoutPlusTemp =
      phone.countryCallingCode + phone.nationalNumber;

    // We must reload shopifyInfo fresh from the DB to see if the other worker created a history
    const freshShopifyInfo = await prisma.integration.findUnique({
      where: { id: shopifyInfo.id },
    });
    const freshSurveys =
      (freshShopifyInfo?.credential as any)?.shopifySurveys ?? [];

    const isDuplicateMessage = freshSurveys.some(
      (survey: any) =>
        survey.waTemplateId === shopifySurvey.waTemplateId &&
        survey.schedules?.some(
          (sch: any) =>
            sch.body?.id === orderId && sch.phone === phoneWithoutPlusTemp,
        ),
    );
    if (isDuplicateMessage) {
      log.trace(
        `Order ${orderId} already scheduled with template ${shopifySurvey.waTemplateId} for ${customerPhone}. Skipping duplicate execution of ${event}...`,
      );
      return;
    }
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

  const schedules = [...shopifySurvey.schedules];
  let actionStatus = null;
  let apiStatus = null;

  const scheduleId = crypto.randomUUID();
  const scheduledTime = getScheduleTime(
    shopifySurvey.timeDelay,
    scheduleFromDate,
  );
  const scheduleObj = {
    scheduleId,
    scheduledAt: scheduledTime,
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

  if (shopifySurvey.waTemplateId) {
    const delayMs = Math.max(0, scheduledTime.getTime() - Date.now());
    await shopifySurveyQueue.add(
      "process-survey",
      {
        orgId: shopifyInfo.orgId,
        integrationId: shopifyInfo.id,
        event: shopifySurvey.event,
        scheduleId,
      },
      { delay: delayMs, jobId: scheduleId },
    );
    log.info(`Enqueued Shopify survey ${scheduleId} to send in ${delayMs}ms`);
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
      if (!isAbandonedEvent) continue;
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

export async function processShopifySurveySchedule(jobData: {
  orgId: string;
  integrationId: string;
  event: ShopifyEvents;
  scheduleId: string;
}) {
  const { orgId, integrationId, event, scheduleId } = jobData;

  const integration = (await prisma.integration.findUnique({
    where: { id: integrationId },
  })) as unknown as ShopifyIntegration;

  if (!integration) {
    log.error(
      `Integration ${integrationId} not found for schedule ${scheduleId}`,
    );
    return;
  }

  const shopifySurveys = integration.credential?.shopifySurveys;
  if (!shopifySurveys || !shopifySurveys.length) {
    log.trace("No surveys found");
    return;
  }

  const surveyIndex = shopifySurveys.findIndex((s) => s.event === event);
  if (surveyIndex === -1) {
    log.trace(`Survey for event ${event} not found`);
    return;
  }

  const survey = shopifySurveys[surveyIndex];
  if (!survey.active || !survey.schedules) {
    log.trace(`Survey ${event} not active or no schedules`);
    return;
  }

  const scheduleIndex = survey.schedules.findIndex(
    (s) => (s as any).scheduleId === scheduleId,
  );
  if (scheduleIndex === -1) {
    log.trace(`Schedule ${scheduleId} not found in survey ${event} `);
    return;
  }

  const sch = survey.schedules[scheduleIndex] as any;

  if (sch.status !== "SCHEDULED") {
    log.info(
      `Schedule ${scheduleId} is already processed with status ${sch.status}.Skipping.`,
    );
    return;
  }

  try {
    const subscription = await getSubscription(orgId);
    await verifyTemplateMessageLimit(subscription);

    let parameterData = [];
    if (survey.variableMapping && sch.body) {
      const bodyParameters = [];
      const sortedMappings = [...survey.variableMapping].sort(
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
          const value = mapping ? _get(sch.body, mapping.shopifyPath) : "";
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
      survey.waTemplateId,
      sch.phone,
      parameterData,
      survey.teamId,
    );
    sch.status = res.status ? "SENT" : `FAILED: ${res.message} `;
    let messageSentAt = null;
    if (res.status) {
      const message = await prisma.waMessage.findFirst({
        where: { messageId: res.message },
      });
      messageSentAt = message?.waCreatedAt || new Date();
    }
    sch.sentAt = messageSentAt;
    sch.history.forEach((h: any) => {
      if (
        h.scheduleId === sch.scheduleId ||
        h.scheduledAt === sch.scheduledAt
      ) {
        h.status = sch.status;
        h.sentAt = messageSentAt;
      }
    });

    log.info(
      `Successfully processed schedule ${scheduleId}: status ${sch.status} `,
    );
  } catch (e: any) {
    log.error({ e }, `Error sending template for schedule ${scheduleId}`);
    sch.status = `FAILED: ${e.message} `;
    sch.history.forEach((h: any) => {
      if (
        h.scheduleId === sch.scheduleId ||
        h.scheduledAt === sch.scheduledAt
      ) {
        h.status = sch.status;
      }
    });
  }

  survey.schedules[scheduleIndex] = sch;
  shopifySurveys[surveyIndex] = survey;

  try {
    await updateShopifyIntegrationByOrgId(orgId, {
      credential: {
        ...integration.credential,
        shopifySurveys,
      },
    });
  } catch (e) {
    log.error(
      { e },
      `error updating shopify integration for orgId => ${orgId}`,
    );
  }
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
    const res = await sendMessage(
      orgId,
      templateMessage,
      customerName,
      undefined,
      undefined,
      undefined,
      undefined,
      teamId,
      "TEMPLATE",
    );
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
} `,
    {
      variables: {
        topic,
        webhookSubscription: {
          callbackUrl: `${API_URL}${WEBHOOK_API_ROUTE} `,
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
  webhookSubscriptions(first: 50, after: $cursor, topics: $topics,) {
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
} `,
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

  const data = await client.request(`query { shop { name, email, phone } } `);
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
} `,
    { variables: { id: chargeId } },
  );
  return appSubscriptions.data.node;
}

export async function handleShopifyOrderEvents(webhook) {
  const { webhookId, body, shop, topic } = webhook;
  log.info("Handling Shopify Order Event: %o", { shop, topic, webhookId });
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
} `,
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
      webhook.body?.shipping_address?.phone ||
      body?.phone;
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

/**
 * Resolves WhatsApp catalog retailer_ids (used as Shopify SKUs) to numeric
 * Shopify variant IDs and builds a valid cart permalink URL.
 * Format: https://<shop>/cart/<variantId1>:<qty1>,<variantId2>:<qty2>
 *
 * Lookup strategy:
 *   1. Primary:  match by Shopify variant SKU == retailerId
 *   2. Fallback: match by Shopify product title (case-insensitive) == title field
 */
export async function resolveShopifyVariants(
  products: { retailerId: string; quantity: number; title?: string }[],
  client: any,
): Promise<Map<string, string>> {
  // retailerId → numeric Shopify variant id
  const variantMap = new Map<string, string>();

  // ── Step 0: Validate numeric IDs against Shopify ─────────────────────────
  // If retailer_id is all digits it's likely a Shopify variant ID, but we
  // must verify it still exists — the product may have been deleted/recreated
  // giving it a new ID while the old ID stays in the Meta catalog.
  const numericProducts = products.filter((p) => /^\d+$/.test(p.retailerId));
  const needsLookup: typeof products = products.filter(
    (p) => !/^\d+$/.test(p.retailerId),
  );

  if (numericProducts.length > 0) {
    try {
      const ids = numericProducts.map(
        (p) => `gid://shopify/ProductVariant/${p.retailerId}`,
      );
      const nodesData = await client.request(
        `query validateVariants($ids: [ID!]!) {
          nodes(ids: $ids) {
            id
            ... on ProductVariant {
              __typename
            }
          }
        }`,
        { variables: { ids } },
      );
      const nodes: any[] = (nodesData.data as any)?.nodes ?? [];
      for (const product of numericProducts) {
        const gid = `gid://shopify/ProductVariant/${product.retailerId}`;
        const node = nodes.find((n: any) => n?.id === gid);
        if (node?.__typename === "ProductVariant") {
          // Still valid — use directly
          variantMap.set(product.retailerId, product.retailerId);
        } else {
          // Stale ID — fall through to title-based lookup
          log.warn(
            "Numeric retailer_id '%s' no longer exists in Shopify — falling back to title lookup",
            product.retailerId,
          );
          needsLookup.push(product);
        }
      }
    } catch (e) {
      log.warn("Variant validation failed, using numeric IDs as-is => %o", e);
      // If validation itself fails, assume they're valid to avoid breaking the flow
      for (const p of numericProducts) {
        variantMap.set(p.retailerId, p.retailerId);
      }
    }
  }

  // ── Step 1: SKU-based lookup (non-numeric retailer_ids only) ─────────────
  const lookupSkus = needsLookup.map((p) => p.retailerId).filter(Boolean);
  if (lookupSkus.length > 0) {
    // Wrap each SKU in quotes to handle spaces and special characters
    const skuQuery = lookupSkus.map((sku) => `sku:"${sku}"`).join(" OR ");
    try {
      const variantsData = await client.request(
        `query getVariantsBySkus($query: String!) {
          productVariants(first: 250, query: $query) {
            edges {
              node {
                id
                sku
              }
            }
          }
        }`,
        { variables: { query: skuQuery } },
      );
      const skuEdges = variantsData.data.productVariants.edges;
      skuEdges.forEach((edge: any) => {
        // GID format: gid://shopify/ProductVariant/12345678
        const numericId = edge.node.id.split("/").pop();
        variantMap.set(edge.node.sku, numericId);
      });
    } catch (e) {
      log.error("Error fetching Shopify variants by SKU => %o", e);
      return variantMap;
    }
  }

  // ── Step 2: Title-based fallback for any product not matched by SKU ──────
  const notFoundBySku = needsLookup.filter(
    (p) => !variantMap.has(p.retailerId) && p.title,
  );
  if (notFoundBySku.length > 0) {
    const titleQuery = notFoundBySku
      .map((p) => `title:"${p.title}"`)
      .join(" OR ");
    try {
      const productsData = await client.request(
        `query getProductsByTitle($query: String!) {
          products(first: 50, query: $query) {
            edges {
              node {
                title
                variants(first: 1) {
                  edges {
                    node { id sku }
                  }
                }
              }
            }
          }
        }`,
        { variables: { query: titleQuery } },
      );
      const titleEdges = productsData.data.products.edges;
      titleEdges.forEach((edge: any) => {
        const shopifyTitle: string = edge.node.title?.toLowerCase().trim();
        const numericId: string | undefined =
          edge.node.variants.edges[0]?.node?.id?.split("/").pop();
        if (!numericId) return;
        // Find the local product whose title or retailerId matches
        const matched = notFoundBySku.find(
          (p) =>
            p.title?.toLowerCase().trim() === shopifyTitle ||
            p.retailerId?.toLowerCase().trim() === shopifyTitle,
        );
        if (matched) {
          log.trace(
            "Matched Shopify product '%s' via title fallback for retailerId '%s'",
            edge.node.title,
            matched.retailerId,
          );
          variantMap.set(matched.retailerId, numericId);
        }
      });
    } catch (e) {
      log.warn("Title-based Shopify product lookup failed => %o", e);
    }
  }

  // ── Step 3: Broad partial-word search as last resort ─────────────────────
  // Steps 1 & 2 use exact matches. Step 3 uses the first 3 significant words
  // of the title as unquoted keywords (Shopify "contains all words" search),
  // which handles apostrophe/encoding differences or slight title mismatches.
  const notFoundAfterTitle = needsLookup.filter(
    (p) => !variantMap.has(p.retailerId),
  );
  if (notFoundAfterTitle.length > 0) {
    for (const product of notFoundAfterTitle) {
      const words = (product.title ?? product.retailerId)
        .replace(/['"]/g, "") // strip apostrophes/quotes that break query
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .join(" ");
      try {
        const broadData = await client.request(
          `query broadSearch($query: String!) {
            products(first: 10, query: $query) {
              edges {
                node {
                  title
                  handle
                  variants(first: 5) {
                    edges {
                      node { id sku }
                    }
                  }
                }
              }
            }
          }`,
          { variables: { query: words } },
        );
        const broadEdges = broadData.data.products.edges;
        if (broadEdges.length > 0) {
          // Take the first variant of the best-matching product
          const firstVariantId: string | undefined =
            broadEdges[0]?.node?.variants?.edges[0]?.node?.id?.split("/").pop();
          if (firstVariantId) {
            variantMap.set(product.retailerId, firstVariantId);
          }
        }
      } catch (e) {
        log.warn("Broad Shopify product search failed => %o", e);
      }
    }
  }

  return variantMap;
}

export async function createShopifyPendingOrder(
  orgId: string,
  products: { retailerId: string; quantity: number; title?: string }[],
  customerPhone?: string,
) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    log.trace(
      "Shopify integration not active for orgId %s. Will not create an order.",
      orgId,
    );
    return null;
  }

  const client = new shopify.clients.Graphql({
    session: shopifyInfo.credential.session,
  });

  const variantMap = await resolveShopifyVariants(products, client);
  const lineItems = [];
  for (const product of products) {
    const variantId = variantMap.get(product.retailerId);
    if (variantId) {
      lineItems.push({
        variant_id: parseInt(variantId),
        quantity: product.quantity,
      });
    } else {
      log.warn(`Product SKU ${product.retailerId} not found in Shopify.`);
    }
  }

  if (lineItems.length === 0) {
    log.trace(
      "No products matched in Shopify, skipping Shopify order creation.",
    );
    return null;
  }

  const restClient = new shopify.clients.Rest({
    session: shopifyInfo.credential.session,
  });

  try {
    const response: any = await restClient.post({
      path: "orders",
      type: DataType.JSON,
      data: {
        order: {
          line_items: lineItems,
          financial_status: "pending",
          ...(customerPhone && {
            phone: customerPhone.startsWith("+")
              ? customerPhone
              : `+${customerPhone}`,
          }),
        },
      },
    });
    return response.body.order;
  } catch (error: any) {
    log.error(
      "Failed to create pending order in Shopify => %o",
      error.response?.body || error,
    );
    return null;
  }
}

export async function captureShopifyOrderPayment(
  orgId: string,
  orderId: string,
  amount: number,
) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    log.trace("Shopify integration not active. Cannot capture payment.");
    return false;
  }

  const restClient = new shopify.clients.Rest({
    session: shopifyInfo.credential.session,
  });

  try {
    const response: any = await restClient.post({
      path: `orders/${orderId}/transactions`,
      type: DataType.JSON,
      data: {
        transaction: {
          kind: "sale",
          status: "success",
          amount: (amount / 100).toFixed(2), // Assumes the amount is in smallest currency unit (paise)
          source: "external",
        },
      },
    });
    log.info("Successfully captured payment for Shopify Order %s", orderId);
    return response.body.transaction;
  } catch (error: any) {
    log.error(
      "Failed to capture payment for Shopify Order %s => %o",
      orderId,
      error.response?.body || error,
    );
    return false;
  }
}

export async function buildShopifyCartUrl(
  orgId: string,
  products: { retailerId: string; quantity: number; title?: string }[],
): Promise<string | null> {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    log.warn("Shopify integration not active for orgId %s", orgId);
    return null;
  }

  const shop = shopifyInfo.credential?.session?.shop;
  if (!shop) {
    log.warn("Shopify shop domain not found for orgId %s", orgId);
    return null;
  }

  const client = new shopify.clients.Graphql({
    session: shopifyInfo.credential.session,
  });

  const variantMap = await resolveShopifyVariants(products, client);

  // ── Build cart URL ────────────────────────────────────────────────────────
  const cartParts: string[] = [];
  for (const product of products) {
    const numericVariantId = variantMap.get(product.retailerId);
    if (numericVariantId) {
      cartParts.push(`${numericVariantId}:${product.quantity}`);
    } else {
      log.warn(
        "Shopify variant not found for retailerId '%s' (title: '%s') — skipping",
        product.retailerId,
        product.title ?? "N/A",
      );
    }
  }

  if (cartParts.length === 0) {
    log.warn("No Shopify variants matched for orgId %s", orgId);
    return null;
  }

  return `https://${shop}/cart/${cartParts.join(",")}`;
}
export async function createShopifyDraftOrder(orgId: string, products: any[]) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    throw new Error("Shopify integration not active");
  }

  const client = new shopify.clients.Graphql({
    session: shopifyInfo.credential.session,
  });

  const skus = products.map((p) => p.retailerId).filter(Boolean);
  const variantMap = new Map<string, string>();

  if (skus.length > 0) {
    const skuQuery = skus.map((sku) => `sku:${sku}`).join(" OR ");
    const variantsData = await client.request(
      `query getVariantsBySkus($query: String!) {
          productVariants(first: 250, query: $query) {
            edges {
              node {
                id
                sku
              }
            }
          }
        }`,
      { variables: { query: skuQuery } },
    );

    variantsData.data.productVariants.edges.forEach((edge: any) => {
      variantMap.set(edge.node.sku, edge.node.id);
    });
  }

  const lineItems = [];
  for (const product of products) {
    const variantId = variantMap.get(product.retailerId);
    if (variantId) {
      lineItems.push({
        variantId,
        quantity: product.quantity,
      });
    } else {
      log.warn(`Product SKU ${product.retailerId} not found in Shopify`);
    }
  }

  if (lineItems.length === 0) {
    throw new Error("No products matched in Shopify");
  }

  const draftOrderData = await client.request(
    `mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          invoiceUrl
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        input: {
          lineItems,
        },
      },
    },
  );

  const userErrors = draftOrderData.data.draftOrderCreate.userErrors;
  if (userErrors.length > 0) {
    throw new Error(`Shopify Error: ${userErrors?.[0]?.message}`);
  }

  return draftOrderData.data.draftOrderCreate.draftOrder;
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

/**
 * Creates a new product in the merchant's Shopify store.
 * Uses the new productCreate (2024-01+) API with ProductCreateInput.
 * Price is set via a follow-up productVariantsBulkUpdate since variants
 * are auto-created in the new product model.
 */
export async function createShopifyProduct(
  orgId: string,
  data: {
    title: string;
    description: string;
    brand: string;
    price: number;
    currencyCode: string;
    imageUrl?: string;
  },
) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo?.active) {
    throw new Error("Shopify integration not active for this org");
  }

  const client = new shopify.clients.Graphql({
    session: shopifyInfo.credential.session,
  });

  // ── Step 1: Create the product ──────────────────────────────────────────
  const createMutation = `
    mutation productCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
      productCreate(product: $product, media: $media) {
        product {
          id
          title
          variants(first: 1) {
            nodes {
              id
              price
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const createVariables: Record<string, any> = {
    product: {
      title: data.title,
      descriptionHtml: data.description,
      vendor: data.brand,
      status: "ACTIVE",
    },
  };

  if (data.imageUrl) {
    createVariables.media = [
      {
        originalSource: data.imageUrl,
        mediaContentType: "IMAGE",
      },
    ];
  }

  const createResponse = await client.request(createMutation, {
    variables: createVariables,
  });
  const createResult = (createResponse.data as any)?.productCreate;

  if (createResult?.userErrors?.length > 0) {
    throw new Error(createResult.userErrors[0].message);
  }

  const product = createResult?.product;
  const variantId = product?.variants?.nodes?.[0]?.id;

  // ── Step 2: Set the price on the default variant ───────────────────────
  if (variantId) {
    const priceMutation = `
      mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants {
            id
            price
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    await client.request(priceMutation, {
      variables: {
        productId: product.id,
        variants: [
          {
            id: variantId,
            price: String(parseFloat(String(data.price)).toFixed(2)),
          },
        ],
      },
    });
  }

  return product;
}
