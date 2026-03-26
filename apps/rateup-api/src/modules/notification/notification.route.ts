import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  deleteAllNotificationsHandler,
  deleteNotificationByIdHandler,
  getNotificationsCountHandler,
  getNotificationSettingHandler,
  getNotificationsHandler,
  updateNotificationSettingHandler,
} from "./notification.controller.js";
import {
  notificationSettingSchema,
  notificationIdParamSchema,
} from "./notification.schema.js";

export async function notificationRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get("/", getNotificationsHandler);
  server.get("/count", getNotificationsCountHandler);
  server.put(
    "/settings",
    {
      schema: {
        body: notificationSettingSchema,
      },
    },
    updateNotificationSettingHandler,
  );
  server.get("/settings", getNotificationSettingHandler);
  server.delete(
    "/:notificationId",
    {
      schema: {
        params: notificationIdParamSchema,
      },
    },
    deleteNotificationByIdHandler,
  );
  server.delete("/", deleteAllNotificationsHandler);
}
