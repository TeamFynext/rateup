import { cn } from "@/lib/utils";

export interface BlockDatum {
  label: string;
  value: number;
  /** Shown on the top block; defaults to a compact form of `value`. */
  display?: string;
  /** Striped top block, for a period still in progress. */
  partial?: boolean;
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/**
 * The reference's stacked-tile bar chart: each column is a pile of rounded outlined tiles,
 * capped by an ink tile carrying the value. Heights are relative to the largest value.
 */
export function BlockChart({
  data,
  maxBlocks = 5,
  className,
}: {
  data: BlockDatum[];
  maxBlocks?: number;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div
        className="grid min-w-120 gap-x-2"
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
      >
        {data.map((d) => (
          <div key={d.label} className="text-center text-[11px] text-muted-foreground">
            {d.label}
          </div>
        ))}
        {data.map((d) => {
          const blocks = Math.max(1, Math.round((d.value / max) * maxBlocks));
          return (
            <div
              key={d.label}
              className="mt-6 flex flex-col-reverse items-center gap-1.5"
              style={{ minHeight: `${maxBlocks * 2.75}rem` }}
              title={`${d.label}: ${d.value.toLocaleString()}`}
            >
              {Array.from({ length: blocks }, (_, index) => {
                const isTop = index === blocks - 1;
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex h-10 w-full max-w-12 items-center justify-center rounded-xl border-[1.5px] text-[13px] font-medium",
                      isTop && !d.partial && "border-primary bg-primary text-primary-foreground",
                      isTop &&
                        d.partial &&
                        "border-primary bg-[repeating-linear-gradient(135deg,var(--primary)_0_3px,transparent_3px_7px)]",
                      !isTop && "border-foreground/85 bg-background",
                    )}
                  >
                    {isTop && !d.partial && (d.display ?? compact.format(d.value).toLowerCase())}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
