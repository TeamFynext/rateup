import prisma from "../../../utils/prisma.js";
import { TriggerEvent } from "../../../../generated/prisma/enums.js";
import { log } from "../../../utils/logger.js";
import { sendMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service.js";
import {
  convertComponentForSenting,
  updateButtonText,
  wait,
} from "../../whatsapp/whatsappSurvey/wasurvey.controller.js";
import { updateMonthlyStat } from "../../stats/stats.service.js";
import { checkAndExecuteRuleByTriggerEvent } from "../../whatsapp/automatedReply/wa_automatedReply.utils.js";
import { ShopifyEvents, SubscriptionFeaturePathName } from "../../../types/enums.js";
import { createTemplateMessage } from "../../whatsapp/whatsappSurvey/wasurvey.utils.js";
import { getDbTemplate } from "../../whatsapp/messageTemplates/wa_templates.service.js";
import { getFlowIdFromTemplateComponents } from "../../whatsapp/messageTemplates/wa_templates.utils.js";
import type { CommerceOrder, CommerceStore } from "../commerce/commerce.types.js";
import { ShopifyBody } from "./shopify.types.js";
import { signFlowToken } from "../../whatsapp/flows/flowToken.js";

/** The Shopify automation rule trigger, for an order that carries a phone number. */
export async function runShopifyOrderAutomation(
  store: CommerceStore,
  order: CommerceOrder,
  phone: string,
) {
  await checkAndExecuteRuleByTriggerEvent(TriggerEvent.SHOPIFY_EVENT, {
    orgId: store.orgId,
    phone,
    shopifyEvent: order.eventKey as ShopifyEvents,
    shopifyProductIds: order.productIds,
    shopifyBody: order.raw as unknown as ShopifyBody,
    platform: "WHATSAPP",
  });
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
