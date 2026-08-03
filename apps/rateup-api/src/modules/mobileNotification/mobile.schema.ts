import { z } from "zod";

const expoTokenField = z
  .string()
  .min(20, "Expo token is too short")
  .regex(/^ExponentPushToken\[(.+)\]$/, "Invalid Expo push token format");

const addExpoTokenSchema = z.object({
  expoToken: expoTokenField,
});

const deleteExpoTokenSchema = z.object({
  expoToken: expoTokenField,
});

export type AddExpoTokenSchema = z.infer<typeof addExpoTokenSchema>;
export type DeleteExpoTokenSchema = z.infer<typeof deleteExpoTokenSchema>;

// Auto-exported after fastify-zod migration
export { addExpoTokenSchema, deleteExpoTokenSchema };
