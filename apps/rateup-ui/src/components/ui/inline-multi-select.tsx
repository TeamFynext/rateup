import { IconCheck } from "@tabler/icons-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface InlineMultiSelectOption {
  label: React.ReactNode;
  value: string;
}

export interface InlineMultiSelectProps {
  /** Options rendered in the list and used to resolve chip labels. */
  options: InlineMultiSelectOption[];
  /** Selected values (controlled). */
  value: string[];
  /** Called with the new selected values. */
  onValueChange: (value: string[]) => void;
  /** Placeholder shown when nothing is selected. */
  placeholder?: string;
  disabled?: boolean;
  /** Applied to the outer wrapper. */
  className?: string;
  /** Shown when no options match the search. */
  emptyIndicator?: React.ReactNode;
}

/**
 * A multi-select that renders its option list inline (normal document flow)
 * instead of in a floating/portaled popup. Use this instead of `MultiSelect`
 * in layouts where the floating-positioned Combobox popup fails to render
 * (e.g. deeply nested scroll/clipping containers).
 */
export function InlineMultiSelect({
  options,
  value = [],
  onValueChange,
  placeholder,
  disabled,
  className,
  emptyIndicator = "No results found.",
}: Readonly<InlineMultiSelectProps>) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const toggleValue = (optionValue: string) => {
    if (disabled) return;
    onValueChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue],
    );
  };

  const filteredOptions = options.filter((option) =>
    String(option.label).toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 py-1.5 text-left text-sm shadow-xs transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 max-[480px]:min-h-11 max-[480px]:py-2 dark:bg-input/30"
      >
        {value.length > 0 ? (
          value.map((v) => (
            <span
              key={v}
              className="flex h-5.5 w-fit items-center justify-center rounded-sm bg-muted px-1.5 text-xs font-medium whitespace-nowrap text-foreground max-[480px]:h-6 max-[480px]:text-sm"
            >
              {options.find((o) => o.value === v)?.label ?? v}
            </span>
          ))
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </button>

      {open && (
        <div className="mt-1.5 flex flex-col gap-1.5 rounded-md border border-input bg-popover p-2 text-popover-foreground shadow-md">
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded border border-input bg-transparent px-2.5 py-1.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring max-[480px]:py-2"
          />
          <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto max-[480px]:max-h-[50vh]">
            {filteredOptions.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">{emptyIndicator}</p>
            ) : (
              filteredOptions.map((option) => {
                const checked = value.includes(option.value);
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => toggleValue(option.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground max-[480px]:py-2.5 max-[480px]:text-base",
                      checked && "bg-accent/50",
                    )}
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-input">
                      {checked && <IconCheck className="size-3" />}
                    </span>
                    {option.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
