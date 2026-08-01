import { Job } from "bullmq";
import { Prisma, Role } from "../../../generated/prisma/client.js";
import { EmailParams, sendAWSEmail } from "../../utils/email/sendAWSEmail.js";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";
import { sendPushNotification } from "../mobileNotification/mobile.service.js";
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

export interface NotificationJobData {
  emailData?: EmailParams;
  systemNotificationData?: SystemNotificationData;
  pushNotificationData?: PushNotificationData;
}

export async function processNotification(job: Job<NotificationJobData>) {
  const { emailData, systemNotificationData, pushNotificationData } = job.data;

  if (emailData) {
    await sendAWSEmail(emailData);
  }

  if (pushNotificationData) {
    await sendPushNotification(
      pushNotificationData.expoTokens,
      pushNotificationData.title,
      pushNotificationData.body,
      pushNotificationData.data,
    );
  }

  if (systemNotificationData) {
    const { userId, orgId, source, subSource, data } = systemNotificationData;

    await createNotification(userId, orgId, source, subSource, data);
  }

  if (!emailData && !pushNotificationData && !systemNotificationData) {
    throw new Error("Invalid notification job: no notification payload provided");
  }
}
