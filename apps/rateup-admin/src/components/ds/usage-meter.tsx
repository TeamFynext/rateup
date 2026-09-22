import { formatCompact, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** At or past this share of the allowance the bar turns from ink to a warning. */
const WARN_AT = 0.8;

function share(used: number, max: number | null | undefined) {
  return max ? Math.min(used / max, 1) : 0;
}

function barTone(used: number, max: number | null | undefined) {
  if (!max) return "bg-primary";
  if (used >= max) return "bg-negative";
  if (used / max >= WARN_AT) return "bg-tone-peach-accent";
  return "bg-primary";
}

/** A thin track, for table cells: "1.2k / 5k" over the bar, with an optional unit after it. */
export function UsageBar({
  used,
  max,
  unit,
  className,
}: {
  used: number;
  max: number | null | undefined;
  unit?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-28 flex-col gap-1.5", className)}>
      <span className="text-xs tabular text-muted-foreground">
        <span className="font-medium text-foreground">{formatCompact(used)}</span>
        {max ? ` / ${formatCompact(max)}` : " · unlimited"}
        {unit ? ` ${unit}` : ""}
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", barTone(used, max))}
          style={{ width: `${max ? share(used, max) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

/** The large meter for the usage tab: figure, ceiling, and what is left. */
export function UsageMeter({
  label,
  used,
  max,
  metered,
  hint,
}: {
  label: string;
  used: number;
  max?: number;
  metered: boolean;
  hint?: string;
}) {
  const exceeded = metered && max !== undefined && used >= max;
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-3xl border p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold">{label}</p>
        {exceeded && (
          <span className="rounded-full bg-negative/10 px-2.5 py-0.5 text-xs font-medium text-negative">
            Limit reached
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[34px] leading-none font-medium tracking-tight tabular">
          {formatNumber(used)}
        </span>
        <span className="text-sm text-muted-foreground tabular">
          {metered && max !== undefined ? `of ${formatNumber(max)}` : "no limit"}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", barTone(used, metered ? max : null))}
          style={{ width: `${metered && max ? share(used, max) * 100 : 0}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {metered && max !== undefined
          ? `${formatNumber(Math.max(max - used, 0))} left`
          : "Not metered on this plan"}
        {hint ? ` · ${hint}` : ""}
      </p>
    </div>
  );
}
