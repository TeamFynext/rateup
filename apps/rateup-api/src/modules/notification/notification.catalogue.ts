import type { Permission } from "../../authz/permissions.js";

export const NOTIFICATION_CHANNELS = ["inApp", "push", "email", "desktop"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_CATEGORIES = [
  "inbox",
  "pipelines",
  "campaigns",
  "loyalty",
  "channels",
  "billing",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export interface NotificationEventDefinition {
  category: NotificationCategory;
  /** The channels a member may choose for this event, each with its default. */
  channels: Partial<Record<NotificationChannel, boolean>>;
  /** A recipient must hold this, checked at send time, and the settings page hides the event without it. */
  permission: Permission;
  /**
   * Whether `inApp` also writes a row to the bell. New-message events are live-only: a row per
   * inbound message would bury everything else in the feed.
   */
  feed: boolean;
}

/**
 * Every notification a member can receive. rateup-ui labels these keys
 * (`src/components/dashboard/settings/notifications/notificationCopy.ts`); a key added here
 * needs a label there, and stored preferences are keyed by it, so never rename one.
 */
export const NOTIFICATION_EVENTS = {
  "inbox.message.assigned": {
    category: "inbox",
    channels: { inApp: true, push: true, desktop: true },
    permission: "inbox.read",
    feed: false,
  },
  "inbox.message.unassigned": {
    category: "inbox",
    channels: { inApp: true, push: true, desktop: false },
    permission: "inbox.read",
    feed: false,
  },
  "inbox.assigned": {
    category: "inbox",
    channels: { inApp: true, push: true, email: false, desktop: true },
    permission: "inbox.read",
    feed: true,
  },
  "inbox.unassigned": {
    category: "inbox",
    channels: { inApp: true, push: false, desktop: false },
    permission: "inbox.read",
    feed: true,
  },
  "inbox.mentioned": {
    category: "inbox",
    channels: { inApp: true, push: true, email: false, desktop: true },
    permission: "inbox.read",
    feed: true,
  },
  "inbox.closed": {
    category: "inbox",
    channels: { inApp: false, push: false, desktop: false },
    permission: "inbox.read",
    feed: true,
  },
  "inbox.handover": {
    category: "inbox",
    channels: { inApp: true, push: true, desktop: true },
    permission: "inbox.read",
    feed: true,
  },
  "pipeline.lead_assigned": {
    category: "pipelines",
    channels: { inApp: true, push: true, email: false, desktop: true },
    permission: "pipelines.read",
    feed: true,
  },
  "pipeline.task_assigned": {
    category: "pipelines",
    channels: { inApp: true, push: true, email: false, desktop: true },
    permission: "pipelines.read",
    feed: true,
  },
  "campaign.completed": {
    category: "campaigns",
    channels: { inApp: true, push: false, email: true, desktop: false },
    permission: "campaigns.read",
    feed: true,
  },
  "campaign.failed": {
    category: "campaigns",
    channels: { inApp: true, push: true, email: true, desktop: true },
    permission: "campaigns.read",
    feed: true,
  },
  "campaign.paused": {
    category: "campaigns",
    channels: { inApp: true, push: true, email: true, desktop: true },
    permission: "campaigns.read",
    feed: true,
  },
  "loyalty.approval_requested": {
    category: "loyalty",
    channels: { inApp: true, push: true, email: false, desktop: true },
    permission: "loyalty.approve",
    feed: true,
  },
  "loyalty.feedback_negative": {
    category: "loyalty",
    channels: { inApp: true, push: true, email: true, desktop: true },
    permission: "loyalty.manage",
    feed: true,
  },
  "whatsapp.template_status": {
    category: "channels",
    channels: { inApp: true, push: false, email: true },
    permission: "templates.manage",
    feed: true,
  },
  "whatsapp.account_restricted": {
    category: "channels",
    channels: { inApp: true, push: true, email: true, desktop: true },
    permission: "notify.integrations",
    feed: true,
  },
  "integration.error": {
    category: "channels",
    channels: { inApp: true, push: false, email: true },
    permission: "notify.integrations",
    feed: true,
  },
  "billing.conversation_limit": {
    category: "billing",
    channels: { inApp: true, push: true, desktop: true },
    permission: "notify.billing",
    feed: true,
  },
} as const satisfies Record<string, NotificationEventDefinition>;

export type NotificationEvent = keyof typeof NOTIFICATION_EVENTS;

export const NOTIFICATION_EVENT_KEYS = Object.keys(NOTIFICATION_EVENTS) as NotificationEvent[];

export function isNotificationEvent(value: string): value is NotificationEvent {
  return Object.hasOwn(NOTIFICATION_EVENTS, value);
}

export function eventDefinition(event: NotificationEvent): NotificationEventDefinition {
  return NOTIFICATION_EVENTS[event];
}
