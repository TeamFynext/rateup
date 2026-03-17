import React from "react";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useExtracted } from "next-intl";
import timezones from "timezones-list";

import { cn } from "@/lib/utils";

import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const TimeZoneSelector = ({ value, onChange }) => {
  const [timezoneOpen, setTimezoneOpen] = React.useState(false);
  const t = useExtracted();
  return (
    <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={timezoneOpen}
          className="w-full justify-between"
        >
          {value
            ? timezones.find((tz) => tz?.tzCode === value)?.label
            : t("Select a timezone")}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={t("Search timezone...")} />
          <CommandList>
            <CommandEmpty>{t("No timezone found.")}</CommandEmpty>
            <CommandGroup>
              {timezones.map((tz) => (
                <CommandItem
                  key={tz?.tzCode}
                  value={tz?.label}
                  onSelect={() => {
                    onChange(tz?.tzCode);
                    setTimezoneOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === tz?.tzCode ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {tz?.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default TimeZoneSelector;
