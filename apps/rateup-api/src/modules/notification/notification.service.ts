import { Job } from "bullmq";
import { EmailParams, sendAWSEmail } from "../../utils/email/sendAWSEmail.js";
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
  const { id } = await prisma.orgMember.findUnique({
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

export async function getNotificationSettings(userId, orgId) {
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
  userId,
  orgId,
  source,
  subSource,
  data,
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

export async function deleteNotificationById(notificationId: string) {
  await prisma.notification.delete({
    where: {
      id: notificationId,
    },
  });
}

export async function deleteAllNotificationsByUser(userId, orgId) {
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
  data: Record<string, any>;
}

interface PushNotificationData {
  expoTokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
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
    throw new Error(
      "Invalid notification job: no notification payload provided",
    );
  }
}
