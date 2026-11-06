import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

import type { MetricTile } from "./metricTiles.ts";

const DELTA_TONE: Record<MetricTile["deltaTone"], string> = {
  good: "text-green-700 dark:text-green-500",
  bad: "text-destructive",
  warning: "text-amber-700 dark:text-amber-500",
  neutral: "text-muted-foreground",
};

export function MetricTiles({
  tiles,
  isLoading,
}: Readonly<{ tiles: MetricTile[]; isLoading: boolean }>) {
  if (isLoading && tiles.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.id} className="border-border">
          <CardContent className="flex flex-col gap-1 p-4">
            <p className="text-xs text-muted-foreground">{tile.label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold tabular-nums text-foreground">{tile.value}</p>
              {tile.delta && (
                <span
                  className={cn("text-xs font-medium tabular-nums", DELTA_TONE[tile.deltaTone])}
                >
                  {tile.delta}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{tile.note}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
