import {
  SubscriptionFeaturePathName,
  WaAutomatedReplyMatchType,
  WaTemplateComponentType,
} from "../../../types/enums";
import {
  WaMessageBody,
  WaReceiveMessageBody,
} from "../../../types/whatsapp.types";
import { parseMessage } from "../whatsappSurvey/wasurvey.utils";
import { getAutomatedRepliesByOrgId } from "./wa_automatedReply.service";
import { log } from "../../../utils/logger";
import prisma from "../../../utils/prisma";
import { templateData } from "../messageTemplates/wa_templates.service";
import { FastifyReply, FastifyRequest } from "fastify";
import { getNestedProperty } from "../../../utils/misc/obj.utils";
import { findRecentAutomation } from "../whatsappSurvey/automation-logger.utils";
import { getContactByPhoneNumberAndOrgId } from "../../contact/contact.service";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Enhanced validation for automation match conditions including contact and time filters
 */
export async function validateAutomationMatchCondition(
  automation: {
    commands: string[];
    matchType: string;
    matchData: any;
    id: string;
    name: string;
    createdAt: Date;
    teamId?: string;
    sendOnceIn24Hours?: boolean;
  },
  message: string,
  orgId?: string,
  phone?: string,
  orgTimezone?: string,
): Promise<boolean> {
  const { matchType, matchData, commands } = automation;
  if (automation.sendOnceIn24Hours) {
    const recentActivity = await findRecentAutomation(phone, orgId, {
      timeWindow: 24 * 60 * 60 * 1000, // 24 hours
    });
    if (recentActivity) return;
  }
  // First validate the message matching logic (existing logic)
  let messageMatches = false;

  // Helper to check whole word match
  function includesWholeWord(
    text: string,
    word: string,
    caseSensitive: boolean,
  ) {
    const flags = caseSensitive ? "g" : "gi";
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedWord}\\b`, flags);
    return regex.test(text);
  }

  if (matchType === WaAutomatedReplyMatchType.Exact) {
    if (matchData.caseSensitive) {
      messageMatches = commands?.[0] === message;
    } else {
      messageMatches = commands?.[0]?.toLowerCase() === message?.toLowerCase();
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

    const caseSensitive = !!matchData.caseSensitive;
    messageMatches = commands[comparator]((keyword) =>
      includesWholeWord(message, keyword, caseSensitive),
    );
  } else {
    throw new Error(`WaAutomation not implemented for: ${matchType}`);
  }

  // If message doesn't match, return false early
  if (!messageMatches) return false;

  // If we don't have orgId and phone for additional validations, return message match result
  if (!orgId || !phone) return messageMatches;

  // Validate contact filters
  const contactFiltersValid = await validateContactFilters(
    matchData.contactFilters,
    orgId,
    phone,
  );
  if (!contactFiltersValid) return false;

  // Validate time window
  const timeWindowValid = validateTimeWindow(matchData.timeWindow, orgTimezone);
  if (!timeWindowValid) return false;

  return true;
}

/**
 * If any automatedReplyCondition matches: returns the automation
 * if none of them matches: returns undefined
 */
export async function checkIfMessageMatchesAnyAutomation(
  orgId: string,
  waMessage: WaMessageBody,
  phone: string,
) {
  const { message } = parseMessage(waMessage);
  let phone_number_id = (
    waMessage?.entry?.[0]?.changes?.[0]?.value as WaReceiveMessageBody
  )?.metadata?.phone_number_id;
  const automatedReplies = await getAutomatedRepliesByOrgId(
    orgId,
    phone_number_id,
  );
  const orgTimezone =
    //  org?.timezone ||
    "UTC";

  for (const automation of automatedReplies) {
    const isMatch = await validateAutomationMatchCondition(
      automation,
      message,
      orgId,
      phone,
      orgTimezone,
    );
    if (isMatch) {
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
          teamId?: string;
          columnId?: string;
        }>;
      };
    }>;
    edges: Array<{}>;
  };
};

// Example usage:
export function generateOrderReferenceId() {
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
  Ticket = "Ticket",
  AiBot = "AiBot",
}

export async function verifyAutomationLimit(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    let orgId = request.user.orgId;
    const subscription = request.subscription;
    if (!subscription) throw new Error("Subscription not found");

    const automatedReplyCount = await prisma.waAutomatedReply.count({
      where: {
        orgId: orgId,
      },
    });

    const whatsappAutomationFeature = getNestedProperty(
      subscription.features as any,
      SubscriptionFeaturePathName.WhatsAppAutomation,
    );
    if (automatedReplyCount >= whatsappAutomationFeature?.count?.max) {
      throw new Error(
        `You have reached the maximum limit of ${whatsappAutomationFeature?.count?.max} automated replies.`,
      );
    }
  } catch (e) {
    return reply.code(403).send({
      message: e?.message,
      displayMessageInClient: true,
    });
  }
}

/**
 * Validates contact-based filter conditions
 */
async function validateContactFilters(
  contactFilters: any,
  orgId: string,
  phone: string,
): Promise<boolean> {
  if (!contactFilters) return true;

  const contact = await getContactByPhoneNumberAndOrgId(phone, orgId);
  if (!contact) return false;

  // Check if automation should only trigger for new contacts
  if (contactFilters.newContactsOnly) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (contact.createdAt < oneDayAgo) {
      return false;
    }
  }

  // Check if contact is in required groups
  if (contactFilters.inGroups?.length > 0) {
    const contactGroups =
      contact?.contactGroups?.map((g) => g.contactGroupId) || [];
    const requiredGroups = contactFilters.inGroups;
    const hasRequiredGroup = requiredGroups.some((group) =>
      contactGroups.includes(group),
    );
    return hasRequiredGroup;
  }

  // Check if contact has values for required fields
  if (contactFilters.requiredFieldsWithAnyValue?.length > 0) {
    const customFieldsMap = new Map(
      contact.customFields?.map((cf) => [cf.fieldId, cf.value]) || [],
    );

    for (const fieldSlug of contactFilters.requiredFieldsWithAnyValue) {
      const fieldValue = customFieldsMap.get(fieldSlug);

      // Check custom fields first
      if (fieldValue && fieldValue.trim()) continue;

      // Check built-in fields
      switch (fieldSlug.toLowerCase()) {
        case "email":
          if (contact.email && contact.email.trim()) continue;
          break;
        case "name":
          if (contact.name && contact.name.trim()) continue;
          break;
        case "phone":
          if (contact.phone && contact.phone.trim()) continue;
          break;
        default:
          // Field doesn't have a value
          return false;
      }
    }
  }

  return true;
}

/**
 * Validates time window conditions
 */
function validateTimeWindow(
  timeWindow: any,
  orgTimezone: string = "UTC",
): boolean {
  if (!timeWindow?.enabled) return true;

  const now = dayjs();
  // .tz(orgTimezone);
  const currentDay = now.format("ddd").toLowerCase();
  const currentTime = now.format("HH:mm");

  // Check if current day is in allowed days
  const allowedDays = timeWindow.days || [];
  if (allowedDays.length > 0 && !allowedDays.includes(currentDay)) {
    return false;
  }

  // If all day is enabled, we only check the day
  if (timeWindow.allDay) {
    return true;
  }

  // Validate time range
  const startTime = timeWindow.startTime;
  const endTime = timeWindow.endTime;

  if (!startTime || !endTime) {
    return true; // If no time specified, allow all times
  }
  const current = dayjs(currentTime, "HH:mm");
  const start = dayjs(startTime, "HH:mm");
  const end = dayjs(endTime, "HH:mm");

  if (start.isAfter(end)) {
    return current.isAfter(start) || current.isBefore(end);
  } else {
    return current.isAfter(start) && current.isBefore(end);
  }
}
