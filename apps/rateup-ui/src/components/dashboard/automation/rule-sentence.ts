import type { CreateRuleInput } from "@/components/dashboard/automation/components/schema.ts";
import { isCommentTrigger } from "@/components/dashboard/automation/components/schema.ts";
import { stripWhatsAppFormatting } from "@/components/dashboard/automation/whatsapp-formatting.ts";
import { ShopifyEvents } from "@/types/enums.ts";

export type WizardStep = "template" | "trigger" | "conditions" | "actions" | "review";

/** What a part of the sentence is, which decides its colour. `missing` is a gap still to fill. */
export type SentenceRole = "word" | "trigger" | "condition" | "action" | "limit" | "missing";

export interface SentencePart {
  role: SentenceRole;
  text: string;
  /** The wizard step that edits this part; the review step makes it a link there. */
  step?: WizardStep;
}

export type NameKind =
  | "account"
  | "team"
  | "user"
  | "label"
  | "group"
  | "stage"
  | "template"
  | "flow"
  | "survey"
  | "chatbot";

/** Resolves an id the form holds to the name the author knows it by. */
export type NameLookup = (kind: NameKind, id: string) => string | undefined;

/** Triggers as events, for the trigger picker; the sentence uses them lower-cased. */
export const PLAIN_TRIGGERS: Record<string, string> = {
  MESSAGE_RECEIVED: "A customer messages you",
  CONTACT_CREATED: "A new contact is created",
  CHAT_CLOSED: "A chat is closed",
  CHAT_ASSIGNED: "A chat is assigned",
  STAGE_UPDATED: "A lead moves to a new stage",
  LIFECYCLE_UPDATED: "A contact's lifecycle changes (legacy)",
  SHOPIFY_EVENT: "Something happens on Shopify",
  WOOCOMMERCE_EVENT: "A WooCommerce order changes status",
  INSTAGRAM_COMMENT: "Someone comments on your post",
  INSTAGRAM_STORY_MENTION: "Someone mentions you in a story",
  INSTAGRAM_REFERRAL: "Someone opens your ig.me link",
  MESSENGER_REFERRAL: "Someone opens your m.me link",
  FACEBOOK_COMMENT: "Someone comments on your Page's post",
};

const SHOPIFY_PHRASES: Partial<Record<string, string>> = {
  [ShopifyEvents.ORDERS_CREATE]: "a Shopify order is placed",
  [ShopifyEvents.ORDERS_PAID]: "a Shopify order is paid",
  [ShopifyEvents.ORDERS_FULFILLED]: "a Shopify order is fulfilled",
  [ShopifyEvents.ORDERS_PARTIALLY_FULFILLED]: "a Shopify order is partly fulfilled",
  [ShopifyEvents.ORDERS_CANCELLED]: "a Shopify order is cancelled",
  [ShopifyEvents.FULFILLMENT_ORDERS_CANCELLED]: "a Shopify fulfilment is cancelled",
  [ShopifyEvents.DRAFT_ORDERS_CREATE]: "a Shopify draft order is created",
  [ShopifyEvents.ABANDONED_CHECKOUTS]: "a Shopify checkout is abandoned",
  [ShopifyEvents.REFUNDS_CREATE]: "a Shopify refund is issued",
  [ShopifyEvents.STORE_CREDIT_ISSUED]: "Shopify store credit is issued",
};

const WOO_PHRASES: Partial<Record<string, string>> = {
  processing: "a WooCommerce order is paid",
  completed: "a WooCommerce order is completed",
  "on-hold": "a WooCommerce order is put on hold",
  cancelled: "a WooCommerce order is cancelled",
  refunded: "a WooCommerce order is refunded",
  failed: "a WooCommerce payment fails",
};

const MESSAGE_OPERATORS: Record<string, string> = {
  CONTAINS: "mentions",
  EQUALS: "says exactly",
  STARTS_WITH: "starts with",
  ENDS_WITH: "ends with",
};

const EMAIL_OPERATORS: Record<string, string> = {
  CONTAINS: "contains",
  EQUALS: "is",
  STARTS_WITH: "starts with",
  ENDS_WITH: "ends with",
};

const CLOSE_STATUS: Record<string, string> = {
  RESOLVED: "resolved",
  CLOSED: "closed",
  SPAM: "spam",
  UNRESOLVED: "unresolved",
};

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const quote = (text: string) => `“${text}”`;
const clip = (text: string, length = 36) =>
  text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;

const word = (text: string): SentencePart => ({ role: "word", text });

/** Joins parts as "a, b and c", the connective words rendered plain. */
function list(parts: SentencePart[], last: "and" | "or" = "and"): SentencePart[] {
  return parts.flatMap((part, index) => {
    if (index === 0) return [part];
    return [word(index === parts.length - 1 ? last : ","), part];
  });
}

function triggerPart(rule: CreateRuleInput): SentencePart {
  const options = rule.options ?? {};
  if (rule.triggerEvent === "SHOPIFY_EVENT") {
    const phrase = options.shopifyEvent && SHOPIFY_PHRASES[options.shopifyEvent];
    return phrase
      ? { role: "trigger", text: phrase, step: "trigger" }
      : { role: "missing", text: "a Shopify event …", step: "trigger" };
  }
  if (rule.triggerEvent === "WOOCOMMERCE_EVENT") {
    const phrase = options.wooEvent && WOO_PHRASES[options.wooEvent];
    return phrase
      ? { role: "trigger", text: phrase, step: "trigger" }
      : { role: "missing", text: "a WooCommerce order …", step: "trigger" };
  }
  const plain = PLAIN_TRIGGERS[rule.triggerEvent];
  return plain
    ? { role: "trigger", text: lowerFirst(plain), step: "trigger" }
    : { role: "missing", text: "something happens", step: "trigger" };
}

function conditionText(
  condition: CreateRuleInput["groups"][number]["conditions"][number],
  names: NameLookup,
): string | null {
  const value = condition.value?.trim();
  if (!value) return null;
  switch (condition.field) {
    case "MESSAGE_BODY":
      if (value === "*") return "sends anything";
      return `${MESSAGE_OPERATORS[condition.operator ?? "CONTAINS"] ?? "mentions"} ${quote(value)}`;
    case "CONTACT_EMAIL":
      return `has an email that ${EMAIL_OPERATORS[condition.operator ?? "CONTAINS"] ?? "contains"} ${quote(value)}`;
    case "CONTACT_LABEL":
      return `is labelled ${quote(names("label", value) ?? "a label")}`;
    case "CONTACT_GROUP":
      return `is in ${quote(names("group", value) ?? "a group")}`;
    case "CONTACT_STAGE":
      return `is in the ${quote(names("stage", value) ?? "chosen")} stage`;
    default:
      return `matches ${quote(value)}`;
  }
}

function conditionParts(rule: CreateRuleInput, names: NameLookup): SentencePart[] {
  const groups = (rule.groups ?? []).filter((group) => group.conditions.length > 0);
  const parts: SentencePart[] = [];
  groups.forEach((group, groupIndex) => {
    if (groupIndex > 0) parts.push(word(rule.operator === "OR" ? "or" : "and"));
    group.conditions.forEach((condition, index) => {
      if (index > 0) parts.push(word(group.operator === "OR" ? "or" : "and"));
      const text = conditionText(condition, names);
      parts.push(
        text
          ? { role: "condition", text, step: "conditions" }
          : { role: "missing", text: "…", step: "conditions" },
      );
    });
  });
  return parts;
}

export function actionPart(
  action: CreateRuleInput["actions"][number],
  names: NameLookup,
): SentencePart {
  const value = action.value;
  const id = typeof value === "string" ? value.trim() : "";
  const named = (kind: NameKind) => (id ? names(kind, id) : undefined);
  const done = (text: string): SentencePart => ({ role: "action", text, step: "actions" });
  const gap = (text: string): SentencePart => ({ role: "missing", text, step: "actions" });

  switch (action.type) {
    case "ASSIGN_TEAM": {
      const name = named("team");
      return name ? done(`assign to ${name}`) : gap("assign to a team …");
    }
    case "ASSIGN_USER": {
      const name = named("user");
      return name ? done(`assign to ${name}`) : gap("assign to a teammate …");
    }
    case "ATTACH_LABEL": {
      const name = named("label");
      return name ? done(`label it ${quote(name)}`) : gap("label it …");
    }
    case "SEND_MESSAGE":
      return id
        ? done(`reply ${quote(clip(stripWhatsAppFormatting(id)))}`)
        : gap("reply with a message …");
    case "SEND_TEMPLATE": {
      const templateId =
        typeof value === "string" ? value : value && "templateId" in value ? value.templateId : "";
      const name = templateId ? names("template", templateId) : undefined;
      return name ? done(`send the ${name} template`) : gap("send a template …");
    }
    case "SEND_FLOW": {
      const name = named("flow");
      return name ? done(`send the ${quote(name)} flow`) : gap("send a flow …");
    }
    case "SEND_WEB_SURVEY": {
      const name = named("survey");
      return name ? done(`send the ${quote(name)} survey`) : gap("send a survey …");
    }
    case "TRIGGER_CHATBOT": {
      const name = named("chatbot");
      return name ? done(`start the ${quote(name)} chatbot`) : gap("start a chatbot …");
    }
    case "CLOSE_TICKET":
      return id ? done(`close the chat as ${CLOSE_STATUS[id] ?? id}`) : gap("close the chat …");
    case "ASSIGN_STAGE": {
      const stageId =
        typeof value === "string"
          ? value
          : ((value as { stageId?: string } | undefined)?.stageId ?? "");
      const name = stageId ? names("stage", stageId) : undefined;
      return name ? done(`move the lead to ${quote(name)}`) : gap("move the lead to …");
    }
    case "ASSIGN_LIFECYCLE":
      return done("set the lifecycle");
    case "CALL_EXTERNAL_API": {
      try {
        return done(`call ${new URL(id).host}`);
      } catch {
        return gap("call your webhook …");
      }
    }
    default:
      return gap("do something …");
  }
}

/**
 * The rule read as one sentence, built from the form as it stands — so it works before the rule
 * is saved, and shows every gap the author still has to fill as `missing`.
 */
export function buildRuleSentence(rule: CreateRuleInput, names: NameLookup): SentencePart[] {
  const parts: SentencePart[] = [word("When"), triggerPart(rule)];

  const accounts = (rule.whatsappSettingsPhoneIds ?? [])
    .map((id) => names("account", id))
    .filter((name): name is string => Boolean(name));
  if (accounts.length) {
    parts.push(word("on"), { role: "trigger", text: accounts.join(" or "), step: "trigger" });
  }

  const conditions = conditionParts(rule, names);
  if (conditions.length) {
    const subject =
      rule.triggerEvent === "MESSAGE_RECEIVED" || isCommentTrigger(rule.triggerEvent)
        ? "and it"
        : "and the contact";
    parts.push(word(subject), ...conditions);
  } else if (rule.triggerEvent === "MESSAGE_RECEIVED") {
    parts.push(word("and it"), { role: "missing", text: "mentions …", step: "conditions" });
  }

  const actions = (rule.actions ?? []).map((action) => actionPart(action, names));
  const publicReplies = (rule.options?.instagramPublicReplies ?? []).filter((r) => r.trim());
  if (isCommentTrigger(rule.triggerEvent) && publicReplies[0]) {
    actions.unshift({
      role: "action",
      text: `reply ${quote(clip(publicReplies[0], 24))} under it`,
      step: "actions",
    });
  }
  const noAction: SentencePart = { role: "missing", text: "do …", step: "actions" };
  parts.push(word(","), ...(actions.length ? list(actions) : [noAction]));

  const limits: SentencePart[] = [];
  if (rule.options?.sendOncePerDay) {
    limits.push({ role: "limit", text: "once a day per contact", step: "review" });
  }
  if (rule.options?.businessHours?.enabled) {
    limits.push({ role: "limit", text: "only during business hours", step: "review" });
  }
  if (limits.length) parts.push(word("—"), ...list(limits));

  parts.push(word("."));
  return parts;
}
