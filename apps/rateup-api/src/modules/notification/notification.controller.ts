import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger";
import {
  deleteAllNotificationsByUser,
  deleteNotificationById,
  getNotifications,
  getNotificationsCount,
  getNotificationSettings,
  updateNotificationSettings,
} from "./notification.service";
import {
  NotificationIdParamSchema,
  NotificationSettingSchema,
} from "./notification.schema";

export async function getNotificationsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { userId, orgId } = request.user;
    const res = await getNotifications(userId, orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error getting notification " });
  }
}

export async function getNotificationsCountHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { userId, orgId } = request.user;
    const res = await getNotificationsCount(userId, orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error getting notification " });
  }
}

export async function updateNotificationSettingHandler(
  request: FastifyRequest<{ Body: NotificationSettingSchema }>,
  reply: FastifyReply,
) {
  try {
    const { userId, orgId } = request.user;
    const res = await updateNotificationSettings(userId, orgId, request.body);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error updating notification settings" });
  }
}

export async function getNotificationSettingHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { userId, orgId } = request.user;
    const res = await getNotificationSettings(userId, orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error updating notification settings" });
  }
}

export async function deleteNotificationByIdHandler(
  request: FastifyRequest<{ Params: NotificationIdParamSchema }>,
  reply: FastifyReply,
) {
  try {
    const { notificationId } = request.params;
    const res = await deleteNotificationById(notificationId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error deleting notification" });
  }
}

export async function deleteAllNotificationsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { userId, orgId } = request.user;
    const res = await deleteAllNotificationsByUser(userId, orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error deleting notification" });
  }
}
