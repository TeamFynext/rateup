import { IconCalendar, IconChevronDown } from "@tabler/icons-react";
import dayjs from "dayjs";
import { Activity, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import type { AnalyticsDateRange } from "@/types/api.ts";
import { formatDate } from "@/utils/dateTime.ts";

import { presetRange } from "./dateRangePresets.ts";

const DateRangeSelector = ({
  value,
  onChange,
}: {
  value: AnalyticsDateRange;
  onChange: (range: AnalyticsDateRange) => void;
}) => {
  const { t } = useTranslation();
  const data = [
    { label: t("Today"), key: "today" },
    { label: t("Yesterday"), key: "yesterday" },
    { label: t("Last 7 Days"), key: "last7days" },
    { label: t("Last 30 Days"), key: "last30days" },
    { label: t("Custom Range"), key: "custom-range" },
  ];
  // What is being picked in the calendar. It is held here until both ends exist:
  // handing a one-ended range up would fire a request for it on every first click.
  const [draft, setDraft] = useState<DateRange | undefined>();

  function handleChange(key: string) {
    setDraft(undefined);
    onChange({ key, range: presetRange(key) });
  }

  function handleCalendarSelect(range: DateRange | undefined) {
    if (!range?.from || !range.to) {
      setDraft(range);
      return;
    }
    setDraft(undefined);
    onChange({
      key: "custom-range",
      // Whole days: the calendar gives midnight for both ends, which would leave the
      // last day picked out of the range entirely.
      range: [dayjs(range.from).startOf("day").toDate(), dayjs(range.to).endOf("day").toDate()],
    });
  }
  return (
    <div className="flex gap-1 items-center">
      <Select
        value={value.key}
        onValueChange={(value) => handleChange(value ?? "")}
        items={data.map((date) => ({ value: date.key, label: date.label }))}
      >
        <SelectTrigger className="*:data-[slot=select-value]:text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {data.map((date) => (
            <SelectItem key={date.key} value={date.key}>
              {date.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Activity mode={value.key === "custom-range" ? "visible" : "hidden"}>
        <Popover>
          <PopoverTrigger render={<Button id="date-picker" variant="outline" className="group" />}>
            <IconCalendar className="size-3.5" />
            <span className="group-hover:text-blue-600 text-xs">
              {formatDate(value.range[0])} - {formatDate(value.range[1])}
            </span>
            <IconChevronDown />
          </PopoverTrigger>
          <PopoverContent align="start" side="bottom" className="w-full">
            <Calendar
              mode="range"
              defaultMonth={value.range[0]}
              selected={draft ?? { from: value.range[0], to: value.range[1] }}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              className="rounded-lg border shadow-sm"
            />
          </PopoverContent>
        </Popover>
      </Activity>
    </div>
  );
};

export default DateRangeSelector;

/** The drill-down pages' range: a number of days back from today. */
export function DateSelector({ days, setDays }: { days: number; setDays: (days: number) => void }) {
  const { t } = useTranslation();
  const options = [
    { value: "1", label: t("Today") },
    { value: "7", label: t("Last 7 Days") },
    { value: "14", label: t("Last 14 Days") },
    { value: "30", label: t("Last 30 Days") },
    { value: "60", label: t("Last 60 Days") },
  ];
  return (
    <Select
      value={String(days)}
      // Base UI clears with `null`; `Number(null)` is 0, which asks the server for an empty range.
      onValueChange={(value) => setDays(value === null ? days : Number(value))}
      items={options}
    >
      <SelectTrigger aria-label={t("Date range")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
