import { z } from "zod";

/** RFC 8866 SDP from the browser. Real offers run a few KB; the cap only stops abuse. */
const sdp = z.string().min(1).max(20_000);

export const callIdParamsSchema = z.object({ callId: z.uuid() });
export const acceptCallSchema = z.object({ sdp });
export const startCallSchema = z.object({
  phoneId: z.string().min(1),
  contactId: z.uuid(),
  sdp,
});
export const callPermissionQuerySchema = z.object({
  phoneId: z.string().min(1),
  contactId: z.uuid(),
});
export const requestCallPermissionSchema = z.object({
  phoneId: z.string().min(1),
  contactId: z.uuid(),
  body: z.string().min(1).max(1024),
  teamId: z.string().nullish(),
});
export const callSettingsParamsSchema = z.object({ phoneId: z.string().min(1) });

const hhmm = z.string().regex(/^([01]\d|2[0-3])[0-5]\d$/, "Use 24-hour HHMM");
const dayOfWeek = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

/**
 * The subset of Meta's `calling` settings object the dashboard manages. SIP and voicemail
 * are left out: they need infrastructure we do not run, and Meta keeps whatever is set
 * when a field is omitted.
 */
export const callSettingsSchema = z.object({
  status: z.enum(["ENABLED", "DISABLED"]),
  call_icon_visibility: z.enum(["DEFAULT", "DISABLE_ALL"]).optional(),
  callback_permission_status: z.enum(["ENABLED", "DISABLED"]).optional(),
  call_hours: z
    .object({
      status: z.enum(["ENABLED", "DISABLED"]),
      timezone_id: z.string().min(1),
      weekly_operating_hours: z
        .array(z.object({ day_of_week: dayOfWeek, open_time: hhmm, close_time: hhmm }))
        .max(14),
      holiday_schedule: z
        .array(
          z.object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            start_time: hhmm,
            end_time: hhmm,
          }),
        )
        .max(20)
        .optional(),
    })
    .optional(),
});

export type CallIdParams = z.infer<typeof callIdParamsSchema>;
export type AcceptCallInput = z.infer<typeof acceptCallSchema>;
export type StartCallInput = z.infer<typeof startCallSchema>;
export type CallPermissionQuery = z.infer<typeof callPermissionQuerySchema>;
export type RequestCallPermissionInput = z.infer<typeof requestCallPermissionSchema>;
export type CallSettingsParams = z.infer<typeof callSettingsParamsSchema>;
export type CallSettingsInput = z.infer<typeof callSettingsSchema>;
