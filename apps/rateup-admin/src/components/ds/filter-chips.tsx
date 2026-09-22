import { cn } from "@/lib/utils";

export interface FilterChip<T extends string> {
  value: T;
  label: string;
}

/**
 * One-tap saved filters. On a phone they scroll sideways in one row rather than wrapping
 * into a block that pushes the results off screen.
 */
export function FilterChips<T extends string>({
  chips,
  value,
  onChange,
  className,
}: {
  chips: FilterChip<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0",
        className,
      )}
    >
      {chips.map((chip) => {
        const active = chip.value === value;
        return (
          <button
            key={chip.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(chip.value)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-4 text-[13px] font-medium whitespace-nowrap transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
