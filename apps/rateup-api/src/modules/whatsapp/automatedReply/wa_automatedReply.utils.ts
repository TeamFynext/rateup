import { WaAutomatedReply } from "@prisma/client";
import {
  SubscriptionFeaturePathName,
  WaAutomatedReplyMatchType,
  WaAutomatedReplyResponseType,
  WaTemplateComponentType,
} from "../../../types/enums";
import { WaMessageBody } from "../../../types/whatsapp.types";
import {
  WaParsedMessage,
  createListMessage,
  createReplyButtonsMessage,
  createReplyImageMessage,
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
import { updateMonthlyStat } from "../../stats/stats.service";
import { sendFlow } from "../flows/flow.service";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload";
import { autoGenerateTicket } from "../../ticket/ticket.service";

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
    ].includes(matchType as WaAutomatedReplyMatchType)
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
type prevIntractionProps = {
  id: string;
  createdAt: Date;
  message: string;
  phone: string;
  currentScreen: string;
  waAutomatedReplyId: string | null;
  orgId: string;
};
type matchDataProps = {
  json: {
    nodes: Array<{
      id: string;
      data: {
        components: Array<{
          type: string;
          name:
            | Array<{ value: string; id: string }>
            | string
            | { image: string };
          parameter?: any;
        }>;
      };
    }>;
    edges: Array<{}>;
  };
};
export async function sendAutomatedReplyMessage(
  orgId: string,
  { from, buttonId, message }: WaParsedMessage,
  automation: WaAutomatedReply,
  prevIntraction: prevIntractionProps,
  isAutomationValid: boolean = true, // in the case of chained automations, automation will be invalid and automation prop will contain previous automation
) {
  const {
    responseType,
    responseTemplateId,
    teamId,
    name,
    matchData,
    enableTicket,
  } = automation;

  let nodes = (matchData as unknown as matchDataProps)?.json?.nodes;
  if (responseType === WaAutomatedReplyResponseType.Template) {
    // TODO: improve template sending
    await sendTemplateToUserCore(orgId, responseTemplateId, from, [], teamId);
  } else if (responseType === WaAutomatedReplyResponseType.Text) {
    let nextScreenId = prevIntraction
      ? getNextScreen((matchData as unknown as matchDataProps)?.json, buttonId)
      : nodes?.[0]?.id;
    if (isAutomationValid && !nextScreenId) {
      nextScreenId = nodes?.[0]?.id;
    }
    if (!nextScreenId) return false;
    const node = nodes?.find((node) => node.id === nextScreenId);

    const waAutomatedReplyMessage = await prisma.waAutomatedReplyMessage.create(
      {
        data: {
          orgId,
          waAutomatedReplyId: automation?.id,
          phone: from,
          currentScreen: nextScreenId ?? "",
          message: message ?? "",
        },
      },
    );
    if (enableTicket && validateAutomationMatchCondition(automation, message)) {
      await autoGenerateTicket({
        teamId,
        waAutomatedReplyMessageId: waAutomatedReplyMessage.id,
      });
    }
    if (!node) return false;

    let components = node?.data?.components;
    if (!components?.length) return false;

    for (const component of components) {
      orgId && updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
      if (
        component?.type === ReplyComponentType.BasicText &&
        Array.isArray(component?.name)
      ) {
        let buttons = component?.name?.splice(1);
        if (buttons?.length === 0) {
          await sendTextMessage(
            { phone: from, orgId },
            "",
            component?.name[0]?.value,
          );
        } else {
          await sendMessage(
            orgId,
            createReplyButtonsMessage(
              from,
              "",
              component?.name?.[0]?.value,
              buttons,
            ),
            teamId,
          );
        }
      } else if (
        component?.type === ReplyComponentType?.Template &&
        typeof component?.name === "string"
      ) {
        await sendTemplateToUserCore(
          orgId,
          component?.name,
          from,
          component?.parameter ?? [],
          teamId,
        );
      } else if (
        component?.type === ReplyComponentType?.Flow &&
        typeof component?.name === "string"
      ) {
        const serviceParam = {
          orgId,
          dbFlowId: component?.name,
          phone: from,
        };
        await sendFlow(serviceParam);
      } else if (
        component?.type === ReplyComponentType?.Image &&
        typeof component?.name === "object" &&
        !Array.isArray(component?.name)
      ) {
        await sendMessage(
          orgId,
          createReplyImageMessage(
            from,
            getFileUrlFromKey(component?.name?.image),
          ),
          teamId,
        );
      } else if (
        component?.type === ReplyComponentType.List &&
        Array.isArray(component?.name)
      ) {
        let buttons = component?.name?.splice(1);
        if (buttons?.length === 0) {
          await sendTextMessage(
            { phone: from, orgId },
            "",
            component?.name[0]?.value,
          );
        } else {
          await sendMessage(
            orgId,
            createListMessage(
              from,
              null,
              component?.name?.[0]?.value,
              "options",
              buttons,
            ),
            teamId,
          );
        }
      }
    }
    return true;
  } else {
    throw new Error("Not implemented");
  }
}

function getNextScreen(data, buttonId) {
  // Find the screen node that contains the buttonId in its components
  const screenNode = data.nodes.find((node) =>
    node.data.components.some(
      (comp) =>
        Array.isArray(comp?.name) &&
        comp?.name.some((name) => name.id === buttonId),
    ),
  );
  if (!screenNode) {
    return null;
  }

  // Find the component with the given buttonId
  const component = screenNode.data.components.find(
    (comp) =>
      Array.isArray(comp?.name) &&
      comp?.name?.some((name) => name.id === buttonId),
  );
  if (!component) {
    return null;
  }

  // Find the name object with the given buttonId to get the id
  const nameObject = component.name.find((name) => name.id === buttonId);
  if (!nameObject) {
    return null;
  }

  // Find the edge with the sourceHandle matching the id
  const edge = data.edges.find(
    (edge) =>
      edge.source === screenNode.id &&
      edge.sourceHandle === nameObject.id.toString(),
  );
  if (!edge) {
    return null;
  }

  // Return the target screen id
  return edge.target;
}

// Example usage:
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

export enum ReplyComponentType {
  BasicText = "BasicText",
  Flow = "Flow",
  Template = "Template",
  Image = "Image",
  List = "List",
}
