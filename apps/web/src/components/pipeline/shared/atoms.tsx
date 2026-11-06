import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { Lead, PipelineLabel } from "@/backend/pipeline/pipeline.types.ts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { SOURCE_META } from "../pipeline.constants.tsx";
import { sourceLabel } from "../pipeline.labels.ts";

/**
 * The stage's colour marker. Stage colours are picked per org and stored as hex,
 * so this is one of the few places an inline style is the right call — there is
 * no class to name a colour the user chose.
 */
export function StageDot({
  color,
  className,
}: Readonly<{ color: string | null; className?: string }>) {
  return (
    <span
      className={cn("bg-muted-foreground inline-block size-2 shrink-0 rounded-full", className)}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

/**
 * Fill bar under a stage header, sized to that stage's share of the busiest one.
 *
 * `color` paints it in an org-chosen stage hex; `fillClassName` paints it from
 * the palette instead. Pass one or the other — an explicit class is preferred
 * where the bar means the same thing on every column, since a per-stage hex then
 * only adds noise to a bar that is about volume, not about which stage it is.
 */
export function StageFill({
  percent,
  color,
  fillClassName,
  className,
}: Readonly<{
  percent: number;
  color?: string | null;
  fillClassName?: string;
  /** Overrides the track. The forecast draws a heavier bar than a stage column. */
  className?: string;
}>) {
  return (
    <div className={cn("bg-secondary mt-2.25 h-[3px] overflow-hidden rounded-full", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          fillClassName ?? "bg-primary",
        )}
        style={{ width: `${percent}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}

/** A pipeline label chip. Label colours are org-chosen hex, same as stages. */
export function LeadLabelChip({ label }: Readonly<{ label: PipelineLabel }>) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: `${label.color}1f`, color: label.color }}
    >
      {label.name}
    </span>
  );
}

export function SourceChip({ source }: Readonly<{ source: Lead["source"] }>) {
  const { t } = useTranslation();
  const meta = SOURCE_META[source];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", meta.className)}>
      <Icon className="size-3.5" />
      {sourceLabel(t, source)}
    </span>
  );
}

export function RottingBadge({ days }: Readonly<{ days: number }>) {
  const { t } = useTranslation();
  return (
    <Badge variant="destructive" className="gap-1 font-semibold">
      <IconAlertTriangle />
      {t("Idle {days}d", { days: days })}
    </Badge>
  );
}

/** Uppercase micro-label used above field values in the drawer and settings. */
export function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="text-muted-foreground text-[11.5px] font-semibold tracking-[0.05em] uppercase">
      {children}
    </div>
  );
}
