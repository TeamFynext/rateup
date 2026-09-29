import prisma from "../../../utils/prisma.js";
import { TriggerEvent } from "../../../../generated/prisma/enums.js";
import shopify from "./shopify.config.js";
import {
  type CheckoutWebhookBody,
  type CustomerRedactBody,
  handleCheckoutDeleted,
  handleCheckoutWebhook,
  markCheckoutRecovered,
  redactShopifyCustomer,
  redactShopifyShop,
} from "./shopify.checkouts.service.js";
import { getActiveShopifySession } from "./shopify.session.js";
import { GraphqlClient, GraphQLClientResponse, Session } from "@shopify/shopify-api";
import type { IncomingMessage, ServerResponse } from "http";
import type { FastifyReply, FastifyRequest } from "fastify";
import { notificationQueue, shopifySurveyQueue } from "../../../workers/bullmq/queues/index.js";
import crypto from "crypto";
import _get from "lodash/get.js";
import { log } from "../../../utils/logger.js";
import { sendMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service.js";
import {
  convertComponentForSenting,
  updateButtonText,
  wait,
} from "../../whatsapp/whatsappSurvey/wasurvey.controller.js";
import { updateMonthlyStat } from "../../stats/stats.service.js";
import { checkAndExecuteRuleByTriggerEvent } from "../../whatsapp/automatedReply/wa_automatedReply.utils.js";
import {
  IntegratedApps,
  ShopifyEvents,
  SubscriptionFeaturePathName,
} from "../../../types/enums.js";
import { createTemplateMessage } from "../../whatsapp/whatsappSurvey/wasurvey.utils.js";
import { getDbTemplate } from "../../whatsapp/messageTemplates/wa_templates.service.js";
import { getFlowIdFromTemplateComponents } from "../../whatsapp/messageTemplates/wa_templates.utils.js";
import { parsePhoneNumber } from "libphonenumber-js";
import {
  PaymentSource,
  ShopifyOrderWebhookTopicEventMap,
  toShopifyProvinceCode,
  ShopifyPlanMap,
  shopifyRecurringChargeStatus,
  shopifyRecurringChargeSubscriptionStatusMap,
} from "./shopify.util.js";
import { getIntegrationByName, updateIntegrationByName } from "../integrations.service.js";
import { UpdateIntgrationInput } from "../integrations.schema.js";
import { API_URL } from "../../../utils/constants/constants.js";
import {
  OrderStatus,
  Org,
  PaymentStatus,
  RateupPlan,
  SubscriptionStatus,
} from "../../../../generated/prisma/client.js";
import { getSubscription } from "../../subscription/subscription.service.js";
import dayjs from "dayjs";
import { createEmailBodySubscriptionActivated } from "../../../utils/email/payments/subscriptionActivated.js";
import { pauseOrg } from "../../org/org.services.js";
import { WEBHOOK_API_ROUTE, defaultWebhookHandlers } from "./shopify.handler.js";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller.js";
import { getScheduleTime } from "../../../utils/date.js";
import {
  enqueueShopifyOrderLoyalty,
  extractDiscountCodes,
  extractPurchaseAmount,
} from "./shopifyLoyalty.service.js";
import { ShopifyBody, shopifyErrorDetail } from "./shopify.types.js";
import { signFlowToken } from "../../whatsapp/flows/flowToken.js";
import type {
  ShopifyDeliveryOptionsData,
  ShopifyFulfillmentCreateData,
  ShopifyFulfillmentOrdersData,
  ShopifyDraftOrderCompleteData,
  ShopifyDraftOrderCreateData,
  ShopifyDraftOrderLookupData,
  ShopifyOrderCreateData,
  ShopifyOrderMarkAsPaidData,
  ShopifyProductImageData,
  ShopifyShippingAddressInput,
  ShopifyUserError,
  ShopifyNodesLookupData,
  ShopifyProductCreateData,
  ShopifyProductsByTitleData,
  ShopifyProductVariantsData,
  ShopifyWebhookBody,
} from "./shopify.types.js";
import { notify } from "../../notification/notify.js";

export async function getShopifyAuthUrl(
  rawRequest: IncomingMessage,
  rawResponse: ServerResponse,
  shop: string,
) {
  if (!shopify) throw new Error("Shopify integration is not configured");
  // sanitizeShop(shop, true) throws on an invalid shop domain (throwOnInvalid),
  // so a null return here only ever means "somehow returned without throwing" —
  // still worth a real guard rather than a non-null assertion.
  const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
  if (!sanitizedShop) throw new Error(`Invalid Shopify shop domain: ${shop}`);
  return await shopify.auth.begin({
    shop: sanitizedShop,
    callbackPath: "/api/public/integrations/shopify/auth/callback",
    isOnline: false,
    rawRequest,
    rawResponse,
  });
}

export async function handleShopifyAuthCallback(request: FastifyRequest, reply: FastifyReply) {
  if (!shopify) throw new Error("Shopify integration is not configured");
  return await shopify.auth.callback({
    // Public apps must use expiring offline tokens from 2027-01-01.
    expiring: true,
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

export async function updateShopifyIntegrationByOrgId(orgId: string, data: UpdateIntgrationInput) {
  return await updateIntegrationByName(orgId, IntegratedApps.shopify, data);
}

export async function updateShopifyIntegrationByShop(
  shop: string,
  // Not the credential: those writes go through updateIntegrationByName, which
  // keeps the stored session intact.
  data: Omit<UpdateIntgrationInput, "credential"> & { orgId?: string },
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

export async function claimUnownedShopifyIntegration(shop: string, orgId: string) {
  return await prisma.integration.updateMany({
    where: {
      credential: {
        path: ["session", "shop"],
        equals: shop,
      },
      orgId: null,
    },
    data: { orgId },
  });
}

/**
 * Subscribes the shop to every per-shop topic it isn't subscribed to yet.
 * App-level topics (uninstall, billing, scopes, compliance) come from
 * shopify.app.toml instead.
 */
export async function registerShopifyWebhook(session: Session) {
  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({ session });
  const registered = new Set((await getManagableWebhooks(client)).map((w) => w.topic));
  // Every missing topic is tried: one the shop's scopes refuse must not block the rest.
  const errors: string[] = [];
  for (const topic of Object.keys(defaultWebhookHandlers)) {
    if (registered.has(topic)) continue;
    try {
      await registerWebhookByTopic(topic, session);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (errors.length) throw new Error(errors.join("; "));
}

/**
 * Daily: subscribes every connected shop to topics added since it installed. Otherwise a
 * new topic reaches only shops whose merchant presses "register webhooks" again.
 */
export async function syncShopifyWebhooks() {
  const integrations = (await prisma.integration.findMany({
    where: { name: IntegratedApps.shopify, active: true },
  })) as unknown as ShopifyIntegration[];
  for (const integration of integrations) {
    if (!integration.credential?.session) continue;
    try {
      await registerShopifyWebhook(await getActiveShopifySession(integration));
    } catch (e) {
      log.error({ err: e, orgId: integration.orgId }, "Shopify webhook sync failed for shop");
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
  // amount,
  body,
}: {
  customerPhone: string;
  event: ShopifyEvents;
  shopifyInfo: ShopifyIntegration;
  productIds: string[];
  webhookId?: string;
  scheduleFromDate: Date;
  // amount?: number;
  body: ShopifyWebhookBody;
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
  const shopifySurvey = shopifyInfo.credential.shopifySurveys?.find((s) => s.event === event);
  if (!shopifySurvey || !shopifySurvey.active) {
    log.trace(`No Survey schedule found`);
    return;
  }

  if (webhookId && shopifySurvey.schedules?.some((s) => s.webhookId === webhookId)) {
    log.trace(`Duplicate webhook event for ${webhookId}. Skipping...`);
    return;
  }

  // Cross-event dedup: Shopify fires both orders/create and orders/paid for the
  // same order. If another survey (different event) already scheduled the same
  // template for the same order ID + customer phone, skip this one.
  const orderId = body?.id;

  if (orderId && shopifySurvey.waTemplateId) {
    // const _phoneWithoutPlusTemp = phone.countryCallingCode + phone.nationalNumber;
    // // We must reload shopifyInfo fresh from the DB to see if the other worker created a history
    // const freshShopifyInfo = await prisma.integration.findUnique({
    //   where: { id: shopifyInfo.id },
    // });
    // const _freshSurveys = (freshShopifyInfo?.credential as any)?.shopifySurveys ?? [];
    // if (isDuplicateMessage) {
    //   log.trace(
    //     `Order ${orderId} already scheduled with template ${shopifySurvey.waTemplateId} for ${customerPhone}. Skipping duplicate execution of ${event}...`,
    //   );
    //   return;
    // }
  }

  if (
    shopifySurvey.isProductSpecific &&
    (!shopifySurvey.productId || !productIds.includes(shopifySurvey.productId))
  ) {
    log.trace(`Specified product is not in the list`);
    return;
  }

  const phoneWithoutPlus = phone.countryCallingCode + phone.nationalNumber;
  if (!phoneWithoutPlus) {
    log.trace(`No customer phone number found`);
    return;
  }

  const schedules = [...(shopifySurvey.schedules || [])];
  let actionStatus: ShopifySchedules["actionStatus"] = null;
  let apiStatus: ShopifySchedules["apiStatus"] = null;

  const scheduleId = crypto.randomUUID();
  const scheduledTime = getScheduleTime(shopifySurvey.timeDelay, scheduleFromDate);
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

export async function deleteWebhookById(webhookId: string, client: GraphqlClient) {
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
    log.error(`Integration ${integrationId} not found for schedule ${scheduleId}`);
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

  const scheduleIndex = survey.schedules.findIndex((s) => s.scheduleId === scheduleId);
  if (scheduleIndex === -1) {
    log.trace(`Schedule ${scheduleId} not found in survey ${event} `);
    return;
  }

  const sch = survey.schedules[scheduleIndex];

  if (sch.status !== "SCHEDULED") {
    log.info(`Schedule ${scheduleId} is already processed with status ${sch.status}.Skipping.`);
    return;
  }

  try {
    let parameterData: { type: string; parameters: { type: string; text: string }[] }[] = [];
    if (survey.variableMapping && sch.body) {
      const bodyParameters: { type: string; text: string }[] = [];
      const sortedMappings = [...survey.variableMapping].sort(
        (a, b) => a.templateParamIndex - b.templateParamIndex,
      );
      const maxIndex = Math.max(...sortedMappings.map((m) => m.templateParamIndex), -1);

      if (maxIndex !== -1) {
        for (let i = 0; i <= maxIndex; i++) {
          const mapping = sortedMappings.find((m) => m.templateParamIndex === i);
          const value = mapping ? resolveShopifyPathValue(sch.body, mapping.shopifyPath) : "";
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
      survey.waTemplateId ?? "",
      sch.phone,
      parameterData,
      survey.teamId,
    );
    // No timeDelay is passed, so only the `message` shape of the union return can
    // come back at runtime.
    if ("message" in res) {
      sch.status = res.status ? "SENT" : `FAILED: ${res.message} `;
      let messageSentAt = new Date();
      if (res.status) {
        const message = await prisma.waMessage.findFirst({
          where: { messageId: res.message },
        });
        messageSentAt = message?.waCreatedAt || new Date();
      }
      sch.sentAt = messageSentAt;
      sch.history.forEach((h) => {
        if (h.scheduleId === sch.scheduleId || h.scheduledAt === sch.scheduledAt) {
          h.status = sch.status;
          h.sentAt = messageSentAt;
        }
      });
    }

    log.info(`Successfully processed schedule ${scheduleId}: status ${sch.status} `);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    log.error({ err: e }, `Error sending template for schedule ${scheduleId}`);
    sch.status = `FAILED: ${errorMessage} `;
    sch.history.forEach((h) => {
      if (h.scheduleId === sch.scheduleId || h.scheduledAt === sch.scheduledAt) {
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
    log.error({ e }, `error updating shopify integration for orgId => ${orgId}`);
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
    const dbTemplate = await getDbTemplate(waTemplateId, orgId);
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
      // Re-checked here (already validated above) so the narrowing holds in
      // this separate `if (flowId)` block too — TS can't otherwise correlate
      // the two blocks since `surveyTeamMap` is a plain `let`.
      if (!surveyTeamMap) {
        throw new Error("SurveyTeamMap not found for flowId " + flowId);
      }
      // adding flow button
      templateComponents.push({
        type: "button",
        sub_type: "flow",
        index: 0,
        parameters: [
          {
            type: "action",
            action: {
              flow_token: signFlowToken({
                surveyTeamMapId: surveyTeamMap.id,
                orgId,
                phone,
                language: surveyTeamMap.survey.languages[0],
              }),
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
    await updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
    return res;
  } catch (e) {
    console.error(e);
    // log.error(e);
    return false;
  }
}

export async function deleteAllWebhooks(session: Session) {
  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({ session });
  const webhookslist = await getManagableWebhooks(client);
  await Promise.all(
    webhookslist.map(async (webhook) => {
      await deleteWebhookById(webhook.id, client);
    }),
  );
}

export async function registerWebhookByTopic(topic: string, session: Session) {
  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({ session });
  const response = await client.request<{
    webhookSubscriptionCreate: { userErrors: { field: string[] | null; message: string }[] };
  }>(
    `mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
  webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
    webhookSubscription {
      id
      topic
      format
      uri
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
          uri: `${API_URL}${WEBHOOK_API_ROUTE}`,
          format: "JSON",
        },
      },
    },
  );
  // "Address for this topic has already been taken": the shop is already
  // subscribed to this topic at this URL, which is the state we want.
  const userErrors = (response.data?.webhookSubscriptionCreate?.userErrors ?? []).filter(
    (e) => !/already been taken/i.test(e.message),
  );
  if (userErrors.length) {
    throw new Error(
      `Error registering webhook with topic ${topic}: ${userErrors.map((e) => e.message).join("; ")}`,
    );
  }
}

interface ManagableWebhookNode {
  id: string;
  topic: string;
}

interface WebhookSubscriptionsData {
  webhookSubscriptions: {
    edges: { node: ManagableWebhookNode; cursor: string }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

export async function getManagableWebhooks(client: GraphqlClient): Promise<ManagableWebhookNode[]> {
  const webhookslist: ManagableWebhookNode[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  while (hasNextPage) {
    const response: GraphQLClientResponse<WebhookSubscriptionsData> = await client.request(
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
    if (!response.data) throw new Error("Shopify webhookSubscriptions query returned no data");
    hasNextPage = response.data.webhookSubscriptions.pageInfo.hasNextPage;
    cursor = response.data.webhookSubscriptions.pageInfo.endCursor;
    webhookslist.push(...response.data.webhookSubscriptions.edges.map((e) => e.node));
  }
  return webhookslist;
}

interface ShopifyAppSubscriptionWebhookPayload {
  name?: string;
  app_subscription?: {
    name?: string;
    admin_graphql_api_id?: string;
    status?: shopifyRecurringChargeStatus;
  };
}

interface ShopifyShopDetails {
  name?: string;
  email?: string;
  phone?: string;
}

export async function handleSubscriptionUpdateFromShopify(
  shop: string,
  payload: ShopifyAppSubscriptionWebhookPayload,
) {
  if (!shopify) throw new Error("Shopify integration is not configured");
  const integration = await getShopifyIntegrationByShop(shop);
  const subscription = await getSubscription(integration.orgId);
  if (!subscription) {
    throw new Error(`No subscription found for orgId ${integration.orgId}`);
  }
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
  const chargeId = payload.app_subscription?.admin_graphql_api_id ?? "";

  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(integration),
  });
  const recurringCharge = await getRecurringCharge(chargeId, integration);

  let haltSubscription = false;

  const shopResponse = await client.request<{
    shop: { name?: string; email?: string; shopAddress?: { phone?: string | null } };
  }>(`query { shop { name, email, shopAddress { phone } } } `);
  if (!shopResponse.data) throw new Error("Shopify shop query returned no data");
  const { shopAddress, ...shopFields } = shopResponse.data.shop;
  const shopDetails: ShopifyShopDetails = {
    ...shopFields,
    phone: shopAddress?.phone ?? undefined,
  };

  switch (payload.app_subscription?.status) {
    case shopifyRecurringChargeStatus.pending:
      if (!rateupPlan) throw new Error("RateupPlan not found for pending Shopify subscription");
      await prisma.order.create({
        data: {
          name: payload?.app_subscription?.name ?? "Unknown Shopify Plan",
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
      if (!recurringCharge) {
        throw new Error(`Recurring charge ${chargeId} not found on Shopify`);
      }
      if (!rateupPlan) throw new Error("RateupPlan not found for active Shopify subscription");
      // BUG (fixed): this call was missing `await` — the switch fell through to
      // `break` immediately, so any error thrown while activating the
      // subscription (DB writes, email send) became an unhandled promise
      // rejection instead of surfacing to this function's caller.
      await activateSubscriptionThroughShopify(
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
          const _subscriptionStatus = await prisma.order.update({
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
      if (!rateupPlan) throw new Error("RateupPlan not found for Shopify subscription update");
      await prisma.order.create({
        data: {
          name: payload?.name ?? "Unknown Shopify Plan",
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
    const _order = await prisma.order.update({
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
  recurringCharge: ShopifyRecurringCharge,
  integration: ShopifyIntegration & { org: Org },
  chargeId: string,
  rateupPlan: RateupPlan,
  shopDetails: ShopifyShopDetails,
) {
  const data = {
    name: recurringCharge.name,
    createdById: integration.org.ownerId,
    orgId: integration.orgId,
    rateupPlanId: rateupPlan.id,
    subscriptionStatus: shopifyRecurringChargeSubscriptionStatusMap[recurringCharge.status],
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
    const _payment = await prisma.payments.create({
      data: {
        payId: chargeId,
        amount: Number(recurringCharge?.lineItems[0].plan.pricingDetails.price.amount),
        currency: recurringCharge?.lineItems[0].plan.pricingDetails.price.currencyCode,
        method: PaymentSource.Shopify,
        description: "Subscription activated through shopify",
        customer_email: shopDetails.email || "",
        customer_phone: shopDetails.phone || "",
        rateupOrderId: order.id,
        createdAt: Math.floor(new Date(recurringCharge.createdAt).getTime() / 1000),
      },
    });
  }
  const expiresAt = dayjs(recurringCharge.createdAt).add(29, "days").toDate();
  const _updatedSubscription = await prisma.subscription.update({
    where: { orgId: integration?.orgId },
    data: {
      basePlanId: rateupPlan?.id,
      // RateupPlan.features is nullable but Subscription.features is not; an empty blob
      // migrates to the safe defaults (see migrateFeaturesToCurrentSchema).
      features: rateupPlan.features ?? {},
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
      paymentStatus: recurringCharge.name === "FREE PLAN" ? undefined : PaymentStatus.SUCCESS,
    },
  });

  if (updatedOrder) {
    log.info("sending email..");
    const user = await prisma.user.findUnique({
      where: {
        id: integration.org.ownerId,
      },
    });
    if (!user) throw new Error(`User not found for ownerId ${integration.org.ownerId}`);

    const msg = {
      to: user.email,
      subject: "Rateup Subscription Activated - Rateup.app",
      text: `Your subscription from shopify for the Rateup ${recurringCharge.name} has activated`,
      html: await createEmailBodySubscriptionActivated(
        rateupPlan.displayName ?? rateupPlan.name,
        expiresAt,
      ),
    };
    try {
      await notificationQueue.add("notification", {
        emailData: msg,
      });
    } catch (error) {
      console.error(error);
      throw new Error("Email sending failed. E:" + error);
    }
  }
}

export interface ShopifyWebhookJobData {
  topic: ShopifyEvents;
  webhookId: string;
  body: ShopifyWebhookBody;
  shop: string;
}

export async function handleWebhook(webhook: ShopifyWebhookJobData) {
  switch (webhook.topic) {
    case ShopifyEvents.APP_SUBSCRIPTIONS_UPDATE:
      // Narrowed by the topic this case matches.
      await handleSubscriptionUpdateFromShopify(
        webhook.shop,
        webhook.body as unknown as ShopifyAppSubscriptionWebhookPayload,
      );
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
    case ShopifyEvents.REFUNDS_CREATE:
      await handleShopifyRefundEvent(webhook);
      break;
    // Each body is narrowed by the topic its case matches.
    case ShopifyEvents.CHECKOUTS_CREATE:
    case ShopifyEvents.CHECKOUTS_UPDATE:
      await handleCheckoutWebhook(webhook.shop, webhook.body as unknown as CheckoutWebhookBody);
      break;
    case ShopifyEvents.CHECKOUTS_DELETE:
      await handleCheckoutDeleted(webhook.shop, webhook.body);
      break;
    case ShopifyEvents.CUSTOMERS_REDACT:
      await redactShopifyCustomer(webhook.shop, webhook.body as unknown as CustomerRedactBody);
      break;
    case ShopifyEvents.SHOP_REDACT:
      await redactShopifyShop(webhook.shop);
      break;
    case ShopifyEvents.APP_UNINSTALLED:
      await handleShopifyAppUnistalled(webhook);
      break;
  }
}

interface ShopifyRecurringCharge {
  id: string;
  name: string;
  status: shopifyRecurringChargeStatus;
  createdAt: string;
  currentPeriodEnd: string | null;
  lineItems: {
    plan: {
      pricingDetails: {
        interval?: string;
        price: { amount: string; currencyCode: string };
      };
    };
  }[];
}

export async function getRecurringCharge(
  chargeId: string,
  // Only the session is read below — `org` was an over-tight
  // requirement inherited from one particular caller
  // (`getShopifyIntegrationByShop`); `getShopifyInfo`'s callers don't have it.
  integration: ShopifyIntegration | null,
): Promise<ShopifyRecurringCharge | null> {
  if (!integration) return null;
  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(integration),
  });
  const appSubscriptions = await client.request<{ node: ShopifyRecurringCharge | null }>(
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
  return appSubscriptions.data?.node ?? null;
}

interface FulfillmentOrderShowData {
  fulfillmentOrder: {
    order: {
      id: string | null;
      email: string | null;
      customer: {
        defaultPhoneNumber: { phoneNumber: string } | null;
        defaultEmailAddress: { emailAddress: string } | null;
      } | null;
    } | null;
    lineItems: {
      edges: { node: { lineItem: { product: { id: string } | null } } }[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  } | null;
}

export async function handleShopifyOrderEvents(webhook: ShopifyWebhookJobData) {
  const { webhookId, shop, topic } = webhook;
  // The queue's job payload carries every webhook topic's shape, so it is typed
  // loosely (ShopifyWebhookBody) in transit and narrowed per topic here.
  // FULFILLMENT_ORDERS_CANCELLED's body is a distinct
  // `{ fulfillment_order: { id } }` shape (a REST fulfillment-order webhook),
  // while every other topic handled here is the order-webhook shape described
  // by `ShopifyBody`.
  const body = webhook.body as ShopifyBody & { fulfillment_order?: { id: string } };
  log.info("Handling Shopify Order Event: %o", { shop, topic, webhookId });
  const shopifyInfo = await getShopifyIntegrationByShop(shop);
  if (!shopifyInfo) {
    log.trace(`No shopify session found`);
    return;
  }
  let customerPhone;
  let customerEmail: string | null | undefined;
  const productIds: string[] = [];
  if (topic === ShopifyEvents.FULFILLMENT_ORDERS_CANCELLED) {
    if (!shopify) throw new Error("Shopify integration is not configured");
    const fulfillmentOrderGId = body.fulfillment_order?.id;
    if (!fulfillmentOrderGId) {
      log.trace("No fulfillment_order.id found on FULFILLMENT_ORDERS_CANCELLED webhook body");
      return;
    }
    const client = new shopify.clients.Graphql({
      session: await getActiveShopifySession(shopifyInfo),
    });
    // BUG (fixed): this started `false`, so the pagination loop's body — the
    // only place that fetches the order/customer/line-items and sets
    // `customerPhone` for this topic — never ran, and every
    // FULFILLMENT_ORDERS_CANCELLED webhook fell through to the "no phone
    // found" early-return below without ever querying Shopify.
    let hasNextPage = true;
    let cursor: string | null = null;
    while (hasNextPage) {
      const data: GraphQLClientResponse<FulfillmentOrderShowData> = await client.request(
        `query FulfillmentOrderShow($id: ID!, $cursor: String) {
  fulfillmentOrder(id: $id) {
          order {
            id
            email
            customer {
        defaultPhoneNumber {
          phoneNumber
        }
        defaultEmailAddress {
          emailAddress
        }
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
      if (!data.data) throw new Error("Shopify fulfillmentOrder query returned no data");
      const fulfillmentOrder = data.data.fulfillmentOrder;
      if (!fulfillmentOrder) break;
      // BUG (fixed): `pageInfo` and the line-item edges are nested under
      // `lineItems` in the query above (`lineItems { edges { ... } pageInfo {
      // ... } }`), not directly under `fulfillmentOrder` — the old code read
      // `fulfillmentOrder.pageInfo` (doesn't exist) and called `.map` directly
      // on `fulfillmentOrder.lineItems` (a connection object, not an array).
      // Both would throw the moment this loop actually ran.
      hasNextPage = fulfillmentOrder.lineItems.pageInfo.hasNextPage;
      cursor = fulfillmentOrder.lineItems.pageInfo.endCursor;
      productIds.push(
        ...fulfillmentOrder.lineItems.edges
          .map((edge) => edge.node.lineItem.product?.id)
          .filter((id): id is string => !!id),
      );
      // BUG (fixed): typo — `cutsomer` doesn't exist on the response (the
      // query selects `customer`), so this always threw
      // "Cannot read properties of undefined (reading 'phone')" once the loop
      // body actually executed.
      customerPhone =
        fulfillmentOrder.order?.customer?.defaultPhoneNumber?.phoneNumber ?? customerPhone;
      customerEmail =
        fulfillmentOrder.order?.customer?.defaultEmailAddress?.emailAddress ??
        fulfillmentOrder.order?.email ??
        customerEmail;
    }
  } else {
    customerPhone =
      body?.customer?.phone ||
      body?.customer?.default_address?.phone ||
      body?.billing_address?.phone ||
      body?.shipping_address?.phone ||
      body?.phone;
    // Shopify makes email mandatory at checkout and phone optional, so this is the
    // identifier most orders actually carry.
    customerEmail = body?.customer?.email || body?.email || body?.contact_email;
    productIds.push(
      ...(body.line_items?.map((product) => `gid://shopify/Product/${product.product_id}`) ?? []),
    );
  }
  // Loyalty first, and deliberately above the phone guard: it can identify a customer by
  // email, so it must not sit behind a check for a number the order may never have carried.
  // Enqueueing is a Redis write, so putting it first costs the messaging paths nothing —
  // and it means a throw further down can no longer swallow the points.
  const orderId = body?.id != null ? String(body.id) : null;
  if (orderId) {
    await enqueueShopifyOrderLoyalty({
      shop,
      topic,
      orgId: shopifyInfo.orgId,
      orderId,
      phone: customerPhone ?? null,
      email: customerEmail ?? null,
      amount: extractPurchaseAmount(body),
      discountCodes: extractDiscountCodes(body),
    });
  }

  if (topic === ShopifyEvents.ORDERS_CREATE) {
    await markCheckoutRecovered(shopifyInfo.orgId, body);
  }

  if (!customerPhone) {
    // The survey and automation paths genuinely need a number — there is nowhere to send a
    // WhatsApp message without one. Logged at info, not trace: "this order reached nobody"
    // is something a shop needs to be able to find.
    log.info(
      { shop, topic, orderId, hasEmail: Boolean(customerEmail) },
      "Shopify order carries no phone number; WhatsApp survey and automation paths skipped",
    );
    return;
  }

  await createScheduleOnShopifyEvent({
    customerPhone,
    event: topic,
    shopifyInfo,
    productIds,
    webhookId,
    scheduleFromDate: new Date(),
    // amount: Number(body?.total_price),
    body,
  });

  await checkAndExecuteRuleByTriggerEvent(TriggerEvent.SHOPIFY_EVENT, {
    orgId: shopifyInfo.orgId,
    phone: customerPhone,
    shopifyEvent: topic,
    shopifyProductIds: productIds,
    shopifyBody: body,
    platform: "WHATSAPP",
  });
}

/** The gateway Shopify records on the transaction when a refund goes to store credit. */
const STORE_CREDIT_GATEWAY = "shopify_store_credit";

/** The refunds/create fields read here; the rest is left to the index signature. */
interface ShopifyRefundWebhookBody {
  id?: number | string;
  order_id?: number | string;
  note?: string | null;
  created_at?: string;
  transactions?: { kind?: string; status?: string; gateway?: string; amount?: string }[];
  refund_line_items?: {
    quantity?: number;
    line_item?: { product_id?: number | null; title?: string };
  }[];
}

interface RefundOrderData {
  order: {
    name: string;
    email: string | null;
    phone: string | null;
    currencyCode: string;
    customer: {
      firstName: string | null;
      lastName: string | null;
      defaultEmailAddress: { emailAddress: string } | null;
      defaultPhoneNumber: { phoneNumber: string } | null;
      defaultAddress: { phone: string | null } | null;
    } | null;
    billingAddress: { phone: string | null; city: string | null } | null;
    shippingAddress: { phone: string | null; city: string | null } | null;
  } | null;
}

/**
 * refunds/create. One refund can send money back to the original payment method and to
 * store credit at once, so it raises up to two rule events — REFUNDS_CREATE for the
 * original-method part and STORE_CREDIT_ISSUED for the store credit part — each carrying
 * only its own amount as `refund_amount`.
 *
 * The payload names the order but not the customer, so the order is looked up for the
 * phone, name and currency the rules and their variables need.
 */
export async function handleShopifyRefundEvent(webhook: ShopifyWebhookJobData) {
  const { shop } = webhook;
  const body = webhook.body as ShopifyRefundWebhookBody;

  // Summed in paise/cents so a split refund's two parts add up exactly.
  let originalCents = 0;
  let storeCreditCents = 0;
  for (const transaction of body.transactions ?? []) {
    if (transaction.kind !== "refund" || transaction.status !== "success") continue;
    const cents = Math.round(Number(transaction.amount ?? 0) * 100);
    if (transaction.gateway === STORE_CREDIT_GATEWAY) storeCreditCents += cents;
    else originalCents += cents;
  }
  const events = [
    { event: ShopifyEvents.REFUNDS_CREATE, cents: originalCents },
    { event: ShopifyEvents.STORE_CREDIT_ISSUED, cents: storeCreditCents },
  ].filter((e) => e.cents > 0);
  // A restock-only refund moves no money, and there is nothing to tell the customer.
  if (!events.length || !body.order_id) return;

  const shopifyInfo = await getShopifyIntegrationByShop(shop);
  if (!shopifyInfo) {
    log.trace(`No shopify session found`);
    return;
  }
  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });
  const res: GraphQLClientResponse<RefundOrderData> = await client.request(
    `query RefundOrder($id: ID!) {
  order(id: $id) {
    name
    email
    phone
    currencyCode
    customer {
      firstName
      lastName
      defaultEmailAddress { emailAddress }
      defaultPhoneNumber { phoneNumber }
      defaultAddress { phone }
    }
    billingAddress { phone city }
    shippingAddress { phone city }
  }
}`,
    { variables: { id: `gid://shopify/Order/${body.order_id}` } },
  );
  const order = res.data?.order;
  if (!order) {
    log.info({ shop, orderId: body.order_id }, "Shopify refund's order not found");
    return;
  }

  const customerPhone =
    order.customer?.defaultPhoneNumber?.phoneNumber ||
    order.phone ||
    order.customer?.defaultAddress?.phone ||
    order.billingAddress?.phone ||
    order.shippingAddress?.phone;
  if (!customerPhone) {
    log.info(
      { shop, orderId: body.order_id, refundId: body.id },
      "Shopify refund's order carries no phone number; automation paths skipped",
    );
    return;
  }

  const email = order.customer?.defaultEmailAddress?.emailAddress ?? order.email;
  const refundLineItems = body.refund_line_items ?? [];
  const productIds = refundLineItems.flatMap((item) =>
    item.line_item?.product_id ? [`gid://shopify/Product/${item.line_item.product_id}`] : [],
  );
  // The snake_case order shape rule variables are mapped against, so "Order Name",
  // "Customer First Name" and "Currency" resolve as they do for order events.
  const ruleBody = {
    id: body.id,
    order_id: body.order_id,
    name: order.name,
    note: body.note ?? "",
    created_at: body.created_at,
    currency: order.currencyCode,
    store_credit_amount: (storeCreditCents / 100).toFixed(2),
    email,
    customer: order.customer
      ? {
          first_name: order.customer.firstName,
          last_name: order.customer.lastName,
          email,
          phone: customerPhone,
        }
      : null,
    billing_address: order.billingAddress,
    shipping_address: order.shippingAddress,
    line_items: refundLineItems.map((item) => ({
      title: item.line_item?.title,
      quantity: item.quantity,
      product_id: item.line_item?.product_id,
    })),
  };

  for (const { event, cents } of events) {
    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.SHOPIFY_EVENT, {
      orgId: shopifyInfo.orgId,
      phone: customerPhone,
      shopifyEvent: event,
      shopifyProductIds: productIds,
      shopifyBody: {
        ...ruleBody,
        refund_amount: (cents / 100).toFixed(2),
      } as unknown as ShopifyBody,
      platform: "WHATSAPP",
    });
  }
}

export async function handleShopifyAppUnistalled(webhook: { shop: string }) {
  const { shop } = webhook;
  const shopifyInfo = await getShopifyIntegrationByShop(shop);
  if (!shopifyInfo) return;
  if (!shopifyInfo.org || !shopifyInfo.orgId) {
    await updateShopifyIntegrationByShop(shop, { active: false });
    return;
  }
  if (dayjs(shopifyInfo.org.createdAt).isBefore(dayjs(shopifyInfo.createdAt))) {
    await updateShopifyIntegrationByShop(shop, { active: false });
    await notify({
      event: "integration.error",
      orgId: shopifyInfo.orgId,
      audience: { kind: "permitted" },
      data: {
        integration: "Shopify",
        error: `The RateUp app was uninstalled from ${shop}. Reinstall it to keep syncing orders.`,
      },
    });
  } else {
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
  client: GraphqlClient,
): Promise<Map<string, string>> {
  // retailerId → numeric Shopify variant id
  const variantMap = new Map<string, string>();

  // ── Step 0: Validate numeric IDs against Shopify ─────────────────────────
  // If retailer_id is all digits it's likely a Shopify variant ID, but we
  // must verify it still exists — the product may have been deleted/recreated
  // giving it a new ID while the old ID stays in the Meta catalog.
  const numericProducts = products.filter((p) => /^\d+$/.test(p.retailerId));
  const needsLookup: typeof products = products.filter((p) => !/^\d+$/.test(p.retailerId));

  if (numericProducts.length > 0) {
    try {
      const ids = numericProducts.map((p) => `gid://shopify/ProductVariant/${p.retailerId}`);
      const nodesData = await client.request<ShopifyNodesLookupData>(
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
      const nodes = nodesData.data?.nodes ?? [];
      for (const product of numericProducts) {
        const gid = `gid://shopify/ProductVariant/${product.retailerId}`;
        const node = nodes.find((n) => n?.id === gid);
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
      log.warn({ err: e }, "Variant validation failed, using numeric IDs as-is");
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
      const variantsData = await client.request<ShopifyProductVariantsData>(
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
      const skuEdges = variantsData.data?.productVariants?.edges ?? [];
      skuEdges.forEach((edge) => {
        // GID format: gid://shopify/ProductVariant/12345678
        const numericId = edge.node?.id?.split("/").pop();
        const sku = edge.node?.sku;
        if (!sku || !numericId) return;
        variantMap.set(sku, numericId);
      });
    } catch (e) {
      log.error({ err: e }, "Error fetching Shopify variants by SKU");
      return variantMap;
    }
  }

  // ── Step 2: Title-based fallback for any product not matched by SKU ──────
  const notFoundBySku = needsLookup.filter((p) => !variantMap.has(p.retailerId) && p.title);
  if (notFoundBySku.length > 0) {
    const titleQuery = notFoundBySku.map((p) => `title:"${p.title}"`).join(" OR ");
    try {
      const productsData = await client.request<ShopifyProductsByTitleData>(
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
      const titleEdges = productsData.data?.products?.edges ?? [];
      titleEdges.forEach((edge) => {
        const shopifyTitle = edge.node?.title?.toLowerCase().trim() ?? "";
        const numericId: string | undefined = edge.node?.variants?.edges?.[0]?.node?.id
          ?.split("/")
          .pop();
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
            edge.node?.title,
            matched.retailerId,
          );
          variantMap.set(matched.retailerId, numericId);
        }
      });
    } catch (e) {
      log.warn({ err: e }, "Title-based Shopify product lookup failed");
    }
  }

  // ── Step 3: Broad partial-word search as last resort ─────────────────────
  // Steps 1 & 2 use exact matches. Step 3 uses the first 3 significant words
  // of the title as unquoted keywords (Shopify "contains all words" search),
  // which handles apostrophe/encoding differences or slight title mismatches.
  const notFoundAfterTitle = needsLookup.filter((p) => !variantMap.has(p.retailerId));
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
        log.warn({ err: e }, "Broad Shopify product search failed");
      }
    }
  }

  return variantMap;
}

const toGid = (type: string, id: string | number) =>
  String(id).startsWith("gid://") ? String(id) : `gid://shopify/${type}/${id}`;

function throwOnUserErrors(operation: string, userErrors: ShopifyUserError[] | undefined) {
  if (userErrors?.length) {
    throw new Error(`${operation} failed: ${userErrors.map((e) => e.message).join("; ")}`);
  }
}

async function getShopCurrencyCode(client: GraphqlClient): Promise<string> {
  const response = await client.request<{ shop: { currencyCode: string } }>(
    `query shopCurrency { shop { currencyCode } }`,
  );
  if (!response.data) throw new Error("Shopify shop query returned no data");
  return response.data.shop.currencyCode;
}

function toMailingAddress(address: ShopifyShippingAddressInput) {
  return {
    firstName: address.first_name,
    lastName: address.last_name,
    address1: address.address1,
    address2: address.address2,
    city: address.city,
    provinceCode: toShopifyProvinceCode(address.country_code, address.province),
    zip: address.zip,
    countryCode: address.country_code || "IN",
    phone: address.phone,
  };
}

// Create Shopify Draft Order with address + shipping line
export async function createShopifyDraftOrderWithAddress(
  orgId: string,
  products: {
    retailerId: string;
    quantity: number;
    title?: string;
    price?: number | string;
  }[],
  shippingAddress?: ShopifyShippingAddressInput | null,
  deliveryOption?: { name?: string; charge?: number } | null,
): Promise<{ id: string; invoice_url: string | null } | null> {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    log.trace("Shopify not active for orgId %s - skipping draft order creation", orgId);
    return null;
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });
  const variantMap = await resolveShopifyVariants(products, client);
  if (products.length === 0) {
    log.trace("No line items for draft order — skipping");
    return null;
  }
  const currencyCode = await getShopCurrencyCode(client);

  const lines = products.map((product) => {
    const variantId = variantMap.get(product.retailerId);
    if (variantId) {
      return { variantId: toGid("ProductVariant", variantId), quantity: product.quantity };
    }
    // Fallback: custom line item with title and price from WA catalog data
    const price = parseFloat(String(product.price ?? "0")) || 0;
    return {
      title: product.title ?? product.retailerId,
      amount: price.toFixed(2),
      quantity: product.quantity,
    };
  });
  const address = shippingAddress ? toMailingAddress(shippingAddress) : undefined;
  const shipping = deliveryOption && {
    title: deliveryOption.name ?? "Delivery",
    amount: String(deliveryOption.charge ?? 0),
  };

  try {
    const response = await client.request<ShopifyDraftOrderCreateData>(
      `mutation createDraftOrder($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            legacyResourceId
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
            lineItems: lines.map((line) =>
              "variantId" in line
                ? line
                : {
                    title: line.title,
                    quantity: line.quantity,
                    requiresShipping: true,
                    originalUnitPriceWithCurrency: { amount: line.amount, currencyCode },
                  },
            ),
            ...(address && { shippingAddress: address }),
            ...(shipping && {
              shippingLine: {
                title: shipping.title,
                priceWithCurrency: { amount: shipping.amount, currencyCode },
              },
            }),
            note: "Order from WhatsApp Catalog",
          },
        },
      },
    );
    throwOnUserErrors("draftOrderCreate", response.data?.draftOrderCreate.userErrors);
    const draftOrder = response.data?.draftOrderCreate.draftOrder;
    if (!draftOrder) throw new Error("draftOrderCreate returned no draft order");
    log.info("Created Shopify draft order %s for orgId %s", draftOrder.legacyResourceId, orgId);
    return { id: draftOrder.legacyResourceId, invoice_url: draftOrder.invoiceUrl };
  } catch (error) {
    log.error({ err: shopifyErrorDetail(error) }, "Failed to create Shopify draft order");
    try {
      log.warn(
        "Draft order creation failed (likely missing write_draft_orders scope). Falling back to orderCreate...",
      );
      const response = await client.request<ShopifyOrderCreateData>(
        `mutation createOrder($order: OrderCreateOrderInput!) {
          orderCreate(order: $order) {
            order {
              legacyResourceId
              statusPageUrl
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            order: {
              currency: currencyCode,
              lineItems: lines.map((line) =>
                "variantId" in line
                  ? line
                  : {
                      title: line.title,
                      quantity: line.quantity,
                      requiresShipping: true,
                      priceSet: { shopMoney: { amount: line.amount, currencyCode } },
                    },
              ),
              financialStatus: "PENDING",
              ...(address && { shippingAddress: address }),
              ...(shipping && {
                shippingLines: [
                  {
                    title: shipping.title,
                    priceSet: { shopMoney: { amount: shipping.amount, currencyCode } },
                  },
                ],
              }),
              note: "Order from WhatsApp Catalog",
            },
          },
        },
      );
      throwOnUserErrors("orderCreate", response.data?.orderCreate.userErrors);
      const order = response.data?.orderCreate.order;
      if (!order) {
        log.error("Fallback Shopify order creation returned no order");
        return null;
      }
      log.info("Created fallback Shopify order %s for orgId %s", order.legacyResourceId, orgId);
      return { id: order.legacyResourceId, invoice_url: order.statusPageUrl };
    } catch (fallbackError) {
      log.error(
        { err: shopifyErrorDetail(fallbackError) },
        "Fallback Shopify order creation also failed",
      );
      return null;
    }
  }
}

/**
 * Marks the order behind a WhatsApp payment as paid. `orderId` is what
 * createShopifyDraftOrderWithAddress stored: a draft order id, or an order id
 * when it had to fall back to orderCreate.
 */
export async function captureShopifyOrderPayment(orgId: string, orderId: string) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    log.trace("Shopify integration not active. Cannot capture payment.");
    return false;
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });

  try {
    // First try completing it as a draft order (paid, since paymentPending defaults to false)
    const response = await client.request<ShopifyDraftOrderCompleteData>(
      `mutation completeDraftOrder($id: ID!) {
        draftOrderComplete(id: $id) {
          draftOrder {
            order {
              legacyResourceId
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      { variables: { id: toGid("DraftOrder", orderId) } },
    );
    throwOnUserErrors("draftOrderComplete", response.data?.draftOrderComplete.userErrors);
    log.info("Successfully completed Shopify Draft Order %s into a paid order", orderId);
    return response.data?.draftOrderComplete.draftOrder?.order?.legacyResourceId || true;
  } catch (draftError) {
    log.warn(
      { err: shopifyErrorDetail(draftError) },
      "Completing draft order failed (might be a direct order ID). Trying orderMarkAsPaid for %s...",
      orderId,
    );
    try {
      const response = await client.request<ShopifyOrderMarkAsPaidData>(
        `mutation markOrderPaid($input: OrderMarkAsPaidInput!) {
          orderMarkAsPaid(input: $input) {
            order {
              legacyResourceId
              displayFinancialStatus
            }
            userErrors {
              field
              message
            }
          }
        }`,
        { variables: { input: { id: toGid("Order", orderId) } } },
      );
      throwOnUserErrors("orderMarkAsPaid", response.data?.orderMarkAsPaid.userErrors);
      log.info("Successfully marked Shopify Order %s as paid", orderId);
      return response.data?.orderMarkAsPaid.order ?? true;
    } catch (error) {
      log.error(
        { err: shopifyErrorDetail(error) },
        "Failed to capture payment for Shopify Order %s",
        orderId,
      );
      return false;
    }
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

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
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
export async function createShopifyDraftOrder(
  orgId: string,
  products: { retailerId: string; quantity: number; title?: string }[],
) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    throw new Error("Shopify integration not active");
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });

  const skus = products.map((p) => p.retailerId).filter(Boolean);
  const variantMap = new Map<string, string>();

  if (skus.length > 0) {
    const skuQuery = skus.map((sku) => `sku:${sku}`).join(" OR ");
    const variantsData = await client.request<ShopifyProductVariantsData>(
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

    (variantsData.data?.productVariants?.edges ?? []).forEach((edge) => {
      const sku = edge.node?.sku;
      const id = edge.node?.id;
      if (!sku || !id) return;
      variantMap.set(sku, id);
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

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
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

  const createVariables: Record<string, unknown> = {
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

  const createResponse = await client.request<ShopifyProductCreateData>(createMutation, {
    variables: createVariables,
  });
  const createResult = createResponse.data?.productCreate;

  if (createResult?.userErrors?.length) {
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

// Fetch shipping rates dynamically from Shopify
export async function fetchShopifyShippingRates(
  orgId: string,
  products: {
    retailerId: string;
    quantity: number;
    title?: string;
    price?: number | string;
  }[],
  shippingAddress: ShopifyShippingAddressInput,
) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    log.trace("Shopify not active for orgId %s - skipping shipping rates query", orgId);
    return [];
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });
  const variantMap = await resolveShopifyVariants(products, client);

  const lineItems = [];
  for (const product of products) {
    const variantId = variantMap.get(product.retailerId);
    if (variantId) {
      const fullVariantGid = variantId.startsWith("gid://")
        ? variantId
        : `gid://shopify/ProductVariant/${variantId}`;
      lineItems.push({
        variantId: fullVariantGid,
        quantity: product.quantity,
      });
    } else {
      log.warn(
        `SKU ${product.retailerId} could not be resolved to a Shopify variant for rates calculation.`,
      );
    }
  }

  if (lineItems.length === 0) {
    log.trace("No line items resolved for shipping rates query");
    return [];
  }

  const graphqlAddress = toMailingAddress(shippingAddress);

  try {
    const response = await client.request<ShopifyDeliveryOptionsData>(
      `query getAvailableShippingRates($input: DraftOrderAvailableDeliveryOptionsInput!) {
        draftOrderAvailableDeliveryOptions(input: $input) {
          availableShippingRates {
            handle
            title
            price {
              amount
              currencyCode
            }
          }
        }
      }`,
      {
        variables: {
          input: {
            lineItems,
            shippingAddress: graphqlAddress,
          },
        },
      },
    );

    const rates = response.data?.draftOrderAvailableDeliveryOptions?.availableShippingRates ?? [];
    // A rate without a handle can't be selected later, so drop it.
    return rates
      .filter((r) => Boolean(r.handle))
      .map((r) => ({
        id: r.handle as string,
        name: r.title ?? "Delivery",
        charge: parseFloat(r.price?.amount || "0"),
        enabled: true,
      }));
  } catch (error) {
    log.error(
      { err: shopifyErrorDetail(error) },
      "Failed to fetch available shipping rates from Shopify",
    );
    return [];
  }
}

// Resolve order ID from a draft order ID
export async function getOrderIdFromDraftOrder(
  orgId: string,
  draftOrderId: string,
): Promise<string> {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    throw new Error(`Shopify integration not active for organization: ${orgId}`);
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });

  try {
    const response = await client.request<ShopifyDraftOrderLookupData>(
      `query draftOrderOrder($id: ID!) {
        draftOrder(id: $id) {
          order {
            legacyResourceId
          }
        }
      }`,
      { variables: { id: toGid("DraftOrder", draftOrderId) } },
    );
    const orderId = response.data?.draftOrder?.order?.legacyResourceId;
    if (!orderId) {
      throw new Error(`Draft order ${draftOrderId} has not been completed yet.`);
    }
    return String(orderId);
  } catch (error) {
    log.error(
      { err: shopifyErrorDetail(error) },
      "Failed to fetch Shopify draft order to resolve order_id",
    );
    return draftOrderId;
  }
}

// Fetch the primary image URL for a Shopify product
export async function getShopifyProductImage(
  orgId: string,
  productId: string,
): Promise<string | null> {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    log.warn(`Shopify integration not active for organization: ${orgId}`);
    return null;
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });

  try {
    const response = await client.request<ShopifyProductImageData>(
      `query productImage($id: ID!) {
        product(id: $id) {
          featuredMedia {
            preview {
              image {
                url
              }
            }
          }
        }
      }`,
      { variables: { id: toGid("Product", productId) } },
    );
    return response.data?.product?.featuredMedia?.preview?.image?.url ?? null;
  } catch (error) {
    log.error(
      { err: shopifyErrorDetail(error) },
      "Failed to fetch Shopify product image for product %s",
      productId,
    );
    return null;
  }
}

// Retrieve fulfillment orders for an order
export async function getFulfillmentOrders(orgId: string, waCatalogOrderId: string) {
  const waCatalogOrder = await prisma.waCatalogOrder.findUnique({
    where: { id: waCatalogOrderId },
  });
  if (!waCatalogOrder) {
    throw new Error(`WaCatalogOrder not found for ID: ${waCatalogOrderId}`);
  }
  if (!waCatalogOrder.shopifyDraftOrderId) {
    throw new Error(`No Shopify Draft Order ID associated with order: ${waCatalogOrderId}`);
  }

  const shopifyOrderId = await getOrderIdFromDraftOrder(orgId, waCatalogOrder.shopifyDraftOrderId);

  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    throw new Error(`Shopify integration not active for organization: ${orgId}`);
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });

  const fullOrderGid = shopifyOrderId.startsWith("gid://")
    ? shopifyOrderId
    : `gid://shopify/Order/${shopifyOrderId}`;

  try {
    const response = await client.request<ShopifyFulfillmentOrdersData>(
      `query getFulfillmentOrders($orderId: ID!) {
        order(id: $orderId) {
          id
          name
          fulfillmentOrders(first: 20) {
            nodes {
              id
              status
              requestStatus
              lineItems(first: 100) {
                nodes {
                  id
                  sku
                  productTitle
                  totalQuantity
                  remainingQuantity
                }
              }
            }
          }
        }
      }`,
      {
        variables: { orderId: fullOrderGid },
      },
    );

    const nodes = response.data?.order?.fulfillmentOrders?.nodes ?? [];
    nodes.forEach((node) => {
      node.lineItems?.nodes?.forEach((item) => {
        item.title = item.productTitle;
      });
    });
    return nodes;
  } catch (error) {
    log.error({ err: shopifyErrorDetail(error) }, "Failed to fetch Shopify fulfillment orders");
    throw error;
  }
}

// Create fulfillment in Shopify
export async function createShopifyFulfillment(
  orgId: string,
  fulfillmentInput: {
    lineItemsByFulfillmentOrder: {
      fulfillmentOrderId: string;
      fulfillmentOrderLineItems?: {
        id: string;
        quantity: number;
      }[];
    }[];
    trackingInfo?: {
      company?: string;
      number?: string;
      url?: string;
    };
    notifyCustomer?: boolean;
  },
) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    throw new Error(`Shopify integration not active for organization: ${orgId}`);
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });

  try {
    const response = await client.request<ShopifyFulfillmentCreateData>(
      `mutation CreateFulfillment($fulfillment: FulfillmentInput!) {
        fulfillmentCreate(fulfillment: $fulfillment) {
          fulfillment {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: { fulfillment: fulfillmentInput },
      },
    );

    const result = response.data?.fulfillmentCreate;
    if (result?.userErrors?.length) {
      throw new Error(result.userErrors[0].message);
    }

    return result?.fulfillment;
  } catch (error) {
    log.error({ err: shopifyErrorDetail(error) }, "Failed to create Shopify fulfillment");
    throw error;
  }
}

export function resolveShopifyPathValue(
  shopifyBody: ShopifyWebhookBody | null | undefined,
  path: string,
): string {
  if (!shopifyBody) return "";

  let resolvedValue = "";

  if (path === "items_fulfilled") {
    const items = (shopifyBody.line_items ?? [])
      .filter((item) => item.fulfillment_status === "fulfilled")
      .map((item) => `${item.title} (x${item.quantity})`);
    resolvedValue = items.join(", ");
  } else if (path === "pending_items") {
    const items = (shopifyBody.line_items ?? [])
      .filter((item) => item.fulfillment_status !== "fulfilled")
      .map((item) => `${item.title} (x${item.quantity})`);
    resolvedValue = items.join(", ");
  } else if (path === "tracking_number") {
    resolvedValue = String(
      shopifyBody.tracking_number ??
        shopifyBody.fulfillments?.[0]?.tracking_number ??
        shopifyBody.fulfillment?.tracking_number ??
        "",
    );
  } else if (path === "tracking_url") {
    resolvedValue = String(
      shopifyBody.tracking_url ??
        shopifyBody.fulfillments?.[0]?.tracking_url ??
        shopifyBody.fulfillment?.tracking_url ??
        "",
    );
  } else if (path === "order_number") {
    resolvedValue = String(shopifyBody.order_number ?? "");
  } else if (path === "abandoned_checkout_url") {
    resolvedValue = String(
      shopifyBody.abandoned_checkout_url ??
        shopifyBody.recovery_url ??
        shopifyBody.checkout_url ??
        "",
    );
  } else {
    const val = _get(shopifyBody, path);
    resolvedValue = String(val ?? "");
  }

  log.info(`[Shopify Webhook Variable] Resolved path: "${path}" -> value: "${resolvedValue}"`);

  return resolvedValue;
}
