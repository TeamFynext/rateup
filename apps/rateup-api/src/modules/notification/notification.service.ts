import { Job } from "bullmq";
import { Prisma } from "../../../generated/prisma/client.js";
import type { Actor } from "../../authz/actor.js";
import { EmailParams, sendAWSEmail } from "../../utils/email/sendAWSEmail.js";
import { log } from "../../utils/logger.js";
import { sendUsageLimitMailAlert } from "../../utils/email/payments/usageLimitAlert.js";
import type { UsageLimitKind } from "../../emails/usage-limit.js";

import prisma from "../../utils/prisma.js";
import type { orgWsMessage } from "../../types/global.js";
import { checkPushReceipts, sendPushNotification } from "../mobileNotification/mobile.service.js";
import { notificationQueue } from "../../workers/bullmq/queues/notification.queue.js";
import type { NotificationSettingSchema } from "./notification.schema.js";
import { isGatewayBilledPlan } from "../subscription/planBilling.js";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENT_KEYS,
  eventDefinition,
} from "./notification.catalogue.js";
import { dispatchNotification } from "./notification.dispatch.js";
import { eventToggle, mergeOverrides, preferencesFromRow } from "./notification.preferences.js";
import { notify, type NotifyJobData } from "./notify.js";

/** The plan meters that alert when spent. */
export type MeterLimit = Exclude<UsageLimitKind, "formResponses">;

const FEED_LIMIT = 100;

export async function getNotifications(userId: string, orgId: string) {
  return await prisma.notification.findMany({
    where: { orgMember: { userId, orgId } },
    orderBy: { createdAt: "desc" },
    take: FEED_LIMIT,
  });
}

/** Unread rows only; the bell's badge. */
export async function getNotificationsCount(userId: string, orgId: string) {
  return await prisma.notification.count({
    where: { orgMember: { userId, orgId }, readAt: null },
  });
}

export async function markAllNotificationsRead(userId: string, orgId: string) {
  await prisma.notification.updateMany({
    where: { orgMember: { userId, orgId }, readAt: null },
    data: { readAt: new Date() },
  });
}

/**
 * The settings page's view: the master switches, and every event the member may receive with
 * the effective value of each channel it offers. Events they lack the permission for are left
 * out, since they would never be delivered.
 */
export async function getNotificationSettings(actor: Actor) {
  if (!actor.userId) throw new Error("Notification settings belong to a signed-in user");
  const row = await prisma.notificationSetting.findFirst({
    where: { orgMember: { userId: actor.userId, orgId: actor.orgId } },
  });
  const prefs = preferencesFromRow(row);
  const events = NOTIFICATION_EVENT_KEYS.filter((key) =>
    actor.can(eventDefinition(key).permission),
  ).map((key) => {
    const definition = eventDefinition(key);
    const channels: Record<string, boolean> = {};
    for (const channel of NOTIFICATION_CHANNELS) {
      const value = eventToggle(prefs, key, channel);
      if (value !== undefined) channels[channel] = value;
    }
    return { key, category: definition.category, channels };
  });
  return { channels: prefs.channels, sound: prefs.sound, events };
}

export async function updateNotificationSettings(actor: Actor, data: NotificationSettingSchema) {
  if (!actor.userId) throw new Error("Notification settings belong to a signed-in user");
  const { userId, orgId } = actor;
  await prisma.$transaction(async (tx) => {
    // Locking the member row serialises concurrent saves, so each merges onto the last one's
    // result — the settings row may not exist yet to lock. NO KEY UPDATE leaves the
    // notification inserts that reference this member unblocked.
    const [member] = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "OrgMember"
      WHERE "userId" = ${userId}::uuid AND "orgId" = ${orgId}::uuid
      FOR NO KEY UPDATE`;
    if (!member) throw new Error(`No org member found for userId=${userId}, orgId=${orgId}`);
    const id = member.id;
    const row = await tx.notificationSetting.findUnique({ where: { orgMemberId: id } });
    const current = preferencesFromRow(row);
    const overrides = mergeOverrides(current.overrides, data.events ?? {});
    const fields = {
      ...current.channels,
      ...data.channels,
      sound: data.sound ?? current.sound,
      overrides: overrides as Prisma.InputJsonObject,
    };
    await tx.notificationSetting.upsert({
      where: { orgMemberId: id },
      create: { orgMemberId: id, ...fields },
      update: fields,
    });
  });
  return getNotificationSettings(actor);
}

export async function createNotification(input: {
  userId: string;
  orgId: string;
  source: string;
  subSource: string;
  event?: string;
  data: Prisma.InputJsonValue;
}) {
  return await prisma.notification.create({
    data: {
      orgMember: { connect: { userId_orgId: { userId: input.userId, orgId: input.orgId } } },
      source: input.source,
      subSource: input.subSource,
      event: input.event ?? null,
      data: input.data,
    },
    select: { id: true, createdAt: true },
  });
}

const LIMIT_EVENT = {
  activeContacts: "billing.active_contact_limit",
  campaignCredits: "billing.campaign_credit_limit",
  shopOrders: "billing.shop_order_limit",
} as const;

const LIMIT_MESSAGE: Record<MeterLimit, { upgrade: string; contract: string }> = {
  activeContacts: {
    upgrade:
      "You've reached this month's active contacts. You can still message contacts you've " +
      "already talked to; upgrade or add a contact pack to reach new ones.",
    contract:
      "You've reached the active contacts set on your agreement. Talk to us to raise it and " +
      "reach new contacts this month.",
  },
  campaignCredits: {
    upgrade:
      "You've used this month's campaign credits, so campaigns are paused. Upgrade or add a " +
      "credit pack to keep sending.",
    contract:
      "You've used the campaign credits set on your agreement, so campaigns are paused. Talk " +
      "to us to raise it.",
  },
  shopOrders: {
    upgrade:
      "Your shop has taken this month's orders, so customers are asked to message you to " +
      "order. Upgrade to keep taking orders online.",
    contract:
      "Your shop has taken the orders set on your agreement this month, so customers are " +
      "asked to message you to order. Talk to us to raise it.",
  },
};

/** Whether the org can lift a limit by buying a bigger tier: Free can, a contract cannot. */
async function canUpgrade(orgId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { orgId },
    select: {
      basePlan: {
        select: {
          name: true,
          paymentPlanId: true,
          monthlyPaymentPlanId: true,
          yearlyPaymentPlanId: true,
          stripeId: true,
        },
      },
    },
  });
  const plan = subscription?.basePlan ?? null;
  return isGatewayBilledPlan(plan) || plan?.name === "FREE PLAN";
}

/**
 * Tells everyone who can act on it that an allowance is spent: an in-app/push notification
 * to members with `notify.billing`, and an email to the owner and admins whatever their
 * settings say, because messages stop going out. Called once per limit per period; never
 * throws, so it cannot affect the metering that triggered it.
 */
export async function notifyLimitReached(orgId: string, limit: MeterLimit) {
  try {
    // A sales-led account has no tier above it to buy, so "upgrade" would be a dead end.
    const copy = LIMIT_MESSAGE[limit];
    const message = (await canUpgrade(orgId)) ? copy.upgrade : copy.contract;

    await notify({
      event: LIMIT_EVENT[limit],
      orgId,
      audience: { kind: "permitted" },
      data: { message },
    });
    await sendUsageLimitMailAlert(orgId, limit);
  } catch (error) {
    log.error({ err: error, orgId, limit }, "Failed to send the limit-reached notification");
  }
}

/** The in-app warning that most of the month's orders are taken. No email: nothing has stopped. */
export async function notifyOrderLimitNearing(orgId: string, used: number, max: number) {
  try {
    const next = (await canUpgrade(orgId))
      ? "Upgrade to keep taking orders online after that."
      : "Talk to us to raise it.";
    await notify({
      event: "billing.shop_order_limit",
      orgId,
      audience: { kind: "permitted" },
      data: {
        message: `Your shop has taken ${used} of its ${max} orders this month. ${next}`,
        reached: false,
      },
    });
  } catch (error) {
    log.error({ err: error, orgId }, "Failed to send the order-limit warning");
  }
}

export async function deleteNotificationById(
  notificationId: string,
  userId: string,
  orgId: string,
) {
  await prisma.notification.deleteMany({
    where: { id: notificationId, orgMember: { userId, orgId } },
  });
}

export async function deleteAllNotificationsByUser(userId: string, orgId: string) {
  await prisma.notification.deleteMany({
    where: {
      orgMember: {
        userId,
        orgId,
      },
    },
  });
}

interface SystemNotificationData {
  userId: string;
  orgId: string;
  source: string;
  subSource: string;
  data: Prisma.InputJsonValue;
  /**
   * Set on everything `dispatchNotification` produces. Jobs enqueued before the catalogue
   * carry only the fields above and are written to the bell as they always were.
   */
  event?: string;
  feed?: boolean;
  toast?: boolean;
  desktop?: boolean;
  sound?: boolean;
  title?: string;
  body?: string;
}

interface PushNotificationData {
  expoTokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface PushReceiptData {
  /** Ticket id → the token it was sent to. */
  tokensByTicketId: Record<string, string>;
}

/**
 * How long to wait before asking Expo what became of a queued push. Expo's own
 * guidance is at least 15 minutes; asking sooner mostly returns "not ready yet",
 * which this pass skips rather than retries.
 */
const PUSH_RECEIPT_DELAY_MS = 15 * 60 * 1000;

export interface NotificationJobData {
  /** An event to resolve into the per-channel jobs below; see `notify`. */
  notifyData?: NotifyJobData;
  emailData?: EmailParams;
  systemNotificationData?: SystemNotificationData;
  pushNotificationData?: PushNotificationData;
  pushReceiptData?: PushReceiptData;
}

export async function processNotification(job: Job<NotificationJobData>) {
  const { notifyData, emailData, systemNotificationData, pushNotificationData, pushReceiptData } =
    job.data;

  // Fanned out into jobs of their own so a failing email retries alone, instead of re-sending
  // every push and bell row that already went out.
  if (notifyData) {
    const jobs = await dispatchNotification(notifyData);
    if (jobs.length > 0) {
      await notificationQueue.addBulk(jobs.map((data) => ({ name: "notification", data })));
    }
  }

  if (emailData) {
    // A job with no recipient can never be delivered, so it must not be thrown: throwing
    // is what asks BullMQ to retry, and this one burned five SES calls and five "Missing
    // required header 'To'" stack traces before giving up on an email that was never
    // sendable. Dropped with a warning instead — the enqueueing side is where a missing
    // address is a bug worth chasing.
    if (!emailData.to) {
      log.warn(
        { jobId: job.id, subject: emailData.subject },
        "Dropping an email job with no recipient",
      );
    } else {
      // `sendAWSEmail` reports failure by returning false rather than throwing. Turning
      // that into a throw is what lets BullMQ retry — otherwise a throttled SES call looks
      // like a delivered email.
      const sent = await sendAWSEmail(emailData);
      if (!sent) {
        throw new Error(`Email send failed for ${emailData.to}`);
      }
    }
  }

  if (pushNotificationData) {
    const tokensByTicketId = await sendPushNotification(
      pushNotificationData.expoTokens,
      pushNotificationData.title,
      pushNotificationData.body,
      pushNotificationData.data,
    );

    // A ticket only says Expo accepted the message. Schedule the second half of
    // the exchange, which is where delivery actually succeeds or fails.
    if (Object.keys(tokensByTicketId).length > 0) {
      await notificationQueue.add(
        "pushReceipts",
        { pushReceiptData: { tokensByTicketId } },
        { delay: PUSH_RECEIPT_DELAY_MS },
      );
    }
  }

  if (pushReceiptData) {
    await checkPushReceipts(pushReceiptData.tokensByTicketId);
  }

  if (systemNotificationData) {
    await deliverSystemNotification(systemNotificationData);
  }

  if (
    !notifyData &&
    !emailData &&
    !pushNotificationData &&
    !systemNotificationData &&
    !pushReceiptData
  ) {
    throw new Error("Invalid notification job: no notification payload provided");
  }
}

async function deliverSystemNotification(input: SystemNotificationData) {
  const { userId, orgId, event } = input;
  if (!event) {
    await createNotification(input);
    return;
  }

  const row = input.feed ? await createNotification(input) : null;
  if (!input.toast && !input.desktop) return;

  const message: orgWsMessage = {
    type: "notification",
    notification: {
      id: row?.id ?? null,
      event,
      data: input.data as Record<string, unknown>,
      title: input.title ?? "",
      body: input.body ?? "",
      path: String((input.data as Record<string, unknown>).path ?? "/dashboard"),
      toast: Boolean(input.toast),
      desktop: Boolean(input.desktop),
      sound: Boolean(input.sound),
      createdAt: (row?.createdAt ?? new Date()).toISOString(),
    },
  };
  try {
    // Imported here because the publisher opens a Redis connection on import, and the API
    // loads this module too; only the worker ever reaches this line.
    const { publisher, WS_CHANNEL } = await import("../../workers/shared/ws.publisher.js");
    await publisher.publish(
      WS_CHANNEL,
      JSON.stringify({ orgId, data: message, roleFilter: "main", userIds: [userId] }),
    );
  } catch (error) {
    // The row is written; the member sees it on their next refresh.
    log.error({ err: error, userId, event }, "Could not publish a live notification");
  }
}
