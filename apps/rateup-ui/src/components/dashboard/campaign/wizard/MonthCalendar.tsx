import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * A month grid, Monday-first, with the leading and trailing days of the
 * neighbouring months shown greyed rather than as blanks.
 *
 * Hand-rolled rather than `ui/calendar.tsx` because the design's grid is part of
 * a card that also holds the time and timezone fields, and it sizes its cells to
 * that card — 40px rows in a 7-column grid — rather than to the popover the
 * shared calendar is built for.
 */
export function MonthCalendar({
  value,
  onChange,
  disabled = false,
  minDate,
}: Readonly<{
  value: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
  minDate?: Date;
}>) {
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const floor = minDate ? startOfDay(minDate) : null;

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    // getDay() is Sunday-first; shift so Monday is column 0.
    const lead = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(start.getDate() - lead);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { date, outside: date.getMonth() !== month.getMonth() };
    });
  }, [month]);

  const shiftMonth = (delta: number) =>
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={disabled}
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="text-muted-foreground hover:text-foreground cursor-pointer disabled:cursor-default disabled:opacity-40"
        >
          <IconChevronLeft className="size-4.5" aria-hidden />
        </button>
        <span className="font-display text-sm font-semibold">
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="text-muted-foreground hover:text-foreground cursor-pointer disabled:cursor-default disabled:opacity-40"
        >
          <IconChevronRight className="size-4.5" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((day) => (
          <span
            key={day}
            className="text-muted-foreground/70 py-1 text-center text-[11px] font-semibold"
          >
            {day}
          </span>
        ))}
        {days.map(({ date, outside }) => {
          const selected = sameDay(date, value);
          const isToday = sameDay(date, new Date());
          const tooEarly = floor ? startOfDay(date) < floor : false;
          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={disabled || tooEarly}
              aria-current={selected ? "date" : undefined}
              onClick={() => onChange(date)}
              className={cn(
                "flex h-10 items-center justify-center rounded-lg text-[13px] tabular-nums",
                selected && "bg-primary text-primary-foreground font-semibold",
                !selected && isToday && "ring-primary/40 font-semibold ring-1",
                !selected && outside && "text-muted-foreground/50",
                !selected && !outside && "text-foreground",
                disabled || tooEarly
                  ? "cursor-default opacity-40"
                  : !selected && "hover:bg-muted cursor-pointer",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
