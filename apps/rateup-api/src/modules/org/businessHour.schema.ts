import { z } from "zod";

/** One day's opening hours. */
const dayScheduleSchema = z.object({
  isOpen: z.boolean(),
  timeSlots: z.array(
    z.object({
      openTime: z.string(),
      closeTime: z.string(),
    }),
  ),
});

/** Opening hours for every weekday. */
const scheduleSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
});

const businessHourCore = {
  name: z.string().min(1),
  timezone: z.string().min(1),
  channels: z.array(z.string()),
  description: z.string().optional(),
  schedule: scheduleSchema,
};

const createBusinessHourSchema = z.object({
  ...businessHourCore,
});

const updateBusinessHourSchema = z
  .object({
    ...businessHourCore,
  })
  .partial();

const businessHourResponseSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  ...businessHourCore,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const businessHourParamsSchema = z.object({
  id: z.string(),
});

export type CreateBusinessHourInput = z.infer<typeof createBusinessHourSchema>;
export type UpdateBusinessHourInput = z.infer<typeof updateBusinessHourSchema>;
export type BusinessHourParams = z.infer<typeof businessHourParamsSchema>;

// Auto-exported after fastify-zod migration
export {
  createBusinessHourSchema,
  updateBusinessHourSchema,
  businessHourResponseSchema,
  businessHourParamsSchema,
};
