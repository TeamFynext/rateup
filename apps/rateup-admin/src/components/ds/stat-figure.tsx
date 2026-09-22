import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatFigureProps {
  value: ReactNode;
  label: ReactNode;
  /** A coloured dot before the label, tying the figure to a chart series. */
  dotClassName?: string;
  /** Colours the value and adds the arrow: the reference's "+24% ↗". */
  trend?: "up" | "down";
}

/** A light-weight figure over a small muted label, for the row under a chart. */
export function StatFigure({ value, label, dotClassName, trend }: StatFigureProps) {
  const Arrow = trend === "down" ? IconArrowDownRight : IconArrowUpRight;
  return (
    <div className="min-w-0">
      <div
        className={cn(
          "flex items-center gap-1.5 text-[22px] leading-none font-light tracking-tight tabular",
          trend === "up" && "text-positive",
          trend === "down" && "text-negative",
        )}
      >
        {value}
        {trend && <Arrow className="size-4" stroke={1.75} />}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        {dotClassName && <span className={cn("size-1.5 shrink-0 rounded-full", dotClassName)} />}
        <span className="truncate">{label}</span>
      </div>
    </div>
  );
}

export function StatFigureRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">{children}</div>;
}
