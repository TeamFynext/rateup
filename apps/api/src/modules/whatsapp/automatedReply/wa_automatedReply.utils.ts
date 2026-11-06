import {
  ShopifyEvents,
  WaAutomatedReplyMatchType,
  WaMessageAssignStatus,
  WaTemplateComponentType,
} from "../../../types/enums.js";
import { WaMessageBody } from "../../../types/whatsapp.types.js";
import type { OutgoingTemplateComponent } from "../../../types/whatsapp.types.js";
import type { AutomationWithGraph } from "../whatsappSurvey/node-types.js";
import { assignChat } from "../whatsappSurvey/wasurvey.utils.js";
import { log } from "../../../utils/logger.js";
import { generateLocalMessageId } from "../../../utils/messageId.js";
import prisma from "../../../utils/prisma.js";
import { readWaPaymentConfigurations } from "../../integrations/wapayment/wapayment.types.js";
import redisConnection from "../../../utils/redisConnection.js";
import { templateData } from "../messageTemplates/wa_templates.service.js";
import { logAutomationAction } from "../whatsappSurvey/automation-logger.utils.js";
import {
  getContactByPhoneNumberAndOrgId,
  getOrCreateContactByPhone,
  getOrCreateContactByPsid,
  updateContactById,
} from "../../contact/contact.service.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { getTeamIdsByUserId } from "../../team/team.service.js";
import { assignWaMessageToUser } from "../inbox/message/wamessage.service.js";
import { getUserIdsByTeamId } from "../../user/user.service.js";
import { sendTextMessage } from "../whatsappSurvey/wasurvey.service.js";
import { sendTemplateToUserCore } from "../messageTemplates/wa_templates.controller.js";
import { sendFlow } from "../flows/flow.service.js";
import { processNextNode } from "../whatsappSurvey/wasurvey.controller.js";
import { PlatformType, TriggerEvent } from "../../../generated/prisma/enums.js";
import type { LeadChannel, LeadSource } from "../../../generated/prisma/client.js";
import {
  getContactStage,
  openLeadOnPipelineForContact,
  resolvePipelineForContact,
  setContactStage,
} from "../../pipeline/pipelineLead/lead.service.js";
import {
  replyToInstagramComment,
  sendInstagramPrivateReply,
  sendInstagramTextMessage,
} from "../instagram/instagram_messaging.service.js";
import { startMetaFlow, type MetaFlowAutomation } from "./metaFlow.service.js";
import { sendSendApiText, type PendingComment } from "../meta/sendApiMessages.js";
import { replyToFacebookComment } from "../facebook/facebook_comments.service.js";
import { getMetaAutomationById } from "./instagram_automatedReply.service.js";
import { ShopifyBody } from "../../integrations/shopify/shopify.types.js";
import { resolveWooPathValue } from "../../integrations/woocommerce/woocommerce.mapping.js";
import { resolveShopifyPathValue } from "../../integrations/shopify/shopify.mapping.js";
import { getShopifyProductImage } from "../../integrations/shopify/shopify.catalog.js";
import axios from "axios";
import { assertPublicUrl, publicAxiosOptions } from "../../../utils/ssrf.js";
import { triggerConversionsApiForContact } from "../../integrations/meta/conversions.service.js";
import { adRuleMatches, adRuleSpecificity, type AdReferralContext } from "./adReferralTrigger.js";
import { emitIntegrationEvent } from "../../integrations/events/emitIntegrationEvent.js";
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
// validateTimeWindow parses "HH:mm" slots, which needs customParseFormat. This module
// used to get it only as a side effect of importing wasurvey.utils.js for assignChat —
// so dropping that import would have made every time-slot comparison silently return
// false, and automations would have stopped firing during business hours with no error.
dayjs.extend(customParseFormat);

export interface automationProps {
  commands: string[];
  businessHour: {
    id: string;
    name: string;
    createdAt: Date;
    orgId: string;
    timezone: string;
    channels: string[];
    description: string | null;
    // See BusinessHourSchedule in global.d.ts — this is the stored shape.
    schedule: BusinessHourSchedule | null;
    updatedAt: Date;
  } | null;
  id: string;
  name: string;
  createdAt: Date;
  matchData: WaAutomatedReplyMatchData;
  matchType: string;
  orgId: string | null;
  whatsappSettingsPhoneId: string | null;
  whatsappSettingsPhoneIds: string[];
}
// Helper to check substring match while preserving optional case sensitivity
export function includesWholePhrase(text: string, phrase: string, caseSensitive = false) {
  const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const flags = caseSensitive ? "" : "i";

  return new RegExp(String.raw`(?<!\w)${escapedPhrase}(?!\w)`, flags).test(text);
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
  // First validate the message matching logic (existing logic)
  let messageMatches = false;

  if (matchType === WaAutomatedReplyMatchType.Exact) {
    if (matchData.caseSensitive) {
      messageMatches = commands?.[0] === message;
    } else {
      messageMatches = commands?.[0]?.toLowerCase() === message?.toLowerCase();
    }
  } else if (
    [WaAutomatedReplyMatchType.ContainsAllOf, WaAutomatedReplyMatchType.ContainsAnyOf].includes(
      matchType as WaAutomatedReplyMatchType,
    )
  ) {
    let comparator: "some" | "every";

    if (WaAutomatedReplyMatchType.ContainsAllOf === matchType) {
      comparator = "every";
    } else if (WaAutomatedReplyMatchType.ContainsAnyOf === matchType) {
      comparator = "some";
    } else {
      // Unreachable: the outer `else if` above already restricted matchType
      // to one of these two values before entering this branch.
      throw new Error(`WaAutomation not implemented for: ${matchType}`);
    }

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
  const contactFiltersValid = await validateContactFilters(matchData.contactFilters, orgId, phone);
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
    components: WaMetaTemplateComponent[];
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

  // The list synced from Meta on the WhatsApp Payment settings page; the first
  // configuration is the one sent, as a Razorpay gateway.
  const credential = readWaPaymentConfigurations(config?.credential);
  if (credential.length === 0) {
    throw new Error("No WhatsApp payment configuration; fetch them on the WhatsApp Payment page");
  }
  const t = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneNo,
    type: "interactive",
    interactive: {
      type: "order_details",
      body: {
        text: template.data.components?.find(
          (data) => data.type.toString().toLowerCase() === WaTemplateComponentType.BODY,
        )?.text,
      },
      footer: {
        text: template.data.components?.find(
          (data) => data.type.toString().toLowerCase() === WaTemplateComponentType.FOOTER,
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
                configuration_name: credential?.[0]?.configuration_name,
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

/**
 * How a rule finds the contact it is about. Messenger contacts have no phone, only the
 * page-scoped `psid` the event carries; WhatsApp contacts are keyed by phone, and
 * Instagram contacts carry their igsId in `phone` as well as `igsId`. `recipient` is
 * `context.phone`, which holds whichever of those the platform uses.
 */
function ruleContactWhere(platform: string | null | undefined, recipient: string, orgId: string) {
  return platform === "FACEBOOK" ? { psid: recipient, orgId } : { phone: recipient, orgId };
}

function ruleContactUnique(platform: string | null | undefined, recipient: string, orgId: string) {
  return platform === "FACEBOOK"
    ? { contact_psid_org_id_unique: { psid: recipient, orgId } }
    : { contact_phone_org_id_unique: { phone: recipient, orgId } };
}

/** The contact a rule's conditions read, with the groups and labels they check. */
export async function findRuleContact(
  platform: string | null | undefined,
  recipient: string,
  orgId: string,
) {
  if (platform !== "FACEBOOK") return getContactByPhoneNumberAndOrgId(recipient, orgId);
  return prisma.contact.findFirst({
    where: ruleContactWhere(platform, recipient, orgId),
    include: { customFields: true, contactGroups: true, ContactLabelMap: true },
  });
}

/**
 * Validates contact-based filter conditions
 */
async function validateContactFilters(
  contactFilters: WaAutomationContactFilters | null | undefined,
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
  const requiredGroups = contactFilters.inGroups;
  if (requiredGroups?.length) {
    const contactGroups = contact?.contactGroups?.map((g) => g.contactGroupId) || [];
    return requiredGroups.some((group) => contactGroups.includes(group));
  }

  // Check if contact has values for required fields
  const requiredFields = contactFilters.requiredFieldsWithAnyValue;
  if (requiredFields?.length) {
    const customFieldsMap = new Map(
      contact.customFields?.map((cf) => [cf.fieldId, cf.value]) || [],
    );

    for (const fieldSlug of requiredFields) {
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
export function validateTimeWindow(businessHour: automationProps["businessHour"]): boolean {
  if (!businessHour?.schedule) return true;

  const now = dayjs().tz(businessHour.timezone);
  const currentDay = now.format("dddd").toLowerCase() as keyof typeof businessHour.schedule;
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

export interface RuleWithConditions {
  id: string;
  name: string;
  platform: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";
  /** Empty only on a row written before multi-channel rules; `platform` stands in then. */
  platforms: Array<"WHATSAPP" | "INSTAGRAM" | "FACEBOOK">;
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
    shopifyEvent?: ShopifyEvents;
    shopifyProductIds?: string[];
    wooEvent?: string;
    wooProductIds?: string[];
    shopOrderEvent?: string;
    shopProductIds?: string[];
    abandonedCheckoutDelayMinutes?: number;
    requireMarketingConsent?: boolean;
    instagramScope?: "ALL" | "SPECIFIC";
    instagramPostIds?: string[];
    instagramPublicReplies?: string[];
    instagramCommentSource?: "ALL" | "POSTS" | "LIVE";
    instagramRef?: string;
    instagramStoryScope?: "ALL" | "SPECIFIC";
    instagramStoryIds?: string[];
    instagramStoryKeywords?: string[];
    adIds?: string[];
    adMatch?: string;
    messengerRef?: string;
  } | null;
  groups: Array<{
    id: string;
    operator: "AND" | "OR";
    conditions: Array<{
      id: string;
      field: string;
      operator: string;
      value: string | null;
      /** One per channel, all carrying the rule's business hours. */
      messageBodyLocks?: Array<{
        businessHour: automationProps["businessHour"] | null;
      }>;
    }>;
  }>;
  actions: Array<{
    id: string;
    type: string;
    /** Action-specific payload; the executor switches on `type` to read it. */
    value: unknown;
  }>;
}

/**
 * Validates a single rule condition
 */
async function validateRuleCondition(
  condition: RuleWithConditions["groups"][0]["conditions"][0],
  message: string,
  orgId: string,
  phone: string,
  platform?: string | null,
): Promise<boolean> {
  const { field, operator, value } = condition;

  switch (field) {
    case "MESSAGE_BODY": {
      if (!value) return false;

      // Check business hours if the keyword was locked to them
      const lockedHours = condition.messageBodyLocks?.[0]?.businessHour;
      if (lockedHours) {
        const isWithinBusinessHours = validateTimeWindow(lockedHours);
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
          return includesWholePhrase(message, value, caseSensitive);
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
      const contact = await findRuleContact(platform, phone, orgId);
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
      const contact = await findRuleContact(platform, phone, orgId);
      if (!contact) return false;

      const contactGroups = contact?.contactGroups?.map((g) => g.contactGroupId) || [];
      return contactGroups.includes(value);
    }

    case "CONTACT_LABEL": {
      if (!value) return false;
      const contact = await findRuleContact(platform, phone, orgId);
      if (!contact) return false;

      const contactLabels = contact?.ContactLabelMap?.map((l) => l.labelId) || [];
      return contactLabels.includes(value);
    }

    case "CONTACT_LIFECYCLE": {
      if (!value) return false;
      const contact = await findRuleContact(platform, phone, orgId);
      if (!contact) return false;

      return contact.lifecycleId === value;
    }

    /**
     * The board column the contact's lead sits in — the successor to
     * CONTACT_LIFECYCLE.
     *
     * A contact with no lead has no stage, so the condition is simply false
     * rather than an error: not being on the board is an ordinary state, and a
     * rule asking "is this contact in Negotiation" should say no.
     */
    case "CONTACT_STAGE": {
      if (!value) return false;
      const contact = await findRuleContact(platform, phone, orgId);
      if (!contact) return false;

      const stage = await getContactStage(contact.id, orgId);
      return stage?.stageId === value;
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
  platform?: string | null,
): Promise<boolean> {
  const { operator, conditions } = group;

  if (operator === "AND") {
    for (const condition of conditions) {
      const isValid = await validateRuleCondition(condition, message, orgId, phone, platform);
      if (!isValid) return false;
    }
    return true;
  } else {
    // OR operator
    for (const condition of conditions) {
      const isValid = await validateRuleCondition(condition, message, orgId, phone, platform);
      if (isValid) return true;
    }
    return false;
  }
}

/**
 * The channel a rule acts on for an event: the event's own, when the rule runs there. An event
 * that could not name its channel (a contact with no conversation yet) uses the rule's first.
 */
export function actingPlatform(
  rule: Pick<RuleWithConditions, "platform" | "platforms">,
  eventPlatform?: string,
): "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" {
  const platforms = rule.platforms?.length ? rule.platforms : [rule.platform ?? "WHATSAPP"];
  return platforms.find((platform) => platform === eventPlatform) ?? platforms[0];
}

const RULE_INCLUDE = {
  groups: {
    include: {
      conditions: {
        include: { messageBodyLocks: { include: { businessHour: true } } },
      },
    },
  },
  actions: true,
} as const;

function ruleSendOncePerDayKey(ruleId: string, phone: string): string {
  return `rule:${ruleId}:sendOncePerDay:${phone}`;
}

/**
 * Validates all condition groups for a rule (AND/OR logic at rule level)
 */
export async function validateRuleConditions(
  rule: RuleWithConditions,
  message: string,
  orgId: string,
  phone: string,
  platform: string = actingPlatform(rule),
): Promise<boolean> {
  if (!rule.isActive) return false;

  // Check options before validating conditions
  if (rule.options) {
    // Check sendOncePerDay option
    if (rule.options.sendOncePerDay) {
      const alreadySentToday = await redisConnection.exists(ruleSendOncePerDayKey(rule.id, phone));
      // If this rule already fired for this contact within 24 hours, don't send again
      if (alreadySentToday) return false;
    }

    // Check businessHours option
    if (rule.options.businessHours?.enabled) {
      const businessHour = await prisma.businessHour.findUnique({
        where: { id: rule.options.businessHours.businessHoursId },
      });
      if (businessHour) {
        const isWithinBusinessHours = validateTimeWindow(
          businessHour as automationProps["businessHour"],
        );
        if (!isWithinBusinessHours) return false;
      }
    }
  }

  if (rule.triggerEvent !== TriggerEvent.MESSAGE_RECEIVED && rule.groups.length === 0) return true;
  if (rule.groups.length === 0) return false;

  const { operator, groups } = rule;

  if (operator === "AND") {
    for (const group of groups) {
      const isValid = await validateConditionGroup(group, message, orgId, phone, platform);
      if (!isValid) return false;
    }
    return true;
  } else {
    // OR operator
    for (const group of groups) {
      const isValid = await validateConditionGroup(group, message, orgId, phone, platform);
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
/**
 * Everything a rule's conditions and actions can read about the event that
 * triggered them. Which fields are populated depends on the trigger.
 */
export interface RuleExecutionContext {
  orgId: string;
  platform?: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "ALL";
  phoneNumberId?: string;
  message?: string;
  phone?: string | null;
  waMessage?: WaMessageBody;
  contactId?: string;
  buttonPayload?: string;
  shopifyEvent?: ShopifyEvents;
  shopifyProductIds?: string[];
  shopifyBody?: ShopifyBody;
  /** The WooCommerce order status that fired a `WOOCOMMERCE_EVENT` rule, e.g. "completed". */
  wooEvent?: string;
  wooProductIds?: string[];
  /** The WooCommerce order payload, for template variables. */
  wooBody?: Record<string, unknown>;
  /** The shop order event that fired a `SHOP_ORDER_EVENT` rule, e.g. "shipped". */
  shopOrderEvent?: string;
  /** ShopProduct ids on the order. */
  shopProductIds?: string[];
  instagramMediaId?: string;
  /**
   * Set for INSTAGRAM_COMMENT. A commenter who has never messaged the business can only
   * be reached by a private reply to this comment, and Meta allows one per comment.
   */
  instagramCommentId?: string;
  /** The comment was made on a live video rather than a post or reel. */
  instagramLiveComment?: boolean;
  /** The ?ref= of the ig.me link that opened the thread, for INSTAGRAM_REFERRAL. */
  instagramRef?: string;
  /** The business's story the customer replied to, for INSTAGRAM_STORY_REPLY. */
  instagramStoryId?: string;
  /** The click-to-WhatsApp ad that opened the chat, for WHATSAPP_AD_REFERRAL. */
  adReferral?: AdReferralContext;
  /** The ?ref= of the m.me link that opened the thread, for MESSENGER_REFERRAL. */
  messengerRef?: string;
  /**
   * Set for FACEBOOK_COMMENT, which starts with `phone` unset: a Page comment does not name
   * the person's Messenger id. The rule's first send is a private reply to the comment,
   * which fills in `recipientId`; the caller reads it back to learn who was reached.
   */
  facebookComment?: PendingComment;
  /** The post the comment is on, for FACEBOOK_COMMENT. */
  facebookPostId?: string;
}

/** Who a Meta rule action sends to; see {@link metaRecipient}. */
const FB_COMMENT_RECIPIENT_PREFIX = "fb_comment:";

/**
 * Who a Messenger or Instagram action sends to. A Facebook comment rule knows nobody until
 * its first send reaches them, so until then this is a stand-in that a chatbot run is keyed
 * by; the send itself goes to the comment.
 */
function metaRecipient(context: RuleExecutionContext): string | undefined {
  if (context.phone) return context.phone;
  const comment = context.facebookComment;
  if (!comment) return undefined;
  return comment.recipientId ?? `${FB_COMMENT_RECIPIENT_PREFIX}${comment.commentId}`;
}

/** After a send on a comment, the person it reached is who the rule's later actions act on. */
function adoptCommentRecipient(context: RuleExecutionContext) {
  const reached = context.facebookComment?.recipientId;
  if (reached && !context.phone) context.phone = reached;
}

/** Posts one of the rule's public replies under a Page comment; never fails the rule. */
async function replyToFacebookCommentInPublic(
  rule: RuleWithConditions,
  context: RuleExecutionContext,
) {
  // Shares Instagram's option: the editor and its limits are the same.
  const replies = rule.options?.instagramPublicReplies ?? [];
  const commentId = context.facebookComment?.commentId;
  if (!replies.length || !commentId || !context.phoneNumberId) return;

  const text = replies[Math.floor(Math.random() * replies.length)];
  try {
    await replyToFacebookComment(commentId, text, context.phoneNumberId, context.orgId);
  } catch (error) {
    log.error(
      { err: error, ruleId: rule.id, commentId },
      "Could not post the public reply to a Facebook comment",
    );
  }
}

/** Posts one of the rule's public replies under the comment; never fails the rule. */
async function replyToCommentInPublic(rule: RuleWithConditions, context: RuleExecutionContext) {
  const replies = rule.options?.instagramPublicReplies ?? [];
  if (!replies.length || !context.instagramCommentId || !context.phoneNumberId) return;

  const text = replies[Math.floor(Math.random() * replies.length)];
  try {
    await replyToInstagramComment(context.instagramCommentId, text, context.phoneNumberId);
  } catch (error) {
    log.error(
      { err: error, ruleId: rule.id, commentId: context.instagramCommentId },
      "Could not post the public reply to an Instagram comment",
    );
  }
}

/** The comment to privately reply to, once: later sends in the same run go as plain DMs. */
function takeInstagramCommentId(context: RuleExecutionContext): string | undefined {
  const commentId = context.instagramCommentId;
  context.instagramCommentId = undefined;
  return commentId;
}

/**
 * Removes WhatsApp's `*bold*`, `_italic_`, `~strike~` and ```` ```mono``` ```` markers, which
 * Instagram and Messenger would show literally. A marker only counts at a word's edge, as
 * WhatsApp reads it, so `snake_case_name` and URLs survive. Mirrored in rateup-ui's
 * `automation/whatsapp-formatting.ts` for the preview.
 */
export function stripWhatsAppFormatting(text: string): string {
  return text
    .replace(/```([\s\S]+?)```/g, "$1")
    .replace(/(^|[\s([{"'])([*_~])(?=\S)([^\n]*?\S)\2(?=$|[\s.,!?:;)\]}"'])/gm, "$1$3");
}

/**
 * Sends a rule's text on Instagram or Messenger. `recipient` is the igsId or psid and
 * `accountId` the IBA id or Page id. Only Instagram can answer a comment privately. One reply
 * is written for every channel a rule runs on, so WhatsApp's formatting is dropped here.
 */
async function sendMetaRuleText(
  context: RuleExecutionContext,
  recipient: string,
  accountId: string,
  formattedText: string,
) {
  const text = stripWhatsAppFormatting(formattedText);
  if (context.platform === "FACEBOOK") {
    // On a comment rule the first send is the private reply; see facebookComment.
    await sendSendApiText(
      {
        platform: PlatformType.FACEBOOK,
        accountId,
        pendingComment: context.facebookComment,
      },
      recipient,
      context.orgId,
      text,
    );
    adoptCommentRecipient(context);
    return;
  }
  const commentId = takeInstagramCommentId(context);
  if (commentId) {
    await sendInstagramPrivateReply(commentId, text, accountId, context.orgId, recipient);
  } else {
    await sendInstagramTextMessage(recipient, text, context.orgId, accountId);
  }
}

/**
 * The channel a contact is actually reachable on, and the account that channel
 * belongs to.
 *
 * Contact-level triggers (assignment, close, lifecycle) know only the contact,
 * so they used to fire with `platform: "ALL"` — which matches every rule
 * regardless of the platform it was built for. A WhatsApp rule would then run
 * for an Instagram chat and try to WhatsApp-message an IGSID.
 *
 * The live channel is whatever the thread last used: `sourceIdentifier` is the
 * business number for WhatsApp, the IBA id for Instagram and the page id for
 * Messenger — the same value the inbound handlers pass as `phoneNumberId`.
 * Falls back to the contact's own identifiers, and finally to "ALL" for a
 * contact with no channel at all (a fresh import), where narrowing would only
 * stop rules that legitimately fire today.
 */
/**
 * Who a contact event's rules act on, as the rule context's `phone`. Messenger contacts
 * have no phone: their rules run on the psid, as the inbound handler passes it. Instagram
 * contacts keep their igsId in `phone`, so that needs nothing here.
 */
export function ruleRecipient(
  contact: { phone?: string | null; psid?: string | null },
  platform: string,
): string | null | undefined {
  return platform === "FACEBOOK" ? (contact.psid ?? contact.phone) : contact.phone;
}

export async function resolveContactChannel(contact: {
  id?: string | null;
  igsId?: string | null;
  psid?: string | null;
}): Promise<{
  platform: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "ALL";
  phoneNumberId?: string;
}> {
  if (contact.id) {
    const latest = await prisma.waMessage.findFirst({
      // Channels only: closing or assigning a chat writes an INTERNAL activity note just
      // before its rules run, and reading that lost the account id the rules need.
      where: {
        contactId: contact.id,
        sourcePlatform: { in: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"] },
      },
      orderBy: { waCreatedAt: "desc" },
      select: { sourcePlatform: true, sourceIdentifier: true },
    });
    if (latest?.sourcePlatform === "INSTAGRAM") {
      return {
        platform: "INSTAGRAM",
        phoneNumberId: latest.sourceIdentifier ?? undefined,
      };
    }
    if (latest?.sourcePlatform === "FACEBOOK") {
      return {
        platform: "FACEBOOK",
        phoneNumberId: latest.sourceIdentifier ?? undefined,
      };
    }
    if (latest?.sourcePlatform === "WHATSAPP") {
      // Deliberately no phoneNumberId: rules scope WhatsApp by `phoneId`, and
      // an inbound message carries the display number instead — passing it
      // would filter out every rule scoped to a channel.
      return { platform: "WHATSAPP" };
    }
  }
  if (contact.igsId) return { platform: "INSTAGRAM" };
  if (contact.psid) return { platform: "FACEBOOK" };
  return { platform: "ALL" };
}

export async function checkAndExecuteRuleByTriggerEvent(
  triggerEvent: TriggerEvent,
  context: RuleExecutionContext & {
    platform: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "ALL";
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
  const messageText = message ?? "";
  const phoneText = phone ?? "";

  // Fetch all active rules for the given trigger event
  const rules = await prisma.rule.findMany({
    where: {
      orgId,
      isActive: true,
      triggerEvent,
      ...(context.platform &&
        context.platform !== "ALL" && { platforms: { has: context.platform } }),
      ...(phoneNumberId && {
        whatsappSettingsPhoneIds: {
          has: phoneNumberId,
        },
      }),
    },
    include: RULE_INCLUDE,
  });

  if (!rules.length) {
    log.trace(`No rules found for trigger event: ${triggerEvent}`);
    return undefined;
  }

  const typedRules = rules as RuleWithConditions[];
  // A link rule naming this exact ref beats one that answers every link.
  if (triggerEvent === TriggerEvent.INSTAGRAM_REFERRAL) {
    typedRules.sort(
      (a, b) => Number(!!b.options?.instagramRef) - Number(!!a.options?.instagramRef),
    );
  }
  if (triggerEvent === TriggerEvent.WHATSAPP_AD_REFERRAL) {
    typedRules.sort((a, b) => adRuleSpecificity(b.options) - adRuleSpecificity(a.options));
  }
  if (triggerEvent === TriggerEvent.MESSENGER_REFERRAL) {
    typedRules.sort(
      (a, b) => Number(!!b.options?.messengerRef) - Number(!!a.options?.messengerRef),
    );
  }

  // Helper to determine if a rule has any business hour configuration
  const hasBusinessHours = (rule: RuleWithConditions): boolean => {
    if (rule.options?.businessHours?.enabled) return true;
    return rule.groups?.some((group) =>
      group.conditions?.some((cond) => cond.messageBodyLocks?.[0]?.businessHour),
    );
  };

  // Partition rules
  const [businessHourRules, nonBusinessHourRules] = typedRules.reduce<
    [RuleWithConditions[], RuleWithConditions[]]
  >(
    (acc, rule) => {
      if (hasBusinessHours(rule)) {
        acc[0].push(rule);
      } else {
        acc[1].push(rule);
      }
      return acc;
    },
    [[], []],
  );

  const isWildcardMessageBodyRule = (rule: RuleWithConditions): boolean =>
    rule.groups?.some((group) =>
      group.conditions?.some((cond) => cond.field === "MESSAGE_BODY" && cond.value === "*"),
    );

  const tryMatchRules = async (
    rulesToCheck: RuleWithConditions[],
    isBusinessHour: boolean,
    isWildcardBatch: boolean,
  ) => {
    for (const rule of rulesToCheck) {
      if (
        triggerEvent === TriggerEvent.SHOPIFY_EVENT &&
        rule.options?.shopifyEvent !== context.shopifyEvent
      ) {
        continue;
      }
      if (
        triggerEvent === TriggerEvent.WOOCOMMERCE_EVENT &&
        rule.options?.wooEvent !== context.wooEvent
      ) {
        continue;
      }
      if (triggerEvent === TriggerEvent.SHOP_ORDER_EVENT) {
        if (rule.options?.shopOrderEvent !== context.shopOrderEvent) continue;
        const wanted = rule.options?.shopProductIds ?? [];
        if (wanted.length && !context.shopProductIds?.some((id) => wanted.includes(id))) continue;
      }

      // Filter by product IDs if configured
      if (
        triggerEvent === TriggerEvent.SHOPIFY_EVENT ||
        triggerEvent === TriggerEvent.WOOCOMMERCE_EVENT
      ) {
        const isWoo = triggerEvent === TriggerEvent.WOOCOMMERCE_EVENT;
        const configuredProductIds = [
          ...((isWoo ? rule.options?.wooProductIds : rule.options?.shopifyProductIds) ?? []),
        ].map((id) => String(id));
        const orderProductIds = isWoo ? context.wooProductIds : context.shopifyProductIds;

        if (!configuredProductIds.length) {
          // No product-specific filter configured
        } else if (!orderProductIds?.length) {
          continue;
        } else {
          const hasProduct = orderProductIds.some((id) =>
            configuredProductIds.includes(String(id)),
          );
          if (!hasProduct) continue;
        }
      }

      // Instagram comment: filter by post scope, then check comment text against conditions
      if (triggerEvent === TriggerEvent.INSTAGRAM_COMMENT) {
        const source = rule.options?.instagramCommentSource ?? "ALL";
        if (source !== "ALL" && source !== (context.instagramLiveComment ? "LIVE" : "POSTS")) {
          continue;
        }
        const scope = rule.options?.instagramScope ?? "ALL";
        if (scope === "SPECIFIC") {
          const configuredPostIds = rule.options?.instagramPostIds ?? [];
          if (!configuredPostIds.length) continue;
          if (!context.instagramMediaId || !configuredPostIds.includes(context.instagramMediaId)) {
            continue;
          }
        }
        // Check comment text against rule conditions (message body, etc.)
        const isMatch = await validateRuleConditions(
          rule,
          messageText,
          orgId,
          phoneText,
          actingPlatform(rule, context.platform),
        );
        if (!isMatch) continue;
      } else if (triggerEvent === TriggerEvent.INSTAGRAM_STORY_MENTION) {
        // Story mentions always match — no post filtering or message checks
      } else if (triggerEvent === TriggerEvent.INSTAGRAM_STORY_REPLY) {
        if (!storyReplyRuleMatches(rule.options, context.instagramStoryId, messageText)) continue;
      } else if (triggerEvent === TriggerEvent.INSTAGRAM_REFERRAL) {
        const wanted = rule.options?.instagramRef?.toLowerCase();
        if (wanted && wanted !== context.instagramRef?.toLowerCase()) continue;
      } else if (triggerEvent === TriggerEvent.WHATSAPP_AD_REFERRAL) {
        if (!adRuleMatches(rule.options, context.adReferral)) continue;
      } else if (triggerEvent === TriggerEvent.MESSENGER_REFERRAL) {
        const wanted = rule.options?.messengerRef?.toLowerCase();
        if (wanted && wanted !== context.messengerRef?.toLowerCase()) continue;
      } else {
        const isMatch = await validateRuleConditions(
          rule,
          messageText,
          orgId,
          phoneText,
          actingPlatform(rule, context.platform),
        );
        if (!isMatch) continue;
      }

      log.trace(
        `${isBusinessHour ? "Business hour" : "Non-business hour"} ${isWildcardBatch ? "wildcard " : ""}rule matched! Executing actions for rule: %s`,
        rule.name,
      );

      const executedActions = await executeRuleActions(rule, context);

      if (triggerEvent === TriggerEvent.INSTAGRAM_COMMENT) {
        await replyToCommentInPublic(rule, context);
      }
      if (triggerEvent === TriggerEvent.FACEBOOK_COMMENT) {
        await replyToFacebookCommentInPublic(rule, context);
      }

      if (rule.options?.sendOncePerDay && phoneText) {
        await redisConnection.set(
          ruleSendOncePerDayKey(rule.id, phoneText),
          "1",
          "EX",
          24 * 60 * 60,
        );
      }

      return {
        rule,
        executedActions,
      };
    }

    return undefined;
  };

  const evaluationBatches: Array<{
    rules: RuleWithConditions[];
    isBusinessHour: boolean;
    isWildcardBatch: boolean;
  }> = [
    {
      rules: businessHourRules.filter((rule) => !isWildcardMessageBodyRule(rule)),
      isBusinessHour: true,
      isWildcardBatch: false,
    },
    {
      rules: nonBusinessHourRules.filter((rule) => !isWildcardMessageBodyRule(rule)),
      isBusinessHour: false,
      isWildcardBatch: false,
    },
    {
      rules: businessHourRules.filter(isWildcardMessageBodyRule),
      isBusinessHour: true,
      isWildcardBatch: true,
    },
    {
      rules: nonBusinessHourRules.filter(isWildcardMessageBodyRule),
      isBusinessHour: false,
      isWildcardBatch: true,
    },
  ];

  for (const batch of evaluationBatches) {
    if (!batch.rules.length) continue;

    const result = await tryMatchRules(batch.rules, batch.isBusinessHour, batch.isWildcardBatch);
    if (result) return result;
  }

  log.trace(`No matching rules found for trigger event: ${triggerEvent}`);
  return undefined;
}

/** A rule has business hours configured and the current time falls outside them. */
async function isOutsideRuleBusinessHours(rule: RuleWithConditions): Promise<boolean> {
  const businessHoursId = rule.options?.businessHours?.enabled
    ? rule.options.businessHours.businessHoursId
    : undefined;
  if (!businessHoursId) return false;
  const businessHour = await prisma.businessHour.findUnique({
    where: { id: businessHoursId },
  });
  return (
    Boolean(businessHour) && !validateTimeWindow(businessHour as automationProps["businessHour"])
  );
}

export type ScheduledRuleOutcome =
  | { status: "inactive" | "outside_business_hours" | "conditions_not_met" }
  | {
      status: "ran";
      executedActions: Awaited<ReturnType<typeof executeRuleActions>>;
    };

/**
 * Runs one rule that was chosen ahead of time — a reminder scheduled for it — rather than
 * matched against an event now. Its conditions and options still apply as they would on a
 * live match; business hours are reported separately so the caller can wait for them.
 */
export async function executeScheduledRule(
  ruleId: string,
  context: RuleExecutionContext,
): Promise<ScheduledRuleOutcome> {
  const rule = (await prisma.rule.findFirst({
    where: { id: ruleId, orgId: context.orgId },
    include: RULE_INCLUDE,
  })) as RuleWithConditions | null;
  if (!rule?.isActive) return { status: "inactive" };
  if (await isOutsideRuleBusinessHours(rule)) return { status: "outside_business_hours" };

  const phone = context.phone ?? "";
  const platform = actingPlatform(rule, context.platform);
  if (
    !(await validateRuleConditions(rule, context.message ?? "", context.orgId, phone, platform))
  ) {
    return { status: "conditions_not_met" };
  }
  const executedActions = await executeRuleActions(rule, context);
  if (rule.options?.sendOncePerDay && phone) {
    await redisConnection.set(ruleSendOncePerDayKey(rule.id, phone), "1", "EX", 24 * 60 * 60);
  }
  return { status: "ran", executedActions };
}

/**
 * Executes all actions for a matched rule
 */
/** One action's outcome. `messageId` is the wamid of a template the action sent. */
interface ActionResult {
  actionId: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

async function executeRuleActions(
  rule: RuleWithConditions,
  context: RuleExecutionContext,
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  const actionContext = {
    ...context,
    platform: actingPlatform(rule, context.platform),
  };

  for (const action of rule.actions) {
    try {
      let success = false;

      switch (action.type) {
        case "CLOSE_TICKET":
          success = await executeCloseTicketAction(
            action.value as WaMessageAssignStatus,
            actionContext,
          );
          break;

        case "ATTACH_LABEL":
          success = await executeAttachLabelAction(action.value as string, actionContext);
          break;

        case "ASSIGN_USER":
          success = await executeAssignUserAction(action.value as string, actionContext);
          break;

        case "ASSIGN_TEAM":
          success = await executeAssignTeamAction(action.value as string, actionContext);
          break;

        case "ASSIGN_LIFECYCLE":
          success = await executeAssignLifecycleAction(action.value, actionContext);
          break;

        case "ASSIGN_STAGE":
          success = await executeAssignStageAction(action.value, actionContext);
          break;

        case "SEND_MESSAGE":
          success = await executeSendMessageAction(action.value as string, actionContext);
          break;

        case "SEND_WEB_SURVEY":
          success = await executeSendWebSurveyAction(action.value as string, actionContext);
          break;

        case "SEND_TEMPLATE": {
          const sent = await executeSendTemplateAction(action.value as string, actionContext);
          results.push({ actionId: action.id, ...sent });
          continue;
        }

        case "SEND_FLOW":
          success = await executeSendFlowAction(action.value as string, actionContext);
          break;

        case "TRIGGER_CHATBOT":
          success = await executeTriggerChatbotAction(action.value as string, actionContext);
          break;

        case "CALL_EXTERNAL_API":
          success = await executeExternalApiAction(action.value as string, actionContext);
          break;

        case "SEND_SHOP_PRODUCTS":
          success = await executeSendShopProductsAction(rule, action.value, actionContext);
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
      log.error({ err: error }, `Error executing action ${action.id} (${action.type})`);
      results.push({
        actionId: action.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

// Action executor functions
/**
 * Products to buy. On WhatsApp they go as catalog cards into the chat the customer just
 * opened; on Instagram, as comment-to-buy's private reply.
 */
async function executeSendShopProductsAction(
  rule: RuleWithConditions,
  value: unknown,
  context: RuleExecutionContext,
): Promise<boolean> {
  if (!context.phone || !context.phoneNumberId) return false;
  if (context.platform === "WHATSAPP") {
    const { sendRuleProductsOnWhatsApp } =
      await import("../../commerce/shop/chatProducts.service.js");
    return sendRuleProductsOnWhatsApp({
      orgId: context.orgId,
      ruleId: rule.id,
      value,
      phone: context.phone,
      phoneId: context.phoneNumberId,
    });
  }
  if (context.platform !== "INSTAGRAM") return false;
  const { runShopProductsAction } = await import("../../commerce/shop/commentToBuy.service.js");
  return runShopProductsAction({
    orgId: context.orgId,
    ruleId: rule.id,
    triggerEvent: rule.triggerEvent,
    value,
    accountId: context.phoneNumberId,
    recipient: context.phone,
    commentId: takeInstagramCommentId(context),
    mediaId: context.instagramMediaId,
  });
}

async function executeCloseTicketAction(
  status: WaMessageAssignStatus,
  context: RuleExecutionContext,
): Promise<boolean> {
  if (!context.orgId || !context.phone) return false;

  // Find the contact (fetch all needed fields at once)
  const contact = await prisma.contact.findFirst({
    where: ruleContactWhere(context.platform, context.phone, context.orgId),
  });
  if (!contact) return false;

  // Update the contact to closed status using the main update logic, pass existing contact
  await updateContactById(
    contact.id,
    contact.orgId,
    {
      waMessageAssignStatus: status,
      messageId: generateInternalMessageId(),
    },
    undefined,
    contact,
    // Closed by the rule engine, not by a person.
    { source: "rule" },
  );

  return true;
}

/** @deprecated Prefer `generateLocalMessageId`; kept so the rule engine's callers read on. */
export function generateInternalMessageId() {
  return generateLocalMessageId();
}

/** Also run by the Meta AI agent's built-in RateUp connector. */
export async function executeAttachLabelAction(
  labelId: string,
  context: RuleExecutionContext,
): Promise<boolean> {
  if (!context.orgId || !context.phone || !labelId) return false;
  const contact = await prisma.contact.findFirst({
    where: ruleContactWhere(context.platform, context.phone, context.orgId),
    select: {
      id: true,
    },
  });
  // NOTE: previously proceeded to the upsert even when no contact matched,
  // writing `contactId: undefined` into a required unique-key field instead
  // of skipping. Guarding here is the fix.
  if (!contact) return false;

  await prisma.contactLabelMap.upsert({
    where: {
      contactId_labelId: {
        contactId: contact.id,
        labelId: labelId,
      },
    },
    create: {
      contactId: contact.id,
      labelId: labelId,
    },
    update: {},
  });

  return true;
}

/**
 * The contact an assignment is for, created if new. A Messenger contact is created by
 * psid: creating it by phone would give the same person a second, phone-keyed contact.
 */
function getOrCreateRuleContact(platform: string | undefined, recipient: string, orgId: string) {
  return platform === "FACEBOOK"
    ? getOrCreateContactByPsid(recipient, orgId)
    : getOrCreateContactByPhone(recipient, orgId);
}

async function executeAssignUserAction(
  userId: string,
  context: RuleExecutionContext,
): Promise<boolean> {
  if (!context.phone || !userId || !context.orgId) return false;

  const contact = await getOrCreateRuleContact(context.platform, context.phone, context.orgId);
  if (!contact) return false;

  const teams = await getTeamIdsByUserId(userId, context.orgId);
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

/** Also run by the Meta AI agent's built-in RateUp connector. */
export async function executeAssignTeamAction(
  teamId: string,
  context: RuleExecutionContext,
): Promise<boolean> {
  if (!context.phone || !teamId || !context.orgId) return false;

  const contact = await getOrCreateRuleContact(context.platform, context.phone, context.orgId);
  if (!contact) return false;

  const users = await getUserIdsByTeamId(teamId);
  if (users.length === 0) return false;

  // Not tied to a chatbot automation flow (this is a manual rule action), so
  // there's no real automationId to scope the round-robin pointer by.
  const assigned = await assignChat(teamId, users, "rule-engine");

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

/**
 * Moves the contact's lead to a pipeline column — the successor to
 * {@link executeAssignLifecycleAction}, which set a contact lifecycle instead.
 *
 * Unlike that one this does not touch the contact record, so it fires no Zoho,
 * Zapier or Conversions-API sync. Those still hang off the lifecycle write and
 * move across with their own surfaces.
 *
 * Returns false only when the rule cannot act at all — no phone, no stage
 * chosen, or the org has no board. A stage that has since been deleted, or a
 * lead already sitting on the named column, is a no-op the rule reports as
 * handled: neither is a failure worth retrying the message over.
 */
/** Also run by the Meta AI agent's built-in RateUp connector. */
export async function executeAssignStageAction(
  rawValue: unknown,
  context: {
    orgId: string;
    phone?: string | null;
    message?: string;
    platform?: string;
  },
): Promise<boolean> {
  const stageId = readAssignStageValue(rawValue);
  if (!context.phone || !context.orgId || !stageId) return false;

  const pipelineId = await resolvePipelineForContact(context.orgId);
  if (!pipelineId) {
    log.info({ orgId: context.orgId }, "Rule wanted to assign a stage but the org has no board");
    return false;
  }

  const contact = await prisma.contact.findUnique({
    where: ruleContactUnique(context.platform, context.phone, context.orgId),
    select: { id: true },
  });
  if (!contact) return false;

  const origin = PLATFORM_ORIGIN[context.platform ?? "WHATSAPP"] ?? {
    source: "MANUAL" as LeadSource,
    channel: "NONE" as LeadChannel,
  };

  const lead = await setContactStage({
    contactId: contact.id,
    pipelineId,
    stageId,
    source: origin.source,
    channel: origin.channel,
  });

  if (!lead) {
    log.info(
      { contactId: contact.id, pipelineId, stageId },
      "Rule assigned a stage but nothing moved: the lead is already there, or the column is gone",
    );
  }

  return true;
}

/**
 * The stored value is a bare stage id. Objects are tolerated because the
 * lifecycle migration writes `{ stageId, ... }` into the older action's value,
 * and a rule converted by hand could carry either shape.
 */
export function readAssignStageValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as { stageId?: unknown };
    if (typeof record.stageId === "string") return record.stageId;
  }
  return "";
}

function readAssignLifecycleValue(value: unknown): {
  lifecycleId: string;
  pipelineId?: string;
} {
  if (typeof value === "string") return { lifecycleId: value };
  if (value && typeof value === "object") {
    const record = value as { lifecycleId?: unknown; pipelineId?: unknown };
    return {
      lifecycleId: typeof record.lifecycleId === "string" ? record.lifecycleId : "",
      pipelineId: typeof record.pipelineId === "string" ? record.pipelineId : undefined,
    };
  }
  return { lifecycleId: "" };
}

/** The board's view of where a lead came in, from the rule's platform. */
const PLATFORM_ORIGIN: Record<string, { source: LeadSource; channel: LeadChannel }> = {
  WHATSAPP: { source: "WHATSAPP", channel: "WHATSAPP" },
  INSTAGRAM: { source: "INSTAGRAM", channel: "INSTAGRAM" },
  FACEBOOK: { source: "MESSENGER", channel: "MESSENGER" },
};

async function executeAssignLifecycleAction(
  rawValue: unknown,
  context: {
    orgId: string;
    phone?: string | null;
    message?: string;
    platform?: string;
  },
): Promise<boolean> {
  const { lifecycleId, pipelineId } = readAssignLifecycleValue(rawValue);
  if (!context.phone || !context.orgId || !lifecycleId) return false;

  const updatedContact = await prisma.contact.update({
    where: ruleContactUnique(context.platform, context.phone, context.orgId),
    data: { lifecycleId },
    select: {
      id: true,
      orgId: true,
      integrationIds: true,
      name: true,
      email: true,
      phone: true,
      source: true,
      notes: true,
      lifecycleId: true,
    },
  });

  const lifecycle = await prisma.lifecycle.findUnique({
    where: {
      id: lifecycleId,
    },
    select: {
      name: true,
    },
  });

  if (!lifecycle) return true;

  // Every connected CRM hears about it the way it hears about any lifecycle
  // change — Zoho through the org's status mapping, rather than the lifecycle's
  // name pushed straight into `Lead_Status`.
  await emitIntegrationEvent(updatedContact.orgId, {
    type: "contact.updated",
    contact: updatedContact,
    changed: ["lifecycle"],
  });

  // Trigger Conversions API if applicable
  await triggerConversionsApiForContact(updatedContact, lifecycleId);

  if (pipelineId) {
    const origin = PLATFORM_ORIGIN[context.platform ?? "WHATSAPP"] ?? {
      source: "MANUAL" as LeadSource,
      channel: "NONE" as LeadChannel,
    };
    const lead = await openLeadOnPipelineForContact({
      contactId: updatedContact.id,
      pipelineId,
      source: origin.source,
      channel: origin.channel,
    });

    if (!lead) {
      log.info(
        { contactId: updatedContact.id, pipelineId },
        "Rule set the lifecycle but opened no lead: the contact is already on that board, or it has no open column",
      );
    }
  }

  return true;
}

/**
 * Where a rule's WhatsApp text goes: the contact, from the number the event arrived on.
 * Without the number an org with several connected refuses the send.
 */
function waReplyTarget(phone: string, context: RuleExecutionContext) {
  return {
    phone,
    orgId: context.orgId,
    whatsappSettingsPhoneId: context.phoneNumberId,
  };
}

async function executeSendMessageAction(
  messageText: string,
  context: RuleExecutionContext,
): Promise<boolean> {
  const recipient = context.platform === "FACEBOOK" ? metaRecipient(context) : context.phone;
  if (!recipient || !messageText || !context.orgId) return false;

  if (context.platform === "INSTAGRAM" || context.platform === "FACEBOOK") {
    if (!context.phoneNumberId) return false;
    await sendMetaRuleText(context, recipient, context.phoneNumberId, messageText);
  } else {
    await sendTextMessage(waReplyTarget(recipient, context), null, messageText);
  }

  return true;
}

async function executeSendWebSurveyAction(
  surveyTeamMapId: string,
  context: RuleExecutionContext,
): Promise<boolean> {
  const recipient = context.platform === "FACEBOOK" ? metaRecipient(context) : context.phone;
  if (!recipient || !context.orgId || !surveyTeamMapId) return false;

  const surveyTeamMap = await prisma.surveyTeamMap.findFirst({
    where: {
      id: surveyTeamMapId,
      survey: {
        orgId: context.orgId,
      },
    },
    select: {
      id: true,
      shortUrlId: true,
    },
  });

  if (!surveyTeamMap) {
    log.warn(`SEND_WEB_SURVEY action received invalid surveyTeamMapId: ${surveyTeamMapId}`);
    return false;
  }

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    log.warn("FRONTEND_URL is not configured; unable to send web survey link");
    return false;
  }

  const surveyLink = `${frontendUrl.replace(/\/$/, "")}/ws/${surveyTeamMap?.shortUrlId}`;
  const messageText = `Hi there,\n\nPlease share your feedback using the link below:\n${surveyLink}\n\nThanks for your time.`;

  if (context.platform === "INSTAGRAM" || context.platform === "FACEBOOK") {
    if (!context.phoneNumberId) return false;
    await sendMetaRuleText(context, recipient, context.phoneNumberId, messageText);
  } else {
    await sendTextMessage(waReplyTarget(recipient, context), null, messageText);
  }

  return true;
}

async function executeSendTemplateAction(
  templateValue:
    | string
    | {
        templateId: string;
        variableMapping?: { templateParamIndex: number; shopifyPath: string }[];
        useProductImageAsHeader?: boolean;
        /** Path whose value becomes the suffix of the template's URL button. */
        buttonUrlVariable?: string;
      },
  context: RuleExecutionContext,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { templateId, variableMapping, useProductImageAsHeader, buttonUrlVariable } =
    typeof templateValue === "string"
      ? {
          templateId: templateValue,
          variableMapping: [],
          useProductImageAsHeader: false,
          buttonUrlVariable: undefined,
        }
      : {
          templateId: templateValue?.templateId,
          variableMapping: templateValue?.variableMapping ?? [],
          useProductImageAsHeader: templateValue?.useProductImageAsHeader ?? false,
          buttonUrlVariable: templateValue?.buttonUrlVariable,
        };

  if (!context.phone || !templateId || !context.orgId) {
    return { success: false, error: "missing phone or template" };
  }

  const hasContactMappings =
    variableMapping.some((m) => m.shopifyPath.startsWith("contact.")) ||
    Boolean(buttonUrlVariable?.startsWith("contact."));
  const contactData = hasContactMappings
    ? await getContactByPhoneNumberAndOrgId(context.phone, context.orgId)
    : null;

  // A WooCommerce rule maps its variables against the Woo order; everything else
  // keeps resolving against Shopify's payload, as it always has.
  const resolveOrderPath = context.wooBody
    ? (path: string) => resolveWooPathValue(context.wooBody, path)
    : (path: string) => resolveShopifyPathValue(context.shopifyBody, path);

  const parameterData = buildTemplateParameterData(variableMapping, resolveOrderPath, contactData);

  if (useProductImageAsHeader) {
    const productId =
      context.shopifyBody?.line_items?.[0]?.product_id ?? context.shopifyProductIds?.[0];
    const imageUrl = context.wooBody
      ? wooLineItemImage(context.wooBody)
      : productId
        ? await getShopifyProductImage(context.orgId, String(productId))
        : null;
    if (imageUrl) {
      parameterData.push({
        type: "header",
        parameters: [{ type: "image", image: { link: imageUrl } }],
      });
    } else {
      log.warn(
        `Could not resolve Shopify product image for header; falling back to template default (productId: %s)`,
        productId,
      );
    }
  }

  const buttonVariable = buttonUrlVariable
    ? String(resolveVariablePath(buttonUrlVariable, resolveOrderPath, contactData) ?? "")
    : undefined;

  const result = await sendTemplateToUserCore(
    context.orgId,
    templateId,
    context.phone,
    parameterData,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    buttonVariable || undefined,
  );

  // With no timeDelay the result is always the send's `{ status, message }`.
  if ("message" in result && typeof result.message === "string") {
    return result.status
      ? { success: true, messageId: result.message }
      : { success: false, error: result.message };
  }
  return { success: true };
}

/** The first line item's image, which WooCommerce includes on each order line. */
function wooLineItemImage(wooBody: Record<string, unknown>): string | null {
  const items = (wooBody as { line_items?: Array<{ image?: { src?: unknown } }> }).line_items;
  const src = items?.[0]?.image?.src;
  return typeof src === "string" && src ? src : null;
}

function resolveVariablePath(
  path: string,
  resolveOrderPath: (path: string) => string,
  contactData?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    customFields?: Array<{ fieldId: string; value: string | null }>;
  } | null,
): string {
  if (path.startsWith("contact.")) {
    const subPath = path.slice("contact.".length);
    if (subPath === "name") return String(contactData?.name ?? "");
    if (subPath === "email") return String(contactData?.email ?? "");
    if (subPath === "phone") return String(contactData?.phone ?? "");
    if (subPath.startsWith("custom.")) {
      const fieldId = subPath.slice("custom.".length);
      const cf = contactData?.customFields?.find((f) => f.fieldId === fieldId);
      return String(cf?.value ?? "");
    }
    return "";
  }
  // The store order: Shopify's or WooCommerce's, as the caller decided.
  return resolveOrderPath(path);
}

function buildTemplateParameterData(
  variableMapping: { templateParamIndex: number; shopifyPath: string }[] = [],
  resolveOrderPath: (path: string) => string,
  contactData?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    customFields?: Array<{ fieldId: string; value: string | null }>;
  } | null,
): OutgoingTemplateComponent[] {
  if (!variableMapping.length) return [];

  const sortedMappings = [...variableMapping].sort(
    (a, b) => a.templateParamIndex - b.templateParamIndex,
  );
  const maxIndex = Math.max(...sortedMappings.map((m) => m.templateParamIndex), -1);
  if (maxIndex < 0) return [];

  const bodyParameters: Array<{ type: string; text: string }> = [];
  for (let i = 0; i <= maxIndex; i++) {
    const mapping = sortedMappings.find((m) => m.templateParamIndex === i);
    const text = mapping
      ? resolveVariablePath(mapping.shopifyPath, resolveOrderPath, contactData)
      : "";

    bodyParameters.push({ type: "text", text });
  }

  return [{ type: "body", parameters: bodyParameters }];
}

async function executeSendFlowAction(
  flowId: string,
  context: RuleExecutionContext,
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
  automation: AutomationWithGraph,
  parsedMessage: { message: string; from: string },
  orgId: string,
) {
  const startNode = automation?.matchData?.json?.nodes?.find((node) => node.type === "startNode");

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

  await processNextNode(phone, automation, startNode.id, orgId, automationLog?.id);
}

async function executeTriggerChatbotAction(
  chatbotId: string,
  context: RuleExecutionContext,
): Promise<boolean> {
  const recipient = context.platform === "FACEBOOK" ? metaRecipient(context) : context.phone;
  if (!recipient || !chatbotId || !context.orgId) return false;

  if (context.platform === "INSTAGRAM" || context.platform === "FACEBOOK") {
    const platform =
      context.platform === "FACEBOOK" ? PlatformType.FACEBOOK : PlatformType.INSTAGRAM;
    // Scoped to the rule's platform, so a Facebook rule can only start a Messenger
    // chatbot and an Instagram rule an Instagram one.
    const automation = await getMetaAutomationById(chatbotId, context.orgId, platform);
    if (!automation) {
      log.warn({ chatbotId, platform }, "Rule names a chatbot that is not on its platform");
      return false;
    }
    // Switched off on the Chatbots page: rules no longer start it.
    if (!automation.isActive) {
      log.info({ chatbotId, platform }, "Rule names a chatbot that is switched off");
      return false;
    }
    if (!context.phoneNumberId) {
      log.error("No %s account id in context for chatbot %s", platform, chatbotId);
      return false;
    }
    await startMetaFlow(
      recipient,
      // The stored matchData is typed loosely on the Prisma model; this reader
      // knows the row is a Meta flow graph.
      automation as unknown as MetaFlowAutomation,
      context.orgId,
      // On a Facebook comment the chatbot's first message is the private reply.
      {
        platform,
        accountId: context.phoneNumberId,
        pendingComment: context.facebookComment,
      },
      takeInstagramCommentId(context),
    );
    adoptCommentRecipient(context);
    return true;
  }

  // A chatbot switched off on the Chatbots page is not started by rules.
  const automation = await prisma.waAutomatedReply.findFirst({
    where: {
      orgId: context.orgId,
      id: chatbotId,
      isActive: true,
    },
  });

  if (automation) {
    await startAutomationFlow(
      recipient,
      automation,
      { message: context.message || "", from: recipient },
      context.orgId,
    );
    return true;
  }

  log.info({ chatbotId }, "Rule names a WhatsApp chatbot that is switched off or missing");
  return false;
}

const EXTERNAL_API_TIMEOUT_MS = 10_000;

async function executeExternalApiAction(
  endpoint: string,
  context: {
    phone?: string | null;
    message?: string;
    buttonPayload?: string;
  },
): Promise<boolean> {
  if (!endpoint) return false;

  // The URL is the rule author's: it must resolve to a public address (checked
  // again at connect time by the agents), and redirects are not followed.
  let parsedUrl: URL;
  try {
    parsedUrl = await assertPublicUrl(endpoint, { allowHttp: true });
  } catch (error) {
    log.warn({ err: error }, "Refusing the external API URL configured in a rule action");
    return false;
  }

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Rateup-API/1.0.1",
  };

  const payload = {
    user: context.phone ?? "",
    action: context.message ?? "",
    buttonPayload: context.buttonPayload ?? "",
  };

  const config = {
    headers,
    ...publicAxiosOptions(EXTERNAL_API_TIMEOUT_MS),
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await axios.post(parsedUrl.toString(), payload, config);

      log.debug(`External API call successful for ${parsedUrl.toString()}`);

      return true;
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;

      const message = axios.isAxiosError(error) ? error.message : "Unknown error";

      log.warn(
        `External API call attempt ${attempt} failed ` +
          `for ${parsedUrl.toString()} ` +
          `(status: ${status ?? "unknown"}, message: ${message})`,
      );

      if (attempt === 2) {
        log.error({ err: error }, `External API failed after retry for ${parsedUrl.toString()}`);

        return false;
      }
    }
  }

  return false;
}

/**
 * Whether an INSTAGRAM_STORY_REPLY rule answers this reply: the story is in the rule's
 * list (or the rule takes every story), and the text contains one of its keywords (or
 * the rule has none, which means any reply — "reply anything to get the guide").
 * Keywords match case-insensitively as whole words, so "GUIDE" does not fire on "guided".
 */
export function storyReplyRuleMatches(
  options:
    | {
        instagramStoryScope?: string;
        instagramStoryIds?: string[];
        instagramStoryKeywords?: string[];
      }
    | null
    | undefined,
  storyId: string | undefined,
  text: string | undefined,
): boolean {
  if (options?.instagramStoryScope === "SPECIFIC") {
    const ids = options.instagramStoryIds ?? [];
    if (!storyId || !ids.includes(storyId)) return false;
  }
  const keywords = (options?.instagramStoryKeywords ?? []).map((k) => k.trim()).filter(Boolean);
  if (!keywords.length) return true;
  const words = new Set(
    (text ?? "")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean),
  );
  const haystack = ` ${(text ?? "").toLowerCase()} `;
  return keywords.some((keyword) => {
    const k = keyword.toLowerCase();
    // A multi-word keyword is matched as a phrase.
    return k.includes(" ") ? haystack.includes(k) : words.has(k);
  });
}
