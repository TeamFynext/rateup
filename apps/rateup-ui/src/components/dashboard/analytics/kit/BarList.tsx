import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface BarListItem {
  key: string;
  label: ReactNode;
  /** A muted line under the label: a platform, a member count. */
  secondary?: ReactNode;
  value: number;
  /** How the value reads; defaults to the plain number. */
  display?: ReactNode;
  /** A dot before the label, for identities that already own a colour (a team's). */
  dotColor?: string | null;
}

/**
 * A ranked list with a bar under each row.
 *
 * Used where the labels are words or phone numbers, which a chart axis would
 * truncate. One hue for every bar: the label carries identity, the length carries size.
 */
export function BarList({
  items,
  className,
}: Readonly<{ items: BarListItem[]; className?: string }>) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className={cn("flex flex-col gap-4", className)}>
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              {item.dotColor && (
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.dotColor }}
                  aria-hidden
                />
              )}
              <span className="truncate font-medium text-foreground">{item.label}</span>
              {item.secondary && (
                <span className="truncate text-xs text-muted-foreground">{item.secondary}</span>
              )}
            </div>
            <span className="shrink-0 tabular-nums text-foreground">
              {item.display ?? item.value.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-chart-2"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
