import { Calendar } from "@/components/ui/calendar";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * The shared `ui/calendar` sized for the wizard's schedule card rather than for a
 * popover: Monday-first, 40px cells filling the card's width, and the neighbouring
 * months' days shown greyed rather than as blanks.
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
  return (
    <Calendar
      mode="single"
      required
      selected={value}
      onSelect={onChange}
      defaultMonth={value}
      weekStartsOn={1}
      disabled={disabled ? true : minDate ? { before: startOfDay(minDate) } : undefined}
      formatters={{ formatWeekdayName: (date) => WEEKDAYS[date.getDay()] }}
      className="w-full bg-transparent p-0 [--cell-size:--spacing(10)]"
      classNames={{
        month_caption: "justify-center font-display text-sm font-semibold",
        weekday: "text-[11px] font-semibold text-muted-foreground/70",
      }}
    />
  );
}
