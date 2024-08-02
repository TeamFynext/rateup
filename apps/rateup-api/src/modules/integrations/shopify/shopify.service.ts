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
import { getScheduledTime } from "./shopify.util";
import {
  getIntegrationByName,
  updateIntegrationByName,
} from "../integrations.service";
import { UpdateIntgrationInput } from "../integrations.schema";

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
  })) as unknown as ShopifyIntegration;
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
  })) as ShopifyIntegration[];

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
