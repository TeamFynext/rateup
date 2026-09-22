import { cn } from "@/lib/utils";

export interface Segment {
  label: string;
  value: number;
  /** Background class; defaults run ink → grey → pale, as in the reference. */
  className?: string;
}

const DEFAULT_FILLS = ["bg-primary", "bg-chart-2", "bg-muted"];

/** One thick rounded bar split into proportional segments. */
export function SegmentedBar({ segments, className }: { segments: Segment[]; className?: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  return (
    <div
      role="img"
      aria-label={segments
        .map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`)
        .join(", ")}
      className={cn("flex h-10 w-full overflow-hidden rounded-xl", className)}
    >
      {segments.map((segment, index) => (
        <div
          key={segment.label}
          className={cn(segment.className ?? DEFAULT_FILLS[index % DEFAULT_FILLS.length])}
          style={{ width: `${(segment.value / total) * 100}%` }}
        />
      ))}
    </div>
  );
}
