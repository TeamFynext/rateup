import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatTone = "peach" | "mint" | "sky" | "slate" | "ink";

const TONES: Record<StatTone, { card: string; arrow: string; sub: string }> = {
  peach: { card: "bg-tone-peach", arrow: "text-tone-peach-accent", sub: "text-foreground/45" },
  mint: { card: "bg-tone-mint", arrow: "text-tone-mint-accent", sub: "text-foreground/45" },
  sky: { card: "bg-tone-sky", arrow: "text-tone-sky-accent", sub: "text-foreground/45" },
  slate: { card: "bg-tone-slate", arrow: "text-tone-slate-accent", sub: "text-foreground/45" },
  ink: {
    card: "bg-primary text-primary-foreground",
    arrow: "text-primary-foreground",
    sub: "text-primary-foreground/60",
  },
};

interface StatCardProps {
  value: ReactNode;
  label: ReactNode;
  /** The small line under the label, e.g. "10% increase from last week". */
  sub?: ReactNode;
  tone?: StatTone;
  trend?: "up" | "down";
  /** A round badge hanging off the top-right corner, as on the reference's featured card. */
  badge?: ReactNode;
  className?: string;
}

/** The pastel KPI tile: a large figure, a bold label, a muted comparison line. */
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
        "relative flex min-h-[134px] flex-col items-center justify-center rounded-3xl px-5 py-6 text-center",
        styles.card,
        className,
      )}
    >
      {trend && !badge && (
        <Arrow className={cn("absolute top-4 right-4 size-4", styles.arrow)} stroke={1.75} />
      )}
      {badge && (
        <span className="absolute -top-2.5 -right-2.5 flex size-10 items-center justify-center rounded-full border-[5px] border-background bg-background text-foreground ring-1 ring-foreground">
          {badge}
        </span>
      )}
      <div className="text-[34px] leading-none font-medium tracking-tight tabular">{value}</div>
      <div className="mt-3 text-[13px] font-semibold">{label}</div>
      {sub && <div className={cn("mt-1.5 text-xs", styles.sub)}>{sub}</div>}
    </div>
  );
}
