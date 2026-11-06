import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

import type { Schedule } from "./schema.ts";
import { days, toMinutes } from "./schema.ts";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface OpenState {
  isOpen: boolean;
  /** The day the next change falls on, as a key into the schedule. */
  nextDay: (typeof days)[number] | null;
  /** "HH:MM" the next change happens at, or null when nothing is scheduled. */
  nextTime: string | null;
  /** True when the next change is on a later day than the one being evaluated. */
  nextIsLater: boolean;
}

/**
 * Whether the schedule says a person is answering right now. Mirrors the server's
 * `validateTimeWindow` (wa_automatedReply.utils.ts), which the auto-reply engine asks, so the
 * two must agree. An unknown timezone falls back to the viewer's rather than throwing.
 */
export function getOpenState(schedule: Schedule, tz: string): OpenState {
  let now: dayjs.Dayjs;
  try {
    now = dayjs().tz(tz);
  } catch {
    now = dayjs();
  }

  const minutesNow = now.hour() * 60 + now.minute();
  const todayIndex = now.day();
  const today = days[todayIndex];

  const isOpen = schedule[today].isOpen
    ? schedule[today].timeSlots.some(
        (slot) => minutesNow >= toMinutes(slot.openTime) && minutesNow < toMinutes(slot.closeTime),
      )
    : false;

  if (isOpen) {
    // Closing time is the end of whichever slot we are inside.
    const slot = schedule[today].timeSlots.find(
      (candidate) =>
        minutesNow >= toMinutes(candidate.openTime) && minutesNow < toMinutes(candidate.closeTime),
    );
    return { isOpen: true, nextDay: today, nextTime: slot?.closeTime ?? null, nextIsLater: false };
  }

  // Closed: walk forward through the week for the next opening, today included.
  for (let offset = 0; offset < 7; offset++) {
    const day = days[(todayIndex + offset) % 7];
    const daySchedule = schedule[day];
    if (!daySchedule.isOpen) continue;

    const opening = [...daySchedule.timeSlots]
      .map((slot) => slot.openTime)
      .sort()
      .find((time) => offset > 0 || toMinutes(time) > minutesNow);

    if (opening) {
      return { isOpen: false, nextDay: day, nextTime: opening, nextIsLater: offset > 0 };
    }
  }

  return { isOpen: false, nextDay: null, nextTime: null, nextIsLater: false };
}
