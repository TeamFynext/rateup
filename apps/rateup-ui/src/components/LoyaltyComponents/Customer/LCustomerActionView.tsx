import { IconCalendar } from "@tabler/icons-react";
import { useState } from "react";

import { DateRangePickerModal } from "@/components/DateAndTime/DatePicker/DateRangePicker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

const getButtonVariant = (variant?: string): "secondary" | "ghost" | "outline" => {
  if (variant === "light") return "secondary";
  if (variant === "subtle") return "ghost";
  return "outline";
};

export const CalenderIconDateRangePicker = ({
  ranges,
  setRange,
  label = "Filter by Date",
  variant = "outline",
}) => {
  const [opened, setOpened] = useState(false);

  const open = () => setOpened(true);
  const close = () => setOpened(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={getButtonVariant(variant)}
              size="icon-sm"
              onClick={open}
              aria-label={label}
            />
          }
        >
          <IconCalendar className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
      <DateRangePickerModal
        opened={opened}
        ranges={ranges}
        close={close}
        onChange={(r) => setRange(r ? [r["selection"]] : [])}
      />
    </>
  );
};
