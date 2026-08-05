import { z } from "zod";

const EXPO_TOKEN_PATTERN = /^ExponentPushToken\[(.+)\]$/;
const EXPO_TOKEN_MIN_LENGTH = 20;

export function isExpoPushToken(token: unknown): token is string {
  return (
    typeof token === "string" &&
    token.length >= EXPO_TOKEN_MIN_LENGTH &&
    EXPO_TOKEN_PATTERN.test(token)
  );
}

const expoTokenField = z
  .string()
  .min(EXPO_TOKEN_MIN_LENGTH, "Expo token is too short")
  .regex(EXPO_TOKEN_PATTERN, "Invalid Expo push token format");

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
