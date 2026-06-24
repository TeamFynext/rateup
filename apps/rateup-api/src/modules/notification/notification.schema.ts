import z from "zod";

const notificationIdParamSchema = z.object({
  notificationId: z.string(),
});

const notificationSettingSchema = z.object({
  ticketAssignNotification: z.boolean().optional(),
  waMessageAssignNotification: z.boolean().optional(),
  waMessageClosedNotification: z.boolean().optional(),
});

export type NotificationIdParamSchema = z.infer<typeof notificationIdParamSchema>;
export type NotificationSettingSchema = z.infer<typeof notificationSettingSchema>;

// Auto-exported after fastify-zod migration
export { notificationSettingSchema, notificationIdParamSchema };
