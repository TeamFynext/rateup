import type { ReactNode } from "react";

import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils";

import { AnalyticsError, type AnalyticsQueryState, UpdatingLabel } from "./AnalyticsCard.tsx";

/** A labelled row of stat tiles fed by one query, with the same states as a card. */
export function TileGroup({
  title,
  aside,
  query,
  count,
  columns = 4,
  children,
}: Readonly<{
  title?: string;
  /** Beside the title: a scope note or a badge. */
  aside?: ReactNode;
  query: AnalyticsQueryState;
  /** How many tiles the skeleton draws. */
  count: number;
  /** Tiles per row on wide screens. */
  columns?: 3 | 4;
  children: ReactNode;
}>) {
  const isStale = Boolean(query.isPlaceholderData) && !query.isError;

  let body: ReactNode;
  if (query.isPending) {
    body = Array.from({ length: count }, (_, index) => (
      <Skeleton key={index} className="h-[104px] w-full rounded-xl" />
    ));
  } else if (query.isError) {
    body = (
      <Card className="col-span-full">
        <AnalyticsError query={query} />
      </Card>
    );
  } else {
    body = children;
  }

  return (
    <section className="flex flex-col gap-3">
      {(title || aside || isStale) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {title && <h2 className="font-display text-[15px] font-bold tracking-tight">{title}</h2>}
          {aside}
          {isStale && <UpdatingLabel />}
        </div>
      )}
      <div
        className={cn(
          "grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2",
          columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4",
          isStale && "opacity-60",
        )}
        aria-busy={isStale}
      >
        {body}
      </div>
    </section>
  );
}
