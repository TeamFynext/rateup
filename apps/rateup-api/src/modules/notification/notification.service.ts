import { Job } from "bullmq";
import { Prisma, Role } from "../../../generated/prisma/client.js";
import { EmailParams, sendAWSEmail } from "../../utils/email/sendAWSEmail.js";
import { log } from "../../utils/logger.js";
import { sendUsageLimitMailAlert } from "../../utils/email/payments/usageLimitAlert.js";
import prisma from "../../utils/prisma.js";
import { checkPushReceipts, sendPushNotification } from "../mobileNotification/mobile.service.js";
import { notificationQueue } from "../../workers/bullmq/queues/notification.queue.js";
import { NotificationSettingSchema } from "./notification.schema.js";

export async function getNotifications(userId: string, orgId: string) {
  return await prisma.notification.findMany({
    where: {
      orgMember: {
        userId,
        orgId,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getNotificationsCount(userId: string, orgId: string) {
  return await prisma.notification.count({
    where: {
      orgMember: {
        userId,
        orgId,
      },
    },
  });
}

export async function updateNotificationSettings(
  userId: string,
  orgId: string,
  data: NotificationSettingSchema,
) {
  const orgMember = await prisma.orgMember.findUnique({
    where: {
      userId_orgId: {
        userId,
        orgId,
      },
    },
    select: {
      id: true,
    },
  });
  if (!orgMember) {
    throw new Error(`No org member found for userId=${userId}, orgId=${orgId}`);
  }
  const { id } = orgMember;
  await prisma.notificationSetting.upsert({
    where: {
      orgMemberId: id,
    },
    create: {
      orgMemberId: id,
      ...data,
    },
    update: data,
  });
}

export async function getNotificationSettings(userId: string, orgId: string) {
  return await prisma.notificationSetting.findFirst({
    where: {
      orgMember: {
        userId,
        orgId,
      },
    },
  });
}

export async function createNotification(
  userId: string,
  orgId: string,
  source: string,
  subSource: string,
  data: Prisma.InputJsonValue,
) {
  await prisma.notification.create({
    data: {
      orgMember: {
        connect: {
          userId_orgId: {
            userId,
            orgId,
          },
        },
      },
      source,
      subSource,
      data,
    },
  });
}

// Notifies the org's owner + admins (the members who can upgrade) that the org
// has reached its conversation limit. Fired once per cycle from the point the
// counter crosses the limit; best-effort so it never blocks conversation counting.
export async function notifyConversationLimitReached(orgId: string) {
  try {
    const admins = await prisma.orgMember.findMany({
      where: { orgId, role: { in: [Role.SUPER_ADMIN, Role.ADMIN] }, user: { active: true } },
      select: { userId: true },
    });

    await Promise.all(
      admins.map((m) =>
        createNotification(m.userId, orgId, "subscription", "conversation-limit-reached", {
          message:
            "You've reached your conversation limit. Upgrade your plan to keep sending messages.",
        }),
      ),
    );

    // The in-app notification only reaches someone already looking at the dashboard.
    // Hitting a limit stops messages going out, so it has to reach the owner's inbox too.
    // `sendUsageLimitMailAlert` carries its own once-a-week guard, so a org that bounces
    // on and off its limit is not mailed repeatedly.
    await sendUsageLimitMailAlert(orgId);
  } catch (error) {
    log.error(error, "Failed to send conversation-limit notification");
  }
}

export async function deleteNotificationById(notificationId: string) {
  await prisma.notification.delete({
    where: {
      id: notificationId,
    },
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
  emailData?: EmailParams;
  systemNotificationData?: SystemNotificationData;
  pushNotificationData?: PushNotificationData;
  pushReceiptData?: PushReceiptData;
}

export async function processNotification(job: Job<NotificationJobData>) {
  const { emailData, systemNotificationData, pushNotificationData, pushReceiptData } = job.data;

  if (emailData) {
    // `sendAWSEmail` reports failure by returning false rather than throwing. Turning that
    // into a throw is what lets BullMQ retry — otherwise a throttled SES call looks like a
    // delivered email.
    const sent = await sendAWSEmail(emailData);
    if (!sent) {
      throw new Error(`Email send failed for ${emailData.to}`);
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
    const { userId, orgId, source, subSource, data } = systemNotificationData;

    await createNotification(userId, orgId, source, subSource, data);
  }

  if (!emailData && !pushNotificationData && !systemNotificationData && !pushReceiptData) {
    throw new Error("Invalid notification job: no notification payload provided");
  }
}
