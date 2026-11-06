import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import {
  deleteAllNotificationsByUser,
  deleteNotificationById,
  getNotifications,
  getNotificationsCount,
  getNotificationSettings,
  markAllNotificationsRead,
  updateNotificationSettings,
} from "./notification.service.js";
import { NotificationIdParamSchema, NotificationSettingSchema } from "./notification.schema.js";

export async function getNotificationsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { userId, orgId } = request.user;
    const res = await getNotifications(userId!, orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error getting notification " });
  }
}

export async function getNotificationsCountHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { userId, orgId } = request.user;
    const res = await getNotificationsCount(userId!, orgId);
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
    const res = await updateNotificationSettings(request.actor!, request.body);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error updating notification settings" });
  }
}

export async function getNotificationSettingHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const res = await getNotificationSettings(request.actor!);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error getting notification settings" });
  }
}

export async function deleteNotificationByIdHandler(
  request: FastifyRequest<{ Params: NotificationIdParamSchema }>,
  reply: FastifyReply,
) {
  try {
    const { userId, orgId } = request.user;
    const res = await deleteNotificationById(request.params.notificationId, userId!, orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error deleting notification" });
  }
}

export async function deleteAllNotificationsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { userId, orgId } = request.user;
    const res = await deleteAllNotificationsByUser(userId!, orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error deleting notification" });
  }
}

export async function markAllNotificationsReadHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { userId, orgId } = request.user;
    await markAllNotificationsRead(userId!, orgId);
    reply.code(204).send();
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error marking notifications read" });
  }
}
