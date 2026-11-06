import * as z from "zod";

export const days = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;
export type DayKey = (typeof days)[number];

const timeSlotSchema = z.object({
  openTime: z.string(),
  closeTime: z.string(),
});

const dayScheduleSchema = z.object({
  isOpen: z.boolean(),
  timeSlots: z
    .array(timeSlotSchema)
    .min(1)
    .superRefine((slots, ctx) => {
      if (slots.length <= 1) return;
      const parse = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const withIndex = slots.map((s, index) => ({
        index,
        start: parse(s.openTime),
        end: parse(s.closeTime),
      }));
      withIndex.forEach((s) => {
        if (s.start >= s.end) {
          ctx.addIssue({
            code: "custom",
            message: "End time must be after start time",
            path: [s.index, "closeTime"],
          });
        }
      });
      const sorted = [...withIndex].sort((a, b) => a.start - b.start);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (curr.start < prev.end) {
          ctx.addIssue({
            code: "custom",
            message: "Time ranges overlap",
            path: [curr.index, "openTime"],
          });
          ctx.addIssue({
            code: "custom",
            message: "Time ranges overlap",
            path: [prev.index, "closeTime"],
          });
        }
      }
    }),
});

const scheduleSchema = z.object(
  days.reduce(
    (acc, d) => ({
      ...acc,
      [d]: dayScheduleSchema,
    }),
    {} as Record<DayKey, typeof dayScheduleSchema>,
  ),
);

export const businessHoursFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(64, "Name must be at most 64 characters."),
  timezone: z.string().min(1, "Timezone is required"),
  channels: z.array(z.string()).optional(),
  description: z.string().max(255).optional(),
  schedule: scheduleSchema,
});

export type DaySchedule = z.infer<typeof dayScheduleSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type BusinessHoursFormValues = z.infer<typeof businessHoursFormSchema>;

export const buildDefaultSchedule = (): Schedule => ({
  sunday: {
    isOpen: false,
    timeSlots: [{ openTime: "09:00", closeTime: "17:30" }],
  },
  monday: {
    isOpen: true,
    timeSlots: [{ openTime: "09:00", closeTime: "17:30" }],
  },
  tuesday: {
    isOpen: true,
    timeSlots: [{ openTime: "09:00", closeTime: "17:30" }],
  },
  wednesday: {
    isOpen: true,
    timeSlots: [{ openTime: "09:00", closeTime: "17:30" }],
  },
  thursday: {
    isOpen: true,
    timeSlots: [{ openTime: "09:00", closeTime: "17:30" }],
  },
  friday: {
    isOpen: true,
    timeSlots: [{ openTime: "09:00", closeTime: "17:30" }],
  },
  saturday: {
    isOpen: false,
    timeSlots: [{ openTime: "09:00", closeTime: "17:30" }],
  },
});

export const formatDaySchedule = (day: DaySchedule) => {
  if (!day.isOpen) return "Closed";
  return day.timeSlots.map((s) => `${s.openTime} - ${s.closeTime}`).join(", ");
};

/* ------------------------------------------------------------------------- *
 * Time helpers
 *
 * Times are stored as "HH:MM" strings. Everything below converts to and from
 * minutes-since-midnight, which is the only form worth doing arithmetic in.
 * ------------------------------------------------------------------------- */

export const MINUTES_IN_DAY = 24 * 60;

export const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export const formatMinutes = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(MINUTES_IN_DAY - 1, Math.round(minutes)));
  const hours = Math.floor(clamped / 60);
  return `${String(hours).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
};

/**
 * Parses what someone types into a time field: "9", "9am", "930", "9:30", "6:45 PM", "18:00".
 * Returns "HH:MM", or null when it cannot be read — the caller then keeps the raw text.
 */
export const parseTimeInput = (raw: string): string | null => {
  const value = raw.trim().toLowerCase();
  if (!value) return null;

  const meridiem = /(am|pm)\s*$/.exec(value)?.[1];
  const core = value.replace(/\s*(am|pm)\s*$/, "").replace(/\s+/g, "");
  if (!core) return null;

  let hours: number;
  let minutes: number;

  if (core.includes(":") || core.includes(".")) {
    const [rawHours, rawMinutes] = core.split(/[:.]/);
    if (!/^\d{1,2}$/.test(rawHours) || !/^\d{1,2}$/.test(rawMinutes ?? "")) return null;
    hours = Number(rawHours);
    minutes = Number(rawMinutes);
  } else if (/^\d{1,2}$/.test(core)) {
    hours = Number(core);
    minutes = 0;
  } else if (/^\d{3}$/.test(core)) {
    hours = Number(core.slice(0, 1));
    minutes = Number(core.slice(1));
  } else if (/^\d{4}$/.test(core)) {
    hours = Number(core.slice(0, 2));
    minutes = Number(core.slice(2));
  } else {
    return null;
  }

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  if (hours > 23 || minutes > 59) return null;

  return formatMinutes(hours * 60 + minutes);
};

/** Total minutes a day is covered by its slots — used for the "hours a week" read-out. */
export const dayOpenMinutes = (day: DaySchedule): number =>
  day.isOpen
    ? day.timeSlots.reduce(
        (total, slot) => total + Math.max(0, toMinutes(slot.closeTime) - toMinutes(slot.openTime)),
        0,
      )
    : 0;

export const weekOpenMinutes = (schedule: Schedule): number =>
  days.reduce((total, day) => total + dayOpenMinutes(schedule[day]), 0);
