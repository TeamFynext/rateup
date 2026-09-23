import { IconAlertCircle, IconSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

export const TILE_GRID = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";

export function TileGridSkeleton() {
  return (
    <div className={TILE_GRID}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

export function ListLoadError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  const { t } = useTranslation();
  return (
    <Empty className="rounded-lg border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconAlertCircle />
        </EmptyMedia>
        <EmptyTitle>{t("Could not load this list")}</EmptyTitle>
        <EmptyDescription>{t("Check your connection and try again.")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onRetry}>
          {t("Try again")}
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function NoSearchMatches({ onClear }: Readonly<{ onClear: () => void }>) {
  const { t } = useTranslation();
  return (
    <Empty className="rounded-lg border border-dashed">
      <EmptyHeader>
        <EmptyTitle>{t("Nothing matches that search")}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onClear}>
          {t("Clear search")}
        </Button>
      </EmptyContent>
    </Empty>
  );
}

/** A detail page whose record is gone: deleted, or never this organisation's. */
export function RecordNotFound({
  title,
  description,
}: Readonly<{ title: string; description: string }>) {
  return (
    <Empty className="rounded-lg border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconSearch />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
