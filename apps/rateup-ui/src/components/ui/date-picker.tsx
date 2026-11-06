import * as React from "react";

import { Button } from "@/components/ui/button.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";

/** Every existing caller picks a date in the past (export ranges, activity logs), so the
 *  past-only window stays the default; a forward-looking picker passes its own `disabled`/`endMonth`. */
const isFutureDate = (date: Date) => date > new Date();

export function DatePicker({
  value,
  onChange,
  className,
  id = "date",
  placeholder = "Select date",
  disabled = isFutureDate,
  startMonth,
  endMonth,
  invalid,
}: Readonly<{
  value?: Date;
  /** `undefined` when the user clears the selection. */
  onChange?: (date: Date | undefined) => void;
  className?: string;
  /** Give this a unique value when more than one picker shares a page, so labels stay bound. */
  id?: string;
  placeholder?: string;
  /** Which days are unselectable. Defaults to disallowing the future. */
  disabled?: React.ComponentProps<typeof Calendar>["disabled"];
  startMonth?: Date;
  endMonth?: Date;
  invalid?: boolean;
}>) {
  const [open, setOpen] = React.useState(false);
  // Only the default past-only window implies a hard `endMonth`; a caller that overrides
  // `disabled` gets an unbounded month dropdown unless it bounds one itself.
  const resolvedEndMonth = endMonth ?? (disabled === isFutureDate ? new Date() : undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            id={id}
            aria-invalid={invalid}
            className={`justify-start font-normal ${className}`}
          />
        }
      >
        {value ? value.toLocaleDateString() : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          captionLayout="dropdown"
          disabled={disabled}
          startMonth={startMonth}
          endMonth={resolvedEndMonth}
          onSelect={(date) => {
            if (onChange) {
              onChange(date);
            }
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
