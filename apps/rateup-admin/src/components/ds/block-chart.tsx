import { cn } from "@/lib/utils";

export interface BlockDatum {
  label: string;
  value: number;
  /** Shown above the bar; defaults to a compact form of `value`. */
  display?: string;
  /** Striped bar, for a period still in progress. */
  partial?: boolean;
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/**
 * A light column chart with the value over each bar. Heights are relative to the largest
 * value; a zero is a faint baseline stub, so a quiet period reads as a gap rather than data.
 */
export function BlockChart({
  data,
  height = 176,
  showValues = true,
  className,
}: {
  data: BlockDatum[];
  /** Plot height in px, excluding the labels. */
  height?: number;
  /** Dense series (e.g. 90 days) read better without a figure over every bar. */
  showValues?: boolean;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div
      className={cn(
        "grid w-full items-end",
        data.length > 40 ? "gap-x-px" : "gap-x-1.5",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
    >
      {data.map((d) => {
        const label = d.display ?? compact.format(d.value).toLowerCase();
        return (
          <div
            key={d.label}
            className="flex flex-col items-center justify-end gap-1.5"
            style={{ height }}
            title={`${d.label}: ${d.value.toLocaleString()}${d.partial ? " so far" : ""}`}
          >
            {showValues && d.value > 0 && (
              <span className="text-[11px] font-medium tabular text-muted-foreground">{label}</span>
            )}
            <div
              className={cn(
                "w-full max-w-10 rounded-t-md",
                d.value === 0 && "h-1 bg-border",
                d.value > 0 && !d.partial && "bg-chart-2",
                d.value > 0 &&
                  d.partial &&
                  "bg-[repeating-linear-gradient(135deg,var(--chart-2)_0_3px,transparent_3px_7px)] ring-1 ring-chart-2 ring-inset",
              )}
              style={d.value > 0 ? { height: `${Math.max(4, (d.value / max) * 85)}%` } : undefined}
            />
          </div>
        );
      })}
      {data.map((d, index) => (
        <div
          key={d.label}
          className="mt-2 text-center text-[11px] whitespace-nowrap text-muted-foreground"
          // Dense series label every few columns so the axis stays legible.
          style={{
            visibility:
              data.length > 16 && index % Math.ceil(data.length / 8) !== 0 ? "hidden" : undefined,
          }}
        >
          {d.label}
        </div>
      ))}
    </div>
  );
}
