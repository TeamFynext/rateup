import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DetailItem {
  label: string;
  value: ReactNode;
}

/**
 * Label over value, in a grid that goes one column on a phone and two or three wider up.
 * Empty values render as an em dash so the grid never collapses.
 */
export function DetailList({ items, className }: { items: DetailItem[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 truncate text-sm font-medium">
            {item.value === null || item.value === undefined || item.value === ""
              ? "—"
              : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
