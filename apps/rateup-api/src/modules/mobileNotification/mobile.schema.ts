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
  /** Optional: app versions before calling did not send it. */
  platform: z.enum(["ios", "android"]).optional(),
});

/** An APNs device token: hex, 64 characters today; bounded loosely in case Apple grows it. */
const voipTokenSchema = z.object({
  token: z.string().regex(/^[0-9a-fA-F]{32,200}$/, "Invalid VoIP token"),
});

const deleteExpoTokenSchema = z.object({
  expoToken: expoTokenField,
});

export type AddExpoTokenSchema = z.infer<typeof addExpoTokenSchema>;
export type DeleteExpoTokenSchema = z.infer<typeof deleteExpoTokenSchema>;
export type VoipTokenSchema = z.infer<typeof voipTokenSchema>;

// Auto-exported after fastify-zod migration
export { addExpoTokenSchema, deleteExpoTokenSchema, voipTokenSchema };
