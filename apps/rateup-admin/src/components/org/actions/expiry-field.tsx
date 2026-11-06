import dayjs from "dayjs";
import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** `YYYY-MM-DD` for a date input, in the viewer's own time zone. */
export const toDateInput = (value: string | Date) => dayjs(value).format("YYYY-MM-DD");

/** A picked day means "through that day": the end of it, as the ISO instant the API takes. */
export const endOfDayIso = (day: string) => dayjs(day).endOf("day").toISOString();

export const isFutureDay = (day: string) =>
  Boolean(day) && dayjs(day).endOf("day").isAfter(dayjs());

/** How the free tier says "never expires" (createFreePlanSubscription). */
const NO_END_YEARS = 100;

/**
 * An expiry date with the common answers one tap away. Extensions count from the later of
 * today and `from`, so extending an org that still has time left adds to it.
 */
export function ExpiryField({
  value,
  onChange,
  from,
  label = "Expires on",
}: {
  value: string;
  onChange: (day: string) => void;
  from?: string | null;
  label?: string;
}) {
  const id = useId();
  const base = from && dayjs(from).isAfter(dayjs()) ? dayjs(from) : dayjs();
  const presets = [
    { label: "+1 month", day: base.add(1, "month") },
    { label: "+3 months", day: base.add(3, "month") },
    { label: "+1 year", day: base.add(1, "year") },
    { label: "No end", day: dayjs().add(NO_END_YEARS, "year") },
  ];

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        value={value}
        min={toDateInput(dayjs().add(1, "day").toDate())}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg"
      />
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const day = toDateInput(preset.day.toDate());
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(day)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted",
                value === day &&
                  "border-foreground bg-foreground text-background hover:bg-foreground",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      {value && !isFutureDay(value) && (
        <p className="text-xs text-negative">Pick a day after today.</p>
      )}
    </div>
  );
}
