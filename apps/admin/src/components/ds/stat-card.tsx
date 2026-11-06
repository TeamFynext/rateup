import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatTone = "peach" | "mint" | "sky" | "slate" | "brand";

/** A tinted strip down the tile's left edge; the tile itself stays a plain card. */
const TONES: Record<StatTone, { card: string; accent: string; sub: string }> = {
  peach: { card: "bg-card", accent: "bg-tone-peach-accent", sub: "text-muted-foreground" },
  mint: { card: "bg-card", accent: "bg-tone-mint-accent", sub: "text-muted-foreground" },
  sky: { card: "bg-card", accent: "bg-tone-sky-accent", sub: "text-muted-foreground" },
  slate: { card: "bg-card", accent: "bg-tone-slate-accent/40", sub: "text-muted-foreground" },
  brand: {
    card: "bg-primary text-primary-foreground ring-0",
    accent: "bg-primary-foreground/40",
    sub: "text-primary-foreground/70",
  },
};

interface StatCardProps {
  value: ReactNode;
  label: ReactNode;
  /** The small line under the figure, e.g. "10% increase from last week". */
  sub?: ReactNode;
  tone?: StatTone;
  trend?: "up" | "down";
  /** Shown top-right in place of the trend arrow. */
  badge?: ReactNode;
  className?: string;
}

/** The KPI tile, after rateup-ui's `StatTile`: uppercase label, large figure, muted line. */
export function StatCard({
  value,
  label,
  sub,
  tone = "slate",
  trend,
  badge,
  className,
}: StatCardProps) {
  const styles = TONES[tone];
  const Arrow = trend === "down" ? IconArrowDownRight : IconArrowUpRight;

  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-xl py-4 pr-4 pl-5 shadow-xs ring-1 ring-foreground/10",
        styles.card,
        className,
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", styles.accent)} />
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "truncate text-xs font-medium tracking-wide uppercase",
            tone === "brand" ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {label}
        </div>
        {badge ?? (trend && <Arrow className={cn("size-4 shrink-0", styles.sub)} stroke={1.75} />)}
      </div>
      <div className="text-2xl leading-none font-semibold tabular">{value}</div>
      {sub && <div className={cn("text-xs", styles.sub)}>{sub}</div>}
    </div>
  );
}
