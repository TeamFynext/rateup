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

/** An IANA zone the database can bucket by; anything else would be a SQL error. */
const timeZone = z.string().refine((tz) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, "Unknown time zone");

const range = {
  from: z.coerce.date(),
  to: z.coerce.date(),
  phoneId: z.string().min(1).optional(),
};

export const callLogQuerySchema = z
  .object({
    ...range,
    direction: z.enum(["USER_INITIATED", "BUSINESS_INITIATED"]).optional(),
    outcome: z.enum(["answered", "missed", "declined", "failed"]).optional(),
    agentId: z.uuid().optional(),
    search: z.string().max(100).optional(),
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .refine((q) => q.from <= q.to, "from must be before to");

export const callAnalyticsQuerySchema = z
  .object({ ...range, tz: timeZone })
  .refine((q) => q.from <= q.to, "from must be before to")
  // A year of days is plenty, and keeps the zero-filled daily series bounded.
  .refine((q) => q.to.getTime() - q.from.getTime() <= 366 * 86_400_000, "Range is too long");

export type CallLogQuery = z.infer<typeof callLogQuerySchema>;
export type CallAnalyticsQuery = z.infer<typeof callAnalyticsQuerySchema>;
export type CallIdParams = z.infer<typeof callIdParamsSchema>;
export type AcceptCallInput = z.infer<typeof acceptCallSchema>;
export type StartCallInput = z.infer<typeof startCallSchema>;
export type CallPermissionQuery = z.infer<typeof callPermissionQuerySchema>;
export type RequestCallPermissionInput = z.infer<typeof requestCallPermissionSchema>;
export type CallSettingsParams = z.infer<typeof callSettingsParamsSchema>;
export type CallSettingsInput = z.infer<typeof callSettingsSchema>;
