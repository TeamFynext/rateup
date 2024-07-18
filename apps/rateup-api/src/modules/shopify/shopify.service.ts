import { FastifyReply, FastifyRequest } from "fastify";
import prisma from "../../utils/prisma";
import shopify from "./shopify.config";
import { Session, SessionParams } from "@shopify/shopify-api";
import { isEmpty } from "lodash";
import { log } from "../../utils/logger";
import {
  createSession,
  deleteSession,
  getSession,
  sendMessage,
} from "../whatsapp/whatsappSurvey/wasurvey.service";
import {
  convertComponentForSenting,
  updateButtonText,
  wait,
} from "../whatsapp/whatsappSurvey/wasurvey.controller";
import { updateMonthlyStat } from "../stats/stats.service";
import {
  ShopifyEvents,
  ShopifySendAfter,
  SubscriptionFeaturePathName,
} from "../../types/enums";
import {
  createTemplateMessage,
  validateSession,
} from "../whatsapp/whatsappSurvey/wasurvey.utils";
import { getDbTemplate } from "../whatsapp/messageTemplates/wa_templates.service";
import { getFlowIdFromTemplateComponents } from "../whatsapp/messageTemplates/wa_templates.utils";
import { parsePhoneNumber } from "libphonenumber-js";
import webhookHandlers from "./shopify.handler";
import dayjs from "dayjs";

export async function getShopifyAuthUrl(rawRequest, rawResponse, shop) {
  return await shopify.auth.begin({
    shop: shopify.utils.sanitizeShop(shop, true),
    callbackPath: "/api/shopify/auth/callback",
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

export async function createShopifySession(session: Session) {
  return await prisma.shopifySession.upsert({
    where: {
      shop: session.shop,
    },
    update: {
      id: session.id,
      state: session.state,
      isOnline: session.isOnline,
      accessToken: session.accessToken,
      scope: session.scope,
      active: true,
      isWebhookRegistered: false,
    },
    create: {
      id: session.id,
      shop: session.shop,
      state: session.state,
      isOnline: session.isOnline,
      accessToken: session.accessToken,
      scope: session.scope,
    },
  });
}

export async function getShopifySession(shop) {
  const session = await prisma.shopifySession.findUnique({
    where: {
      shop,
    },
  });
  if (session) {
    return {
      ...session,
      isActive: undefined,
      isScopeChanged: undefined,
      isExpired: undefined,
      toObject: undefined,
      equals: undefined,
      toPropertyArray: undefined,
    };
  }
  return null;
}

export async function getShopifySessionByOrgId(orgId) {
  const session = await prisma.shopifySession.findFirst({
    where: {
      orgId,
    },
  });
  if (session) if (!shopify.config.scopes.equals(session?.scope)) return null;
  return {
    ...session,
    isActive: undefined,
    isScopeChanged: undefined,
    isExpired: undefined,
    toObject: undefined,
    equals: undefined,
    toPropertyArray: undefined,
  };
  return null;
}

export async function updateShopifySession(shop, data) {
  const session = await getShopifySession(shop);
  if (session)
    await prisma.shopifySession.update({
      where: {
        shop,
      },
      data,
    });
}

export async function deleteShopifySession(shop) {
  return await prisma.shopifySession.delete({
    where: {
      shop,
    },
  });
}

export async function registerShopifyWebhook(session: Session) {
  shopify.webhooks.addHandlers(webhookHandlers);
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

export async function createShopifySurvey(data) {
  return await prisma.shopifySurvey.create({
    data,
  });
}

export async function getShopipfySurveyByEvent(orgId, event, shop) {
  return await prisma.shopifySurvey.findUnique({
    where: {
      orgid_event_shop_unique: {
        orgId,
        event,
        shop,
      },
      active: true,
    },
  });
}

export async function getShopifySchedules(orgId) {
  return await prisma.shopifySurveySchedule.findMany({
    where: {
      shopifySurvey: {
        orgId,
      },
    },
    include: {
      shopifySurvey: {
        include: {
          waTemplate: true,
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function getShopifySurveysByOrgId(orgId) {
  return await prisma.shopifySurvey.findMany({
    where: {
      orgId,
    },
    include: {
      team: {
        select: {
          name: true,
        },
      },
      waTemplate: {
        select: {
          data: true,
        },
      },
    },
  });
}

export async function createScheduleOnShopifyEvent(
  customerPhone: string,
  event: ShopifyEvents,
  session,
  productIds: string[],
  webhookId: string,
) {
  log.info(`checking survey for shopify event ${event}`);
  const phone = parsePhoneNumber(customerPhone, "IN");
  if (phone.isValid() === false) {
    log.trace("Invalid phone number");
    return;
  }
  const shopifySurvey = await getShopipfySurveyByEvent(
    session.orgId,
    event,
    session.shop,
  );

  const phoneWithoutPlus = phone.countryCallingCode + phone.nationalNumber;
  if (shopifySurvey && phoneWithoutPlus) {
    const data = {
      scheduleTime: getScheduledTime(shopifySurvey.sendAfter),
      phone: phoneWithoutPlus,
      shopifySurveyId: shopifySurvey.id,
      webhookId,
    };
    if (shopifySurvey.isProductSpecific) {
      if (productIds.includes(shopifySurvey.productId))
        await createShopifySurveySchedule(data);
    } else await createShopifySurveySchedule(data);
  } else {
    if (!shopifySurvey) log.trace(`No Survey schedule found`);
    else if (!phoneWithoutPlus) log.trace(`No customer phone number found`);
  }
}

export async function sendShopifySurveyCronAction() {
  const currentTime = new Date();
  const fiveMinutesLater = new Date(currentTime.getTime() + 5 * 60000);

  const shopifySchedules = await prisma.shopifySurveySchedule.findMany({
    where: {
      scheduledTime: {
        lte: fiveMinutesLater,
      },
      status: "SCHEDULED",
    },
    include: {
      shopifySurvey: true,
    },
  });

  if (shopifySchedules?.length) {
    for (const schedule of shopifySchedules) {
      const shop = schedule.shopifySurvey.shop;
      const session = await getShopifySession(shop);
      const res = await sendWhatsAppTemplateToCustomer(
        session.orgId,
        schedule.phone,
        schedule.shopifySurvey.waTemplateId,
        schedule.shopifySurvey.teamId,
      );
      await updateShopifySurveySchedule(schedule.id, {
        status: res
          ? res.status
            ? "SENT"
            : `FAILED: ${res?.message}`
          : "FAILED",
      });
    }
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

export async function deleteShopifySurveySchedule(id) {
  return await prisma.shopifySurvey.delete({
    where: {
      id,
    },
  });
}

export async function updateShopifySurvey(id, data) {
  return await prisma.shopifySurvey.update({
    where: {
      id,
    },
    data,
  });
}

export async function deleteMultipleSurveySchedules(shop) {
  return await prisma.shopifySurvey.deleteMany({
    where: {
      shop,
    },
  });
}

export async function deleteMultipleSchedules(orgId) {
  return await prisma.shopifySurveySchedule.deleteMany({
    where: {
      shopifySurvey: {
        orgId,
      },
    },
  });
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

export async function createShopifySurveySchedule(data: {
  scheduleTime: string;
  phone: string;
  shopifySurveyId: string;
  webhookId: string;
}) {
  try {
    await prisma.shopifySurveySchedule.create({
      data: {
        scheduledTime: data.scheduleTime,
        phone: data.phone,
        shopifySurveyId: data.shopifySurveyId,
        webhookId: data.webhookId,
      },
    });
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function updateShopifySurveySchedule(id, data) {
  await prisma.shopifySurveySchedule.update({
    where: {
      id,
    },
    data,
  });
}

function getScheduledTime(sendAfter) {
  const currentTime = dayjs();
  let scheduledTime = dayjs();
  switch (sendAfter) {
    case ShopifySendAfter.TwoHour:
      scheduledTime = currentTime.add(2, "hour");
      break;
    case ShopifySendAfter.FiveHour:
      scheduledTime = currentTime.add(5, "hour");
      break;
    case ShopifySendAfter.TenHour:
      scheduledTime = currentTime.add(10, "hour");
      break;
    case ShopifySendAfter.OneDay:
      scheduledTime = currentTime.add(1, "day");
      break;
    case ShopifySendAfter.OneDay:
      scheduledTime = currentTime.add(2, "days");
      break;
  }
  return scheduledTime.toISOString();
}
