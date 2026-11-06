import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils.ts";

import type { DayKey, Schedule } from "./schema.ts";
import { days, MINUTES_IN_DAY, toMinutes } from "./schema.ts";

/**
 * The week as a shape: filled blocks are the hours a person answers, the ground is when the
 * auto-reply is on duty. The axis runs all 24 hours so the unattended time stays visible.
 * Each day is a button, so the strip is keyboard-reachable.
 */

/** Gridlines every six hours. Any denser and the labels collide at mobile widths. */
const AXIS_MARKS = [0, 6, 12, 18, 24];

const toPercent = (minutes: number) => (minutes / MINUTES_IN_DAY) * 100;

interface Props {
  schedule: Schedule;
  /** Highlighted because its row is open for editing. */
  activeDay: DayKey | null;
  onSelectDay: (day: DayKey) => void;
  dayLabel: (day: DayKey) => string;
  dayLabelShort: (day: DayKey) => string;
  describeDay: (day: DayKey) => string;
}

export function WeekStrip({
  schedule,
  activeDay,
  onSelectDay,
  dayLabel,
  dayLabelShort,
  describeDay,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const axis = (
    <div className="flex flex-col justify-between text-[10px] text-muted-foreground tabular-nums">
      {AXIS_MARKS.map((hour) => (
        <span key={hour} className="leading-none">
          {String(hour).padStart(2, "0")}:00
        </span>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Vertical: a column per day, time running top to bottom. */}
      <div className="hidden gap-2 sm:flex">
        <div className="flex flex-col pt-5 pb-1">{axis}</div>

        <div className="grid flex-1 grid-cols-7 gap-1.5">
          {days.map((day) => {
            const daySchedule = schedule[day];
            const isActive = activeDay === day;

            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDay(day)}
                aria-pressed={isActive}
                className={cn(
                  "group flex flex-col gap-1 rounded-md outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wide",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {dayLabelShort(day)}
                </span>

                <span
                  aria-hidden="true"
                  className={cn(
                    "relative h-40 w-full overflow-hidden rounded-md border bg-muted transition-colors",
                    isActive ? "border-primary" : "border-border group-hover:border-primary/40",
                  )}
                >
                  {AXIS_MARKS.slice(1, -1).map((hour) => (
                    <span
                      key={hour}
                      className="absolute inset-x-0 border-t border-border/60"
                      style={{ top: `${toPercent(hour * 60)}%` }}
                    />
                  ))}

                  {daySchedule.isOpen &&
                    daySchedule.timeSlots.map((slot, index) => {
                      const start = toMinutes(slot.openTime);
                      const end = toMinutes(slot.closeTime);
                      if (end <= start) return null;

                      return (
                        <span
                          key={`${slot.openTime}-${slot.closeTime}-${index}`}
                          className="absolute inset-x-0.5 rounded-sm bg-primary"
                          style={{
                            top: `${toPercent(start)}%`,
                            height: `${toPercent(end - start)}%`,
                          }}
                        />
                      );
                    })}
                </span>

                <span className="sr-only">{describeDay(day)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal: the same data transposed, so a phone reads rows instead of
          seven columns squeezed into 375px. */}
      <div className="flex flex-col gap-1 sm:hidden">
        {days.map((day) => {
          const daySchedule = schedule[day];
          const isActive = activeDay === day;

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-pressed={isActive}
              className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "w-9 shrink-0 text-left text-[10px] font-medium uppercase tracking-wide",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {dayLabelShort(day)}
              </span>

              <span
                aria-hidden="true"
                className={cn(
                  "relative h-6 flex-1 overflow-hidden rounded-md border bg-muted",
                  isActive ? "border-primary" : "border-border",
                )}
              >
                {AXIS_MARKS.slice(1, -1).map((hour) => (
                  <span
                    key={hour}
                    className="absolute inset-y-0 border-l border-border/60"
                    style={{ left: `${toPercent(hour * 60)}%` }}
                  />
                ))}

                {daySchedule.isOpen &&
                  daySchedule.timeSlots.map((slot, index) => {
                    const start = toMinutes(slot.openTime);
                    const end = toMinutes(slot.closeTime);
                    if (end <= start) return null;

                    return (
                      <span
                        key={`${slot.openTime}-${slot.closeTime}-${index}`}
                        className="absolute inset-y-0.5 rounded-sm bg-primary"
                        style={{
                          left: `${toPercent(start)}%`,
                          width: `${toPercent(end - start)}%`,
                        }}
                      />
                    );
                  })}
              </span>

              <span className="sr-only">{describeDay(day)}</span>
            </button>
          );
        })}

        <div className="flex justify-between pl-11 text-[10px] text-muted-foreground tabular-nums">
          {AXIS_MARKS.map((hour) => (
            <span key={hour}>{String(hour).padStart(2, "0")}</span>
          ))}
        </div>
      </div>

      {/* The legend is where the inversion is stated outright: the pale ground is the
          auto-reply's shift, not blank space. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-xs bg-primary" />
          {t("Your team replies")}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-xs border border-border bg-muted" />
          {t("Auto-reply handles this")}
        </span>
        <span className="sr-only">{days.map((day) => dayLabel(day)).join(", ")}</span>
      </div>
    </div>
  );
}
