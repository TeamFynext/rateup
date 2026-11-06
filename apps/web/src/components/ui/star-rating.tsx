import { IconStar } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

const SIZE = {
  xs: "size-3",
  sm: "size-3.5",
  default: "size-4",
  lg: "size-5",
} as const;

export interface StarRatingProps {
  /** Rating to display; fractional values fill partial stars. */
  value?: number;
  count?: number;
  size?: keyof typeof SIZE;
  className?: string;
}

/**
 * Read-only star rating. Replaces the former Mantine `Rating` in display mode —
 * for a rating *input*, build one on `RadioGroup` instead.
 */
export function StarRating({
  value = 0,
  count = 5,
  size = "default",
  className,
}: Readonly<StarRatingProps>) {
  const clamped = Math.max(0, Math.min(count, value));
  const starClass = SIZE[size];

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${clamped} out of ${count} stars`}
    >
      {Array.from({ length: count }).map((_, i) => {
        // Portion of this star that should read as filled, 0–1.
        const fill = Math.max(0, Math.min(1, clamped - i));
        return (
          <span key={i} className={cn("relative inline-block", starClass)}>
            <IconStar className={cn(starClass, "absolute inset-0 text-muted-foreground/40")} />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={fill < 1 ? { width: `${fill * 100}%` } : undefined}
              >
                <IconStar
                  className={cn(starClass, "fill-amber-400 text-amber-400 dark:fill-amber-500")}
                />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
