import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  Combobox,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox.tsx";

interface ChipOption {
  id: string;
  name?: string | null;
  color?: string | null;
}

/**
 * The "+ Add" control for tags, labels and groups: a searchable list of what is
 * not applied yet. A pick adds it and the list stays open for the next one; removing is the
 * chip's own ×, so there are no checkboxes to read.
 */
export default function ChipAddPicker<T extends ChipOption>({
  options,
  activeIds,
  onAdd,
  placeholder,
  emptyText,
  marker,
  className,
  disabled,
  label,
}: Readonly<{
  options: T[];
  activeIds: string[];
  onAdd: (id: string) => void;
  placeholder: string;
  /** Shown when none exist yet. */
  emptyText: string;
  /** The colour dot or icon before each name. */
  marker: (option: T) => ReactNode;
  className: string;
  disabled?: boolean;
  /** Trigger text; "Add" by default. */
  label?: string;
}>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const available = options
    .filter((o) => !activeIds.includes(o.id))
    .map((o) => ({ ...o, label: o.name ?? "" }));

  // Everything is already applied: there is nothing to add, so no chip.
  if (options.length > 0 && available.length === 0) return null;

  return (
    <Combobox<T & { label: string }>
      items={available}
      value={null}
      onValueChange={(option) => option && onAdd(option.id)}
      open={open}
      onOpenChange={(next, details) => {
        if (!next && details.reason === "item-press") return;
        setOpen(next);
      }}
      autoHighlight
      disabled={disabled}
    >
      <ComboboxPrimitive.Trigger className={className}>
        <IconPlus className="size-3" />
        {label ?? t("Add")}
      </ComboboxPrimitive.Trigger>
      <ComboboxContent className="w-60 p-0" align="start">
        {available.length > 0 && (
          <ComboboxChipsInput
            placeholder={placeholder}
            className="h-9 w-full shrink-0 border-b border-border px-3 text-sm"
          />
        )}
        <ComboboxEmpty>{available.length ? t("No matches") : emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(option: T & { label: string }) => (
            <ComboboxItem key={option.id} value={option}>
              {marker(option)}
              <span className="truncate">{option.name}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
