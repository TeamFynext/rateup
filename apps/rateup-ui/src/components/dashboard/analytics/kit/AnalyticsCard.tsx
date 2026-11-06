import { IconAlertTriangle, IconChartBarOff, IconLoader2, IconRefresh } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils";

/** The slice of a react-query result every analytics surface reads its state from. */
export interface AnalyticsQueryState {
  isPending: boolean;
  isError: boolean;
  isPlaceholderData?: boolean;
  isRefetching?: boolean;
  refetch: () => unknown;
}

/** Several queries behind one surface: pending or failed if any is, stale if any is. */
export function combineQueries(...queries: AnalyticsQueryState[]): AnalyticsQueryState {
  return {
    isPending: queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
    isPlaceholderData: queries.some((query) => query.isPlaceholderData),
    isRefetching: queries.some((query) => query.isRefetching),
    refetch: () => queries.forEach((query) => query.refetch()),
  };
}

export function AnalyticsError({ query }: Readonly<{ query: AnalyticsQueryState }>) {
  const { t } = useTranslation();
  return (
    <Empty className="py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconAlertTriangle />
        </EmptyMedia>
        <EmptyTitle>{t("These numbers could not be loaded")}</EmptyTitle>
        <EmptyDescription>{t("Try again in a moment.")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isRefetching}
        >
          <IconRefresh className={cn(query.isRefetching && "animate-spin")} />
          {t("Retry")}
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function AnalyticsEmpty({
  title,
  description,
}: Readonly<{ title?: string; description?: string }>) {
  const { t } = useTranslation();
  return (
    <Empty className="py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconChartBarOff />
        </EmptyMedia>
        <EmptyTitle>{title ?? t("Nothing in this range")}</EmptyTitle>
        <EmptyDescription>
          {description ?? t("Try a longer date range or another team.")}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** Shown while a filter change is loading: the old numbers stay, dimmed, until the new ones land. */
export function UpdatingLabel() {
  const { t } = useTranslation();
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <IconLoader2 className="size-3.5 animate-spin" aria-hidden />
      {t("Updating")}
    </span>
  );
}

/**
 * Every chart, table and list in the section, so they share one set of states:
 * a skeleton on first load only, dimmed content while a new filter loads, and an
 * empty or error body that says what to do next.
 */
export function AnalyticsCard({
  title,
  description,
  actions,
  query,
  isEmpty = false,
  emptyTitle,
  emptyDescription,
  skeleton,
  className,
  contentClassName,
  children,
}: Readonly<{
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  query: AnalyticsQueryState;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Shaped like the final content, so nothing jumps when it arrives. */
  skeleton?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}>) {
  const isStale = Boolean(query.isPlaceholderData) && !query.isError;

  let body: ReactNode;
  if (query.isPending) body = skeleton ?? <Skeleton className="h-60 w-full" />;
  else if (query.isError) body = <AnalyticsError query={query} />;
  else if (isEmpty) body = <AnalyticsEmpty title={emptyTitle} description={emptyDescription} />;
  else body = children;

  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {(isStale || actions) && (
          <CardAction className="flex items-center gap-2">
            {isStale && <UpdatingLabel />}
            {actions}
          </CardAction>
        )}
      </CardHeader>
      <CardContent
        className={cn("min-w-0 transition-opacity", isStale && "opacity-60", contentClassName)}
        aria-busy={isStale}
      >
        {body}
      </CardContent>
    </Card>
  );
}
