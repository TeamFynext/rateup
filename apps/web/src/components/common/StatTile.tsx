import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils";

/** A change against an earlier period, in percent. `goodWhen` says which direction is good news. */
export interface StatChange {
  value: number;
  goodWhen: "up" | "down";
  /** What the change is measured against, e.g. "vs previous period". */
  label: string;
  /** "%" for a relative change (the default); " pts" for a difference between two rates. */
  unit?: string;
}

function ChangeLine({ change }: Readonly<{ change: StatChange }>) {
  const rounded = Number(change.value.toFixed(1));
  if (rounded === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        0{change.unit ?? "%"} {change.label}
      </p>
    );
  }
  const isUp = rounded > 0;
  const isGood = isUp === (change.goodWhen === "up");
  const Arrow = isUp ? IconArrowUpRight : IconArrowDownRight;
  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium tabular-nums",
          isGood ? "text-green-700 dark:text-green-500" : "text-destructive",
        )}
      >
        <Arrow className="size-3.5" aria-hidden />
        {isUp ? "+" : ""}
        {rounded}
        {change.unit ?? "%"}
      </span>
      {change.label}
    </p>
  );
}

/**
 * A headline number with no plot.
 *
 * Several figures here are single values with no shape to them — a total is not a trend.
 * Drawing each as a one-bar chart would add ink without meaning, so they get the form that
 * fits. Values wear text tokens, never a series color; identity is the label. Only the
 * change line is colored, because it carries a judgement the number alone does not.
 */
export function StatTile({
  label,
  value,
  emptyValue,
  note,
  icon,
  badge,
  change,
}: Readonly<{
  label: string;
  /** Null when there is nothing to show; `emptyValue` then says why. */
  value: string | null;
  emptyValue?: string;
  note?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  change?: StatChange;
}>) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center justify-between gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{label}</span>
            {badge}
          </span>
          {icon}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-4">
        {value === null ? (
          // h-8 is the value line's height, so an empty tile lines up with its neighbours.
          <p className="flex h-8 items-center text-sm font-medium text-muted-foreground">
            {emptyValue ?? "—"}
          </p>
        ) : (
          <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        )}
        {change && <ChangeLine change={change} />}
        {note && <CardDescription className="text-xs">{note}</CardDescription>}
      </CardContent>
    </Card>
  );
}
