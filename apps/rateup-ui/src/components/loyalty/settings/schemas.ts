import { z } from "zod";

/**
 * Points expiry, the one settings form left on the Settings page. The join message and
 * the notification forms that used to sit beside it moved to Messages, where the message
 * catalog and the event triggers are the source of truth.
 */
export const ExpirationSettingsSchema = z.object({
  enabled: z.boolean(),
  months: z.number().min(1, "Expiration Period is required"),
});
