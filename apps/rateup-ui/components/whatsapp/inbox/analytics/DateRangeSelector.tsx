import { Activity } from "react";

import dayjs from "dayjs";
import { CalendarIcon, ChevronDown, Filter } from "lucide-react";
import { useExtracted } from "next-intl";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/utils/dateTime";

const DateRangeSelector = ({ value, onChange }) => {
  const data = [
    { label: "Today", key: "today" },
    { label: "Yesterday", key: "yesterday" },
    { label: "Last 7 Days", key: "last7days" },
    { label: "Last 30 days", key: "last30days" },
    { label: "Custom Range", key: "custom-range" },
  ];
  function handleChange(key) {
    let range = [];
    switch (key) {
      case "today":
        range = [dayjs().startOf("day").toDate(), new Date()];
        break;
      case "yesterday":
        range = [
          dayjs().subtract(1, "day").startOf("day").toDate(),
          dayjs().subtract(1, "day").endOf("day").toDate(),
        ];
        break;
      case "last7days":
        range = [dayjs().subtract(7, "day").toDate(), new Date()];
        break;
      case "last30days":
        range = [dayjs().subtract(30, "day").toDate(), new Date()];
        break;
      case "custom-range":
        range = [dayjs().subtract(60, "day").toDate(), new Date()];
        break;
    }
    onChange({ key, range });
  }
  return (
    <div className="flex gap-1 items-center">
      <Select value={value.key} onValueChange={handleChange}>
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
          <PopoverTrigger asChild>
            <Button id="date-picker" variant="outline" className="group">
              <CalendarIcon className="size-3.5" />
              <span className="group-hover:text-blue-600 text-xs">
                {formatDate(value.range[0])} - {formatDate(value.range[1])}
              </span>
              <ChevronDown />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" side="bottom" className="w-full">
            <Calendar
              mode="range"
              defaultMonth={value.range[0]}
              selected={{
                from: value.range[0],
                to: value.range[1],
              }}
              onSelect={(range) =>
                onChange({ key: "custom-range", range: [range.from, range.to] })
              }
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

export function DateSelector({ days, setDays }) {
  const t = useExtracted();
  return (
    <div className="flex items-center gap-1 flex-col sm:flex-row">
      <div className="flex items-center gap-1 ">
        <Filter className="w-4 h-4" />
        <span>{t("Filter by")}:</span>
      </div>
      <Select
        value={String(days)}
        onValueChange={(value) => setDays(Number(value))}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="1">{t("Today")}</SelectItem>
          <SelectItem value="7">{t("Last 7 Days")}</SelectItem>
          <SelectItem value="14">{t("Last 14 Days")}</SelectItem>
          <SelectItem value="30">{t("Last 30 Days")}</SelectItem>
          <SelectItem value="60">{t("Last 60 Days")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
