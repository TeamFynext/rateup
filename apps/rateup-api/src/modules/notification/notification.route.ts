import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import {
  deleteAllNotificationsHandler,
  deleteNotificationByIdHandler,
  getNotificationsCountHandler,
  getNotificationSettingHandler,
  getNotificationsHandler,
  updateNotificationSettingHandler,
} from "./notification.controller";
import { $NotifyRef } from "./notification.schema";

export async function notificationRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get("/", getNotificationsHandler);
  server.get("/count", getNotificationsCountHandler);
  server.put(
    "/settings",
    {
      schema: {
        body: $NotifyRef("notificationSettingSchema"),
      },
    },
    updateNotificationSettingHandler,
  );
  server.get("/settings", getNotificationSettingHandler);
  server.delete(
    "/:notificationId",
    {
      schema: {
        params: $NotifyRef("notificationIdParamSchema"),
      },
    },
    deleteNotificationByIdHandler,
  );
  server.delete("/", deleteAllNotificationsHandler);
}
