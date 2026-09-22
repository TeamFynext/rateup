import { IconAlertTriangle, IconMoodEmpty } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";

/** A failed load, with the API's message and a retry. */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      <IconAlertTriangle className="size-6 text-negative" stroke={1.5} />
      <div className="space-y-1">
        <p className="text-sm font-medium">Couldn't load this</p>
        <p className="text-xs text-muted-foreground">{getApiErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" className="rounded-xl" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      <IconMoodEmpty className="size-6 text-muted-foreground" stroke={1.5} />
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Placeholder rows shaped like the list they stand in for. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}
