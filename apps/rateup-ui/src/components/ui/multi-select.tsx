import * as React from "react";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox.tsx";

export interface MultiSelectOption {
  label: React.ReactNode;
  value: string;
}

export interface MultiSelectProps {
  /** Id applied to the text input, so a `FieldLabel htmlFor` can target it. */
  id?: string;
  /** Options rendered in the popup and used to resolve chip labels. */
  options: MultiSelectOption[];
  /** Selected values (controlled). */
  value: string[];
  /** Called with the new selected values. */
  onValueChange: (value: string[]) => void;
  /** Placeholder shown in the input when empty. */
  placeholder?: string;
  disabled?: boolean;
  /** Applied to the visible chips box. */
  className?: string;
  /** Shown when no options match the search. */
  emptyIndicator?: React.ReactNode;
}

export function MultiSelect({
  id,
  options,
  value = [],
  onValueChange,
  placeholder,
  disabled,
  className,
  emptyIndicator = "No results found.",
}: Readonly<MultiSelectProps>) {
  return (
    <Combobox
      items={options}
      multiple
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <ComboboxChips className={className}>
        <ComboboxValue>
          {value.map((v) => (
            <ComboboxChip key={v}>{options.find((o) => o.value === v)?.label ?? v}</ComboboxChip>
          ))}
        </ComboboxValue>
        <ComboboxChipsInput id={id} placeholder={placeholder} />
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxEmpty>{emptyIndicator}</ComboboxEmpty>
        <ComboboxList>
          {(item: MultiSelectOption) => (
            <ComboboxItem key={item.value} value={item.value}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
