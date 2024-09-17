import { WaAutomatedReply } from "@prisma/client";
import {
  WaAutomatedReplyMatchType,
  WaAutomatedReplyResponseType,
  WaTemplateComponentType,
} from "../../../types/enums";
import { WaMessageBody } from "../../../types/whatsapp.types";
import {
  WaParsedMessage,
  parseMessage,
} from "../whatsappSurvey/wasurvey.utils";
import { getAutomatedRepliesByOrgId } from "./wa_automatedReply.service";
import {
  sendMessage,
  sendTextMessage,
} from "../whatsappSurvey/wasurvey.service";
import { log } from "../../../utils/logger";
import { sendTemplateToUserCore } from "../messageTemplates/wa_templates.controller";
import prisma from "../../../utils/prisma";
import { templateData } from "../messageTemplates/wa_templates.service";

export function validateAutomationMatchCondition(
  automation: WaAutomatedReply,
  message: string,
): boolean {
  const { matchType, matchData } = automation;
  if (matchType === WaAutomatedReplyMatchType.Exact) {
    if (matchData.caseSensitive) {
      return message === matchData.exactText;
    } else {
      return message.toLowerCase() === matchData.exactText.toLowerCase();
    }
  } else if (
    [
      WaAutomatedReplyMatchType.ContainsAllOf,
      WaAutomatedReplyMatchType.ContainsAnyOf,
    ]
  ) {
    let comparator: "some" | "every";

    if (WaAutomatedReplyMatchType.ContainsAllOf === matchType)
      comparator = "every";
    if (WaAutomatedReplyMatchType.ContainsAnyOf === matchType)
      comparator = "some";

    if (matchData.caseSensitive) {
      return matchData.keywords[comparator]((keyword) =>
        message.includes(keyword),
      );
    } else {
      message = message.toLowerCase();
      return matchData.keywords[comparator]((keyword) =>
        message.includes(keyword.toLowerCase()),
      );
    }
  } else {
    throw new Error(`WaAutomation not implemented for: ${matchType}`);
  }
}

/**
 * If any automatedReplyCondition matches: returns the automation
 * if none of them matches: returns undefined
 */
export async function checkIfMessageMatchesAnyAutomation(
  orgId: string,
  waMessage: WaMessageBody,
) {
  const { message } = parseMessage(waMessage);
  const automatedReplies = await getAutomatedRepliesByOrgId(orgId);

  for (const automation of automatedReplies) {
    if (validateAutomationMatchCondition(automation, message)) {
      log.trace("Automation Matched! %o", automation);
      return automation;
    }
  }
}

export async function sendAutomatedReplyMessage(
  orgId: string,
  { from }: WaParsedMessage,
  automation: WaAutomatedReply,
) {
  const { responseType, responseText, responseTemplateId, teamId, name } =
    automation;

  if (responseType === WaAutomatedReplyResponseType.Template) {
    // TODO: improve template sending
    await sendTemplateToUserCore(orgId, responseTemplateId, from, [], teamId);
  } else if (responseType === WaAutomatedReplyResponseType.Text) {
    await sendTextMessage({ phone: from, orgId }, "", responseText);
  } else {
    throw new Error("Not implemented");
  }
}

function generateOrderReferenceId() {
  const timestamp = Date.now().toString(36); // Convert timestamp to base36 for shorter representation
  const randomPart = Math.random().toString(36).substring(2, 7); // Generate a random 5-character string

  let referenceId = `ord-${timestamp}-${randomPart}`;

  // Ensure the length doesn't exceed 32 characters
  referenceId = referenceId.substring(0, 32);

  // Replace invalid characters with allowed ones
  referenceId = referenceId.replace(/[^a-zA-Z0-9_.-]/g, "");

  return referenceId;
}

export async function sendPaymentInitTemplate(
  orgId: string,
  phoneNo: string,
  templateData: {
    name: string;
    language: {
      code: string;
    };
    components: any[];
  },
  template: templateData,
) {
  const uniqueReferenceId = generateOrderReferenceId();

  const config = await prisma.integration.findFirst({
    where: {
      orgId: orgId,
      name: "waPayment",
    },
  });

  if (!config.credential) throw new Error("Config not found");
  const t = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneNo,
    type: "interactive",
    interactive: {
      type: "order_details",
      body: {
        text: template.data.components?.find(
          (data: any) => data.type === WaTemplateComponentType.BODY,
        )?.text,
      },
      footer: {
        text: template.data.components?.find(
          (data: any) => data.type === WaTemplateComponentType.FOOTER,
        )?.text,
      },
      action: {
        name: "review_and_pay",
        parameters: {
          reference_id: uniqueReferenceId,
          type: "digital-goods",
          payment_settings: [
            {
              type: "payment_gateway",
              payment_gateway: {
                type: "razorpay",
                configuration_name: config.credential?.[0].configuration_name,
                razorpay: {
                  receipt: "wa payment",
                },
              },
            },
          ],
          currency: "INR",
          total_amount: {
            value: template.config?.price,
            offset: 100,
          },
          order: {
            status: "pending",
            type: "quick_pay",
            items: [
              {
                name: template.config?.name,
                amount: {
                  value: template.config?.price,
                  offset: 100,
                },
                quantity: 1,
              },
            ],
            subtotal: {
              value: template.config?.price,
              offset: 100,
            },
            tax: {
              value: template.config?.tax,
              offset: 100,
            },
          },
        },
      },
    },
  };
  return t;
}
