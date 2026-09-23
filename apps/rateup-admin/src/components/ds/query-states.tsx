import { IconAlertTriangle, IconMoodEmpty } from "@tabler/icons-react";
import { useEffect, useState, type ReactNode } from "react";

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

/**
 * Whether to show a placeholder yet. A query answered from the cache, or from a local API,
 * comes back in a few dozen milliseconds, and a skeleton that appears and vanishes inside
 * that reads as a flicker — worse than showing nothing at all for a moment.
 */
export function useShowPlaceholder(delayMs = 160): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);
  return show;
}

/** Placeholder rows shaped like the list they stand in for. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  const show = useShowPlaceholder();
  if (!show) return <div className="h-16" />;
  return (
    <div className="flex flex-col gap-3 motion-safe:animate-in motion-safe:fade-in-0">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

/** Placeholder for a tab built of panels, so the shape does not change when it loads. */
export function PanelSkeleton({ panels = 2, className }: { panels?: number; className?: string }) {
  const show = useShowPlaceholder();
  if (!show) return <div className="h-48" />;
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 motion-safe:animate-in motion-safe:fade-in-0 xl:grid-cols-2",
        className,
      )}
    >
      {Array.from({ length: panels }, (_, index) => (
        <Skeleton key={index} className="h-64 w-full rounded-3xl" />
      ))}
    </div>
  );
}
