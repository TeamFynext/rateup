"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DatePicker({
  value,
  onChange,
}: Readonly<{ value?: any; onChange?: (date: Date) => void }>) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          id="date"
          className="justify-start font-normal"
        >
          {value ? value.toLocaleDateString() : "Select date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          captionLayout="dropdown"
          disabled={(date) => date > new Date()}
          endMonth={new Date()}
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
