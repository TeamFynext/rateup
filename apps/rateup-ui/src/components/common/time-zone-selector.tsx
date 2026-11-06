import { IconCheck } from "@tabler/icons-react";
import React from "react";
import { useTranslation } from "react-i18next";
import timezones from "timezones-list";

import { cn } from "@/lib/utils.ts";

import { Button } from "../ui/button.tsx";
import {
  Combobox,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "../ui/combobox.tsx";

interface TimezoneOption {
  label: string;
  tzCode: string;
}

const timezoneList: TimezoneOption[] = (() => {
  if (Array.isArray(timezones)) {
    return timezones;
  }

  const moduleWithDefault = timezones as { default?: unknown };
  if (Array.isArray(moduleWithDefault.default)) {
    return moduleWithDefault.default as TimezoneOption[];
  }

  return [];
})();

const TimeZoneSelector = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const [timezoneOpen, setTimezoneOpen] = React.useState(false);
  const { t } = useTranslation();

  const items = timezoneList.map((tz) => ({ value: tz.tzCode, label: tz.label }));

  return (
    <Combobox
      items={items}
      value={value ?? null}
      onValueChange={(tzCode: string | null) => {
        if (tzCode) onChange(tzCode);
        setTimezoneOpen(false);
      }}
      open={timezoneOpen}
      onOpenChange={setTimezoneOpen}
    >
      <ComboboxTrigger render={<Button variant="outline" className="w-full justify-between" />}>
        {value ? timezoneList.find((tz) => tz?.tzCode === value)?.label : t("Select a timezone")}
      </ComboboxTrigger>
      <ComboboxContent className="p-0" align="start">
        <ComboboxChipsInput
          placeholder={t("Search timezone...")}
          className="w-full border-0 border-b rounded-none px-3 h-9"
        />
        <ComboboxEmpty>{t("No timezone found.")}</ComboboxEmpty>
        <ComboboxList>
          {(item: { value: string; label: string }) => (
            <ComboboxItem key={item.value} value={item.value}>
              <IconCheck
                className={cn("mr-2 h-4 w-4", value === item.value ? "opacity-100" : "opacity-0")}
              />
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};

export default TimeZoneSelector;
