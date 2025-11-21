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
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);

export type automationProps = {
  commands: string[];
  businessHour: {
    id: string;
    name: string;
    createdAt: Date;
    orgId: string;
    timezone: string;
    channels: string[];
    description: string | null;
    schedule: {
      friday: {
        isOpen: boolean;
        timeSlots: [{ openTime: string; closeTime: string }];
      };
      monday: {
        isOpen: boolean;
        timeSlots: [{ openTime: string; closeTime: string }];
      };
      sunday: {
        isOpen: boolean;
        timeSlots: [{ openTime: string; closeTime: string }];
      };
      tuesday: {
        isOpen: boolean;
        timeSlots: [{ openTime: string; closeTime: string }];
      };
      saturday: {
        isOpen: boolean;
        timeSlots: [{ openTime: string; closeTime: string }];
      };
      thursday: {
        isOpen: boolean;
        timeSlots: [{ openTime: string; closeTime: string }];
      };
      wednesday: {
        isOpen: boolean;
        timeSlots: [{ openTime: string; closeTime: string }];
      };
    } | null;
    updatedAt: Date;
  } | null;
  id: string;
  name: string;
  createdAt: Date;
  matchData: any;
  matchType: string;
  orgId: string | null;
  whatsappSettingsPhoneId: string | null;
  whatsappSettingsPhoneIds: string[];
  isEnabled: boolean;
  sendOnceIn24Hours: boolean;
};
// Helper to check whole word match
function includesWholeWord(text: string, word: string, caseSensitive: boolean) {
  const flags = caseSensitive ? "g" : "gi";
  const escapedWord = word.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const regex = new RegExp(`\\b${escapedWord}\\b`, flags);
  return regex.test(text);
}

/**
 * Enhanced validation for automation match conditions including contact and time filters
 */
export async function validateAutomationMatchCondition(
  automation: automationProps,
  message: string,
  orgId?: string,
  phone?: string,
): Promise<boolean> {
  const { matchType, matchData, commands } = automation;
  if (automation.sendOnceIn24Hours) {
    const recentActivity = await findRecentAutomation(phone, orgId, {
      timeWindow: 24 * 60 * 60 * 1000, // 24 hours
    });
    if (recentActivity) return false;
  }
  // First validate the message matching logic (existing logic)
  let messageMatches = false;

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

  // First, filter automations that match the message conditions
  const matchingAutomations = [];
  for (const automation of automatedReplies) {
    const isMatch = await validateAutomationMatchCondition(
      automation as automationProps,
      message,
      orgId,
      phone,
    );
    if (isMatch) {
      matchingAutomations.push(automation);
    }
  }

  if (matchingAutomations.length === 0) {
    return undefined;
  }

  const selectedAutomation =
    selectAutomationByBusinessHours(matchingAutomations);

  if (selectedAutomation) {
    log.trace("Automation Matched! %o", selectedAutomation);
    return selectedAutomation;
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
export function validateTimeWindow(
  businessHour: automationProps["businessHour"],
): boolean {
  if (!businessHour?.schedule) return true;

  const now = dayjs().tz(businessHour.timezone);
  const currentDay = now
    .format("dddd")
    .toLowerCase() as keyof typeof businessHour.schedule;
  const currentTime = now.format("HH:mm");

  const daySchedule = businessHour.schedule[currentDay];

  // Check if business is open on current day
  if (!daySchedule?.isOpen) {
    return false;
  }

  // Check if current time falls within any of the time slots
  for (const slot of daySchedule.timeSlots) {
    const current = dayjs(currentTime, "HH:mm");
    const start = dayjs(slot.openTime, "HH:mm");
    const end = dayjs(slot.closeTime, "HH:mm");

    if (start.isAfter(end)) {
      // Handles overnight shifts (e.g., 22:00 to 06:00)
      if (current.isAfter(start) || current.isBefore(end)) {
        return true;
      }
    } else if (current.isSameOrAfter(start) && current.isBefore(end)) {
      return true;
    }
  }

  return false;
}

/**
 * Selects the best automation from a list based on business hour validation
 * @param automations Array of automations with businessHour property
 * @returns Selected automation or undefined if none match
 */
export function selectAutomationByBusinessHours<
  T extends { businessHour: any },
>(automations: T[]): T | undefined {
  let selectedAutomation: T | undefined;

  // First priority: Look for automations with business hours that are currently valid
  const businessHourAutomations = automations.filter(
    (automation) => automation.businessHour !== null,
  );

  for (const automation of businessHourAutomations) {
    const timeWindowValid = validateTimeWindow(
      automation.businessHour as automationProps["businessHour"],
    );
    if (timeWindowValid) {
      selectedAutomation = automation;
      break;
    }
  }

  // Second priority: If no valid business hour automation found, use null business hour automation
  if (!selectedAutomation) {
    selectedAutomation = automations.find(
      (automation) => automation.businessHour === null,
    );
  }

  return selectedAutomation;
}
