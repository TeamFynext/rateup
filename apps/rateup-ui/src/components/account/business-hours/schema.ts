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

export const timeOptions: string[] = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
    .toString()
    .padStart(2, "0");
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

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
            code: z.ZodIssueCode.custom,
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
            code: z.ZodIssueCode.custom,
            message: "Time ranges overlap",
            path: [curr.index, "openTime"],
          });
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
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
