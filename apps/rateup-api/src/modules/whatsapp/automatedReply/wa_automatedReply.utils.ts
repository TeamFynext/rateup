import {
  SubscriptionFeaturePathName,
  WaAutomatedReplyMatchType,
  WaTemplateComponentType,
} from "../../../types/enums.js";
import { WaMessageBody } from "../../../types/whatsapp.types.js";
import { assignChat } from "../whatsappSurvey/wasurvey.utils.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { templateData } from "../messageTemplates/wa_templates.service.js";
import { FastifyReply, FastifyRequest } from "fastify";
import { getNestedProperty } from "../../../utils/misc/obj.utils.js";
import {
  findRecentAutomation,
  logAutomationAction,
} from "../whatsappSurvey/automation-logger.utils.js";
import {
  getContactByPhoneNumberAndOrgId,
  getOrCreateContactByPhone,
} from "../../contact/contact.service.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import { getTeamIdsByUserId } from "../../team/team.service.js";
import { assignWaMessageToUser } from "../inbox/message/wamessage.service.js";
import { getUserIdsByTeamId } from "../../user/user.service.js";
import { sendTextMessage } from "../whatsappSurvey/wasurvey.service.js";
import { sendTemplateToUserCore } from "../messageTemplates/wa_templates.controller.js";
import { sendFlow } from "../flows/flow.service.js";
import { processNextNode } from "../whatsappSurvey/wasurvey.controller.js";
import { TriggerEvent } from "../../../../generated/prisma/enums.js";
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
function includesWholePhrase(text, phrase, caseSensitive) {
  const flags = caseSensitive ? "g" : "gi";
  const escaped = phrase.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const regex = new RegExp(escaped, flags);
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
      includesWholePhrase(message, keyword, caseSensitive),
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

// Example usage:
export function generateOrderReferenceId() {
  const timestamp = Date.now().toString(36); // Convert timestamp to base36 for shorter representation
  const randomPart = Math.random().toString(36).substring(2, 7); // Generate a random 5-character string

  let referenceId = `ord-${timestamp}-${randomPart}`;

  // Ensure the length doesn't exceed 32 characters
  referenceId = referenceId.substring(0, 32);

  // Replace invalid characters with allowed ones
  referenceId = referenceId.replaceAll(/[^a-zA-Z0-9_.-]/g, "");

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
      if (fieldValue?.trim()) continue;

      // Check built-in fields
      switch (fieldSlug.toLowerCase()) {
        case "email":
          if (contact?.email?.trim()) continue;
          break;
        case "name":
          if (contact?.name?.trim()) continue;
          break;
        case "phone":
          if (contact?.phone?.trim()) continue;
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

export type RuleWithConditions = {
  id: string;
  name: string;
  operator: "AND" | "OR";
  isActive: boolean;
  triggerEvent: string;
  whatsappSettingsPhoneIds: string[];
  options?: {
    sendOncePerDay?: boolean;
    businessHours?: {
      enabled: boolean;
      businessHoursId: string;
    };
  } | null;
  groups: Array<{
    id: string;
    operator: "AND" | "OR";
    conditions: Array<{
      id: string;
      field: string;
      operator: string;
      value: string | null;
      messageBodyLock?: {
        businessHour: automationProps["businessHour"];
      };
    }>;
  }>;
  actions: Array<{
    id: string;
    type: string;
    value: any;
  }>;
};

/**
 * Validates a single rule condition
 */
async function validateRuleCondition(
  condition: RuleWithConditions["groups"][0]["conditions"][0],
  message: string,
  orgId: string,
  phone: string,
): Promise<boolean> {
  const { field, operator, value } = condition;

  switch (field) {
    case "MESSAGE_BODY": {
      if (!value) return false;

      // Check business hours if messageBodyLock exists
      if (condition.messageBodyLock?.businessHour) {
        const isWithinBusinessHours = validateTimeWindow(
          condition.messageBodyLock.businessHour,
        );
        if (!isWithinBusinessHours) return false;
      }

      // Handle wildcard '*' - matches any message if other conditions (like business hours) are met
      if (value === "*") {
        return true;
      }

      const caseSensitive = false; // You can make this configurable
      const messageToCheck = caseSensitive ? message : message.toLowerCase();
      const valueToCheck = caseSensitive ? value : value.toLowerCase();

      switch (operator) {
        case "CONTAINS":
          return includesWholePhrase(value, message, caseSensitive);
        case "EQUALS":
          return messageToCheck === valueToCheck;
        case "STARTS_WITH":
          return messageToCheck.startsWith(valueToCheck);
        case "ENDS_WITH":
          return messageToCheck.endsWith(valueToCheck);
        default:
          return false;
      }
    }

    case "CONTACT_EMAIL": {
      const contact = await getContactByPhoneNumberAndOrgId(phone, orgId);
      if (!contact?.email) return false;

      const email = contact.email.toLowerCase();
      const valueToCheck = (value || "").toLowerCase();

      switch (operator) {
        case "CONTAINS":
          return email.includes(valueToCheck);
        case "EQUALS":
          return email === valueToCheck;
        case "ENDS_WITH":
          return email.endsWith(valueToCheck);
        default:
          return false;
      }
    }

    case "CONTACT_GROUP": {
      if (!value) return false;
      const contact = await getContactByPhoneNumberAndOrgId(phone, orgId);
      if (!contact) return false;

      const contactGroups =
        contact?.contactGroups?.map((g) => g.contactGroupId) || [];
      return contactGroups.includes(value);
    }

    case "CONTACT_LABEL": {
      if (!value) return false;
      const contact = await getContactByPhoneNumberAndOrgId(phone, orgId);
      if (!contact) return false;

      const contactLabels =
        contact?.ContactLabelMap?.map((l) => l.labelId) || [];
      return contactLabels.includes(value);
    }

    case "CONTACT_LIFECYCLE": {
      if (!value) return false;
      const contact = await getContactByPhoneNumberAndOrgId(phone, orgId);
      if (!contact) return false;

      return contact.lifecycleId === value;
    }

    default:
      return false;
  }
}

/**
 * Validates a condition group (AND/OR logic for conditions within a group)
 */
async function validateConditionGroup(
  group: RuleWithConditions["groups"][0],
  message: string,
  orgId: string,
  phone: string,
): Promise<boolean> {
  const { operator, conditions } = group;

  if (operator === "AND") {
    for (const condition of conditions) {
      const isValid = await validateRuleCondition(
        condition,
        message,
        orgId,
        phone,
      );
      if (!isValid) return false;
    }
    return true;
  } else {
    // OR operator
    for (const condition of conditions) {
      const isValid = await validateRuleCondition(
        condition,
        message,
        orgId,
        phone,
      );
      if (isValid) return true;
    }
    return false;
  }
}

/**
 * Validates all condition groups for a rule (AND/OR logic at rule level)
 */
export async function validateRuleConditions(
  rule: RuleWithConditions,
  message: string,
  orgId: string,
  phone: string,
): Promise<boolean> {
  if (!rule.isActive) return false;

  // Check options before validating conditions
  if (rule.options) {
    // Check sendOncePerDay option
    if (rule.options.sendOncePerDay) {
      const recentActivity = await findRecentAutomation(phone, orgId, {
        timeWindow: 24 * 60 * 60 * 1000, // 24 hours
      });
      // If there's recent activity, rule fails (don't send again)
      if (recentActivity) return false;
    }

    // Check businessHours option
    if (rule.options.businessHours?.enabled) {
      const businessHour = await prisma.businessHour.findUnique({
        where: { id: rule.options.businessHours.businessHoursId },
      });
      if (businessHour) {
        const isWithinBusinessHours = validateTimeWindow(businessHour as any);
        if (!isWithinBusinessHours) return false;
      }
    }
  }

  if (
    rule.triggerEvent !== TriggerEvent.MESSAGE_RECEIVED &&
    rule.groups.length === 0
  )
    return true;
  if (rule.groups.length === 0) return false;

  const { operator, groups } = rule;

  if (operator === "AND") {
    for (const group of groups) {
      const isValid = await validateConditionGroup(
        group,
        message,
        orgId,
        phone,
      );
      if (!isValid) return false;
    }
    return true;
  } else {
    // OR operator
    for (const group of groups) {
      const isValid = await validateConditionGroup(
        group,
        message,
        orgId,
        phone,
      );
      if (isValid) return true;
    }
    return false;
  }
}

/**
 * Checks if any rule matches the given trigger event and executes corresponding actions
 * @param triggerEvent The event that triggered the check (MESSAGE_RECEIVED, CHAT_CLOSED, etc.)
 * @param context Context data needed for validation and action execution
 * @returns The matched rule with executed actions, or undefined if no match
 */
export async function checkAndExecuteRuleByTriggerEvent(
  triggerEvent: TriggerEvent,
  context: {
    orgId: string;
    phoneNumberId?: string;
    message?: string;
    phone?: string;
    waMessage?: WaMessageBody;
    contactId?: string;
  },
): Promise<
  | {
      rule: RuleWithConditions;
      executedActions: Array<{
        actionId: string;
        success: boolean;
        error?: string;
      }>;
    }
  | undefined
> {
  const { orgId, phoneNumberId, message, phone } = context;

  // Fetch all active rules for the given trigger event
  const rules = await prisma.rule.findMany({
    where: {
      orgId,
      isActive: true,
      triggerEvent: triggerEvent,
      ...(phoneNumberId && {
        whatsappSettingsPhoneIds: {
          has: phoneNumberId,
        },
      }),
    },
    include: {
      groups: {
        include: {
          conditions: {
            include: {
              messageBodyLock: {
                include: {
                  businessHour: true,
                },
              },
            },
          },
        },
      },
      actions: true,
    },
  });

  if (rules.length === 0) {
    log.trace(`No rules found for trigger event: ${triggerEvent}`);
    return undefined;
  }

  // Helper function to check if a rule has any business hour configuration
  const hasBusinessHours = (rule: any): boolean => {
    // Check rule-level business hours
    if (rule.options?.businessHours?.enabled === true) {
      return true;
    }
    // Check condition-level business hours (messageBodyLock)
    for (const group of rule.groups || []) {
      for (const condition of group.conditions || []) {
        if (condition.messageBodyLock?.businessHour) {
          return true;
        }
      }
    }
    return false;
  };

  // Separate rules into business hour rules and non-business hour rules
  const businessHourRules = rules.filter((rule) => hasBusinessHours(rule));
  const nonBusinessHourRules = rules.filter((rule) => !hasBusinessHours(rule));

  // First, try to match business hour rules
  for (const rule of businessHourRules) {
    let isMatch = false;

    // Validate based on trigger event type
    isMatch = await validateRuleConditions(
      rule as RuleWithConditions,
      message,
      orgId,
      phone,
    );

    if (isMatch) {
      log.trace(
        "Business hour rule matched! Executing actions for rule: %s",
        rule.name,
      );

      // Execute all actions for the matched rule
      const executedActions = await executeRuleActions(
        rule as RuleWithConditions,
        context,
      );

      return {
        rule: rule as RuleWithConditions,
        executedActions,
      };
    }
  }

  // Only if no business hour rules matched, try non-business hour rules
  for (const rule of nonBusinessHourRules) {
    let isMatch = false;

    // Validate based on trigger event type
    isMatch = await validateRuleConditions(
      rule as RuleWithConditions,
      message,
      orgId,
      phone,
    );

    if (isMatch) {
      log.trace(
        "Non-business hour rule matched! Executing actions for rule: %s",
        rule.name,
      );

      // Execute all actions for the matched rule
      const executedActions = await executeRuleActions(
        rule as RuleWithConditions,
        context,
      );

      return {
        rule: rule as RuleWithConditions,
        executedActions,
      };
    }
  }

  log.trace(`No matching rules found for trigger event: ${triggerEvent}`);
  return undefined;
}

/**
 * Executes all actions for a matched rule
 */
async function executeRuleActions(
  rule: RuleWithConditions,
  context: {
    orgId: string;
    phone?: string;
    message?: string;
    waMessage?: WaMessageBody;
    phoneNumberId?: string;
  },
): Promise<Array<{ actionId: string; success: boolean; error?: string }>> {
  const results = [];

  for (const action of rule.actions) {
    try {
      let success = false;

      switch (action.type) {
        case "CLOSE_TICKET":
          success = await executeCloseTicketAction(context);
          break;

        case "ATTACH_LABEL":
          success = await executeAttachLabelAction(
            action.value as string,
            context,
          );
          break;

        case "ASSIGN_USER":
          success = await executeAssignUserAction(
            action.value as string,
            context,
          );
          break;

        case "ASSIGN_TEAM":
          success = await executeAssignTeamAction(
            action.value as string,
            context,
          );
          break;

        case "ASSIGN_LIFECYCLE":
          success = await executeAssignLifecycleAction(
            action.value as string,
            context,
          );
          break;

        case "SEND_MESSAGE":
          success = await executeSendMessageAction(
            action.value as string,
            context,
          );
          break;

        case "SEND_TEMPLATE":
          success = await executeSendTemplateAction(
            action.value as string,
            context,
          );
          break;

        case "SEND_FLOW":
          success = await executeSendFlowAction(
            action.value as string,
            context,
          );
          break;

        case "TRIGGER_CHATBOT":
          success = await executeTriggerChatbotAction(
            action.value as string,
            context,
          );
          break;

        default:
          log.warn(`Unsupported action type: ${action.type}`);
      }

      results.push({
        actionId: action.id,
        success,
      });

      log.trace(`Action ${action.type} executed with result: ${success}`);
    } catch (error) {
      log.error(
        `Error executing action ${action.id} (${action.type}): %o`,
        error,
      );
      results.push({
        actionId: action.id,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

// Action executor functions
async function executeCloseTicketAction(context: any): Promise<boolean> {
  if (!context.orgId || !context.phone) return false;

  await prisma.contact.update({
    where: {
      contact_phone_org_id_unique: {
        phone: context.phone,
        orgId: context.orgId,
      },
    },
    data: {
      closedAt: new Date(),
      waMessageAssignStatus: "UNASSIGNED",
    },
  });

  return true;
}

async function executeAttachLabelAction(
  labelId: string,
  context: any,
): Promise<boolean> {
  if (!context.orgId || !context.phone || !labelId) return false;
  const contactId = await prisma.contact.findFirst({
    where: {
      orgId: context.orgId,
      phone: context.phone,
    },
    select: {
      id: true,
    },
  });

  await prisma.contactLabelMap.upsert({
    where: {
      contactId_labelId: {
        contactId: contactId?.id,
        labelId: labelId,
      },
    },
    create: {
      contactId: contactId?.id,
      labelId: labelId,
    },
    update: {},
  });

  return true;
}

async function executeAssignUserAction(
  userId: string,
  context: any,
): Promise<boolean> {
  if (!context.phone || !userId || !context.orgId) return false;

  const contact = await getOrCreateContactByPhone(context.phone, context.orgId);
  if (!contact) return false;

  const teams = await getTeamIdsByUserId(userId);
  if (teams.length === 0) return false;

  await assignWaMessageToUser(
    {
      assignees: [{ userId, teamId: teams[0] }],
      contactId: contact?.contact?.id,
      assignIfOnline: true,
    },
    context.orgId,
  );

  return true;
}

async function executeAssignTeamAction(
  teamId: string,
  context: any,
): Promise<boolean> {
  if (!context.phone || !teamId || !context.orgId) return false;

  const contact = await getOrCreateContactByPhone(context.phone, context.orgId);
  if (!contact) return false;

  const users = await getUserIdsByTeamId(teamId);
  if (users.length === 0) return false;

  const assigned = await assignChat(teamId, users, null);

  await assignWaMessageToUser(
    {
      assignees: [{ userId: assigned, teamId }],
      contactId: contact?.contact?.id,
      assignIfOnline: false,
    },
    context.orgId,
  );

  return true;
}

async function executeAssignLifecycleAction(
  lifecycleId: string,
  context: {
    orgId: string;
    phone?: string;
    message?: string;
  },
): Promise<boolean> {
  if (!context.phone || !context.orgId || !lifecycleId) return false;

  await prisma.contact.update({
    where: {
      contact_phone_org_id_unique: {
        phone: context.phone,
        orgId: context.orgId,
      },
    },
    data: { lifecycleId },
  });

  return true;
}

async function executeSendMessageAction(
  messageText: string,
  context: any,
): Promise<boolean> {
  if (!context.phone || !messageText || !context.orgId) return false;

  await sendTextMessage(
    { phone: context.phone, orgId: context.orgId },
    null,
    messageText,
  );

  return true;
}

async function executeSendTemplateAction(
  templateId: string,
  context: any,
): Promise<boolean> {
  if (!context.phone || !templateId || !context.orgId) return false;

  await sendTemplateToUserCore(
    context.orgId,
    templateId,
    context.phone,
    [],
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    context.phoneNumberId,
  );

  return true;
}

async function executeSendFlowAction(
  flowId: string,
  context: any,
): Promise<boolean> {
  if (!context.phone || !flowId || !context.orgId) return false;

  await sendFlow({
    orgId: context.orgId,
    dbFlowId: flowId,
    phone: context.phone,
    whatsappSettingsPhoneId: context.phoneNumberId,
  });

  return true;
}

/**
 * Starts an automation flow from the beginning (start node)
 * This is used when a rule action triggers an automation
 * @param phone User's phone number
 * @param automation The automation flow data
 * @param parsedMessage Parsed message data from WhatsApp
 * @param orgId Organization ID
 * @returns Promise that resolves when the automation has started
 */
async function startAutomationFlow(
  phone: string,
  automation: any,
  parsedMessage: { message: string; from: string },
  orgId: string,
) {
  const startNode = automation?.matchData?.json?.nodes?.find(
    (node: any) => node.type === "startNode",
  );

  if (!startNode) {
    log.error(`No start node found in automation ${automation.id}`);
    return;
  }

  // Create record of this interaction using the utility function
  const automationLog = await logAutomationAction({
    phone,
    nodeId: startNode.id,
    automationId: automation.id,
    orgId,
    response: {
      value: parsedMessage?.message,
      action: "rule_triggered",
    },
  });

  // Import processNextNode dynamically to avoid circular dependencies

  await processNextNode(
    phone,
    automation,
    startNode.id,
    orgId,
    automationLog?.id,
  );
}

async function executeTriggerChatbotAction(
  chatbotId: string,
  context: any,
): Promise<boolean> {
  if (!context.phone || !chatbotId || !context.orgId) return false;

  // Check if the chatbot action should trigger an automation flow instead
  const automation = await prisma.waAutomatedReply.findFirst({
    where: {
      orgId: context.orgId,
      id: chatbotId,
    },
  });

  if (automation) {
    await startAutomationFlow(
      context.phone,
      automation,
      { message: context.message || "", from: context.phone },
      context.orgId,
    );
    return true;
  }

  return true;
}
