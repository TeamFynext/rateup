import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** At or past this share of the allowance the bar turns from navy to amber. */
const WARN_AT = 0.8;

function share(used: number, max: number | null | undefined) {
  return max ? Math.min(used / max, 1) : 0;
}

function barTone(used: number, max: number | null | undefined) {
  if (!max) return "bg-primary";
  if (used >= max) return "bg-negative";
  if (used / max >= WARN_AT) return "bg-chart-5";
  return "bg-primary";
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
    <div className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        {exceeded && (
          <span className="rounded-md bg-negative/10 px-2 py-0.5 text-xs font-medium text-negative">
            Limit reached
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl leading-none font-semibold tabular">{formatNumber(used)}</span>
        <span className="text-sm text-muted-foreground tabular">
          {metered && max !== undefined ? `of ${formatNumber(max)}` : "no limit"}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
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
