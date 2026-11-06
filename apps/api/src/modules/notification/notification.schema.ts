import z from "zod";
import { NOTIFICATION_CHANNELS } from "./notification.catalogue.js";

const notificationIdParamSchema = z.object({
  notificationId: z.string(),
});

const channelToggles = z.partialRecord(z.enum(NOTIFICATION_CHANNELS), z.boolean());

/** Unknown event keys are accepted and dropped, so an older client cannot fail a save. */
const notificationSettingSchema = z.object({
  channels: channelToggles.optional(),
  sound: z.boolean().optional(),
  events: z.record(z.string(), channelToggles).optional(),
});

export type NotificationIdParamSchema = z.infer<typeof notificationIdParamSchema>;
export type NotificationSettingSchema = z.infer<typeof notificationSettingSchema>;

// Auto-exported after fastify-zod migration
export { notificationSettingSchema, notificationIdParamSchema };
