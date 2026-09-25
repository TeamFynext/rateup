import { FastifyInstance } from "fastify";
import {
  deleteAllNotificationsHandler,
  deleteNotificationByIdHandler,
  getNotificationsCountHandler,
  getNotificationSettingHandler,
  getNotificationsHandler,
  markAllNotificationsReadHandler,
  updateNotificationSettingHandler,
} from "./notification.controller.js";
import { notificationSettingSchema, notificationIdParamSchema } from "./notification.schema.js";
import { declareAccess } from "../../authz/registry.js";

export async function notificationRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
  server.get("/", getNotificationsHandler);
  server.get("/count", getNotificationsCountHandler);
  server.post("/read", markAllNotificationsReadHandler);
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
