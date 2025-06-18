import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

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

export const { schemas: expoSchemas, $ref: $ExpoRef } = buildJsonSchemas(
  {
    addExpoTokenSchema,
    deleteExpoTokenSchema,
  },
  { $id: "expoToken" },
);

export type AddExpoTokenSchema = z.infer<typeof addExpoTokenSchema>;
export type DeleteExpoTokenSchema = z.infer<typeof deleteExpoTokenSchema>;
