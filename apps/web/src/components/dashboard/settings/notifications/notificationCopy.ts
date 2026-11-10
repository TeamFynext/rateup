// Translated copy for the notification catalogue (rateup-api
// `src/modules/settings/notifications/notification.catalogue.ts`). Switches over literal `t("…")`
// calls, because `pnpm dlx i18next-cli extract` only sees literal arguments.

import type { TFunction } from "i18next";

import type { AppNotification, NotificationChannel } from "@/backend/notification/notification.api";

export const NOTIFICATION_EVENTS = [
  "inbox.message.assigned",
  "inbox.message.unassigned",
  "inbox.assigned",
  "inbox.unassigned",
  "inbox.mentioned",
  "inbox.closed",
  "inbox.handover",
  "pipeline.lead_assigned",
  "pipeline.task_assigned",
  "campaign.completed",
  "campaign.failed",
  "campaign.paused",
  "loyalty.approval_requested",
  "loyalty.feedback_negative",
  "commerce.order_needs_review",
  "whatsapp.template_status",
  "whatsapp.account_restricted",
  "integration.error",
  "billing.active_contact_limit",
  "billing.campaign_credit_limit",
  "billing.shop_order_limit",
  /** Retired by the API; kept so historical bell rows still render. */
  "billing.conversation_limit",
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const NOTIFICATION_CATEGORIES = [
  "inbox",
  "pipelines",
  "campaigns",
  "loyalty",
  "commerce",
  "channels",
  "billing",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export function isNotificationEvent(value: string): value is NotificationEvent {
  return (NOTIFICATION_EVENTS as readonly string[]).includes(value);
}

export function isNotificationCategory(value: string): value is NotificationCategory {
  return (NOTIFICATION_CATEGORIES as readonly string[]).includes(value);
}

export function channelLabel(t: TFunction, channel: NotificationChannel): string {
  switch (channel) {
    case "inApp":
      return t("In RateUp");
    case "push":
      return t("Mobile app");
    case "email":
      return t("Email");
    case "desktop":
      return t("Desktop");
  }
}

export function channelDescription(t: TFunction, channel: NotificationChannel): string {
  switch (channel) {
    case "inApp":
      return t("The bell and pop-ups while RateUp is open");
    case "push":
      return t("Push notifications on phones signed in to the RateUp app");
    case "email":
      return t("Sent to your sign-in email address");
    case "desktop":
      return t("System notifications from this browser while RateUp is in another tab");
  }
}

export function categoryTitle(t: TFunction, category: NotificationCategory): string {
  switch (category) {
    case "inbox":
      return t("Inbox");
    case "pipelines":
      return t("Pipelines");
    case "campaigns":
      return t("Campaigns");
    case "loyalty":
      return t("Loyalty");
    case "commerce":
      return t("Commerce");
    case "channels":
      return t("Channels and integrations");
    case "billing":
      return t("Billing");
  }
}

export function eventLabel(t: TFunction, event: NotificationEvent): string {
  switch (event) {
    case "inbox.message.assigned":
      return t("New message in my conversations");
    case "inbox.message.unassigned":
      return t("New message nobody is handling");
    case "inbox.assigned":
      return t("Conversation assigned to me");
    case "inbox.unassigned":
      return t("Conversation reassigned away from me");
    case "inbox.mentioned":
      return t("Mentioned in a note");
    case "inbox.closed":
      return t("My conversation closed by someone else");
    case "inbox.handover":
      return t("AI agent hands a customer to a person");
    case "pipeline.lead_assigned":
      return t("Lead assigned to me");
    case "pipeline.task_assigned":
      return t("Task assigned to me");
    case "campaign.completed":
      return t("Campaign finished sending");
    case "campaign.failed":
      return t("Campaign failed");
    case "campaign.paused":
      return t("Campaign paused by an account problem");
    case "loyalty.approval_requested":
      return t("Request waiting for my approval");
    case "loyalty.feedback_negative":
      return t("Unhappy customer feedback");
    case "commerce.order_needs_review":
      return t("Paid order needs review");
    case "whatsapp.template_status":
      return t("WhatsApp template approved or rejected");
    case "whatsapp.account_restricted":
      return t("WhatsApp account restricted");
    case "integration.error":
      return t("Integration needs attention");
    case "billing.active_contact_limit":
      return t("Active contact limit reached");
    case "billing.campaign_credit_limit":
      return t("Campaign credits used up");
    case "billing.shop_order_limit":
      return t("Monthly shop orders");
    case "billing.conversation_limit":
      return t("Conversation limit reached");
  }
}

export function eventDescription(t: TFunction, event: NotificationEvent): string | null {
  switch (event) {
    case "inbox.message.assigned":
      return t("A customer writes in a conversation assigned to you.");
    case "inbox.message.unassigned":
      return t("A customer writes and nobody is assigned, on a channel you can see.");
    case "inbox.handover":
      return t("Meta AI passes a conversation to your team.");
    case "campaign.completed":
    case "campaign.failed":
    case "campaign.paused":
      return t("For campaigns in your teams.");
    case "commerce.order_needs_review":
      return t(
        "A customer paid, but stock, a coupon or their points ran out before the order went through.",
      );
    case "whatsapp.template_status":
      return t("Meta finished reviewing a template.");
    case "integration.error":
      return t("Meta Conversions API failures and a Shopify store uninstalling RateUp.");
    case "billing.active_contact_limit":
      return t(
        "New contacts can't be messaged until you add a contact pack, upgrade, or the month resets.",
      );
    case "billing.campaign_credit_limit":
      return t("Campaigns pause until you add a credit pack, upgrade, or the month resets.");
    case "billing.shop_order_limit":
      return t(
        "When most of the month's orders are taken, and when they run out. Customers are then asked to message you to order.",
      );
    case "billing.conversation_limit":
      return t("Messages stop until the plan is upgraded or the limit resets.");
    default:
      return null;
  }
}

type NotificationData = NonNullable<AppNotification["data"]>;

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : fallback;

/** One line for the bell, a toast or a desktop notification. */
export function notificationMessage(
  t: TFunction,
  event: NotificationEvent,
  data: NotificationData = {},
): string {
  const contact = str(data.contactName, t("A customer"));
  switch (event) {
    case "inbox.message.assigned":
    case "inbox.message.unassigned":
      return t("New message from {contact}", { contact });
    case "inbox.assigned":
      return t("A conversation with {contact} was assigned to you.", { contact });
    case "inbox.unassigned":
      return t("The conversation with {contact} was reassigned away from you.", { contact });
    case "inbox.mentioned":
      return data.byName
        ? t("{name} mentioned you in the conversation with {contact}.", {
            name: str(data.byName),
            contact,
          })
        : t("You were mentioned in the conversation with {contact}.", { contact });
    case "inbox.closed":
      return t("The conversation with {contact} was closed.", { contact });
    case "inbox.handover":
      return t("The AI agent handed the conversation with {contact} to your team.", { contact });
    case "pipeline.lead_assigned":
      return t("The lead {lead} was assigned to you.", { lead: str(data.leadName) });
    case "pipeline.task_assigned":
      return t("The task “{task}” on {lead} was assigned to you.", {
        task: str(data.taskTitle),
        lead: str(data.leadName),
      });
    case "campaign.completed":
      return t("Your campaign “{campaign}” has finished sending.", {
        campaign: str(data.campaignName),
      });
    case "campaign.failed":
      return t("The campaign “{campaign}” could not be sent.", {
        campaign: str(data.campaignName),
      });
    case "campaign.paused":
      return t("The campaign “{campaign}” was paused.", {
        campaign: str(data.campaignName),
      });
    case "loyalty.approval_requested":
      return t("{customer} has a loyalty request waiting for approval.", {
        customer: str(data.customerName, t("A customer")),
      });
    case "loyalty.feedback_negative":
      return t("{customer} said their visit did not go well.", {
        customer: str(data.customerName, t("A customer")),
      });
    case "commerce.order_needs_review":
      return t("Order #{number} was paid but needs review — {reason}", {
        number: str(data.orderNumber),
        reason: str(data.reason),
      });
    case "whatsapp.template_status":
      return data.status === "APPROVED"
        ? t("Meta approved the template “{template}”.", {
            template: str(data.templateName),
          })
        : t("Meta rejected the template “{template}”.", {
            template: str(data.templateName),
          });
    case "whatsapp.account_restricted":
      return t("Meta restricted {channel}. It cannot send messages until this is resolved.", {
        channel: str(data.channelName),
      });
    case "integration.error":
      return data.contactName
        ? t("{integration} failed for {contact} — {error}", {
            integration: str(data.integration, "Meta Conversions API"),
            contact,
            error: str(data.error),
          })
        : t("{integration} failed — {error}", {
            integration: str(data.integration),
            error: str(data.error),
          });
    case "billing.active_contact_limit":
      return str(data.message, t("You've reached your active contact limit for this month."));
    case "billing.campaign_credit_limit":
      return str(data.message, t("Your campaign credits for this month are used up."));
    case "billing.shop_order_limit":
      return str(data.message, t("Your shop has reached this month's orders."));
    case "billing.conversation_limit":
      return str(data.message, t("You've reached your conversation limit."));
  }
}

/** The event a bell row belongs to, including rows written before the catalogue existed. */
export function notificationEvent(row: Pick<AppNotification, "event" | "subSource">) {
  if (row.event && isNotificationEvent(row.event)) return row.event;
  switch (row.subSource) {
    case "chat-assigned":
      return "inbox.assigned";
    case "chat-closed":
      return "inbox.closed";
    case "mentioned":
      return "inbox.mentioned";
    case "campaign-completed":
      return "campaign.completed";
    case "capi-error":
      return "integration.error";
    case "conversation-limit-reached":
      return "billing.conversation_limit";
    default:
      return null;
  }
}

/** Where the notification opens. Rows from before the catalogue carry no path of their own. */
export function notificationPath(event: NotificationEvent, data: NotificationData = {}): string {
  // In-app only: a protocol-relative `//host` would leave the app.
  const stored = data.path;
  if (typeof stored === "string" && stored.startsWith("/") && !stored.startsWith("//")) {
    return stored;
  }
  const contactId = str(data.contactId);
  switch (event) {
    case "inbox.assigned":
    case "inbox.mentioned":
      return `/dashboard/inbox?tab=assigned&contactId=${encodeURIComponent(contactId)}`;
    case "inbox.closed":
      return `/dashboard/inbox?tab=closed&contactId=${encodeURIComponent(contactId)}`;
    case "campaign.completed":
      return `/dashboard/campaigns/${encodeURIComponent(str(data.campaignId))}`;
    case "billing.active_contact_limit":
    case "billing.campaign_credit_limit":
    case "billing.shop_order_limit":
    case "billing.conversation_limit":
      return "/dashboard/settings/billing";
    default:
      return "/dashboard";
  }
}
