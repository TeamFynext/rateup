import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  useGetTeamApiOverview,
  useGetTemplateOverview,
} from "@/backend/apiAnalytics/apianalytics.query";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

import { AnalyticsCard } from "../kit/AnalyticsCard.tsx";
import { BarList } from "../kit/BarList.tsx";
import { type AnalyticsFilters, deliveryFilter } from "../kit/filters.ts";
import { formatCount, formatDuration, formatPercent, toNumber } from "../kit/format.ts";
import { DeliveryTiles } from "../sections/DeliveryTiles.tsx";
import { DeliveryTrendCard } from "../sections/DeliveryTrendCard.tsx";

dayjs.extend(relativeTime);

/** At or above this failure rate a template is flagged in the table. */
const FAILING_RATE = 20;

interface TemplateRow {
  id: string;
  name: string;
  category: string;
  sent: number;
  success: number | undefined;
  failure: number | undefined;
  deliverySeconds: number | undefined;
  lastUsed: string | null;
}

function useCategoryLabel() {
  const { t } = useTranslation();
  return useCallback(
    (category: string) => {
      const labels: Record<string, string> = {
        MARKETING: t("Marketing"),
        UTILITY: t("Utility"),
        AUTHENTICATION: t("Authentication"),
      };
      return labels[category.toUpperCase()] ?? category;
    },
    [t],
  );
}

function TemplatesCard({ filters }: Readonly<{ filters: AnalyticsFilters }>) {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const query = useGetTemplateOverview(deliveryFilter(filters));

  const rows = useMemo<TemplateRow[]>(
    () =>
      (query.data?.templatePerformance ?? []).map((template) => ({
        id: `${template.templateName}:${template.templateCategory}`,
        name: template.templateName,
        category: template.templateCategory,
        sent: toNumber(template.totalSent) ?? 0,
        success: toNumber(template.successPercentage) ?? undefined,
        failure: toNumber(template.failurePercentage) ?? undefined,
        deliverySeconds: toNumber(template.avgDeliveryTimeSeconds) ?? undefined,
        lastUsed: template.lastUsed ?? null,
      })),
    [query.data],
  );
  const categories = query.data?.categoryOverview?.byCategory ?? [];

  const columns = useMemo<ColumnDef<TemplateRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: createSortableHeader(t("Template")),
        cell: ({ row }) => (
          <div className="flex min-w-48 items-center gap-2">
            <span className="truncate font-medium">{row.original.name}</span>
            {(row.original.failure ?? 0) >= FAILING_RATE && (
              <Badge variant="destructive">{t("Failing")}</Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: t("Category"),
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-normal">
            {categoryLabel(row.original.category)}
          </Badge>
        ),
      },
      {
        accessorKey: "sent",
        header: createSortableHeader(t("Sent")),
        cell: ({ row }) => <span className="tabular-nums">{formatCount(row.original.sent)}</span>,
      },
      {
        accessorKey: "success",
        header: createSortableHeader(t("Delivered")),
        sortUndefined: "last",
        cell: ({ row }) => (
          <span className="tabular-nums">{formatPercent(row.original.success) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "failure",
        header: createSortableHeader(t("Failed")),
        sortUndefined: "last",
        cell: ({ row }) => (
          <span className="tabular-nums">{formatPercent(row.original.failure) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "deliverySeconds",
        header: createSortableHeader(t("Avg delivery")),
        sortUndefined: "last",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatDuration(row.original.deliverySeconds) ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "lastUsed",
        header: createSortableHeader(t("Last used")),
        cell: ({ row }) =>
          row.original.lastUsed ? (
            <span className="text-muted-foreground">{dayjs(row.original.lastUsed).fromNow()}</span>
          ) : (
            "—"
          ),
      },
    ],
    [t, categoryLabel],
  );

  return (
    <AnalyticsCard
      title={t("Templates")}
      description={t("Delivery for each WhatsApp template sent in this range")}
      query={query}
      isEmpty={rows.length === 0}
      emptyTitle={t("No templates sent in this range")}
      skeleton={<Skeleton className="h-96 w-full" />}
      contentClassName="flex flex-col gap-6"
    >
      {categories.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {categories.map((category) => (
            <div key={category.category} className="flex flex-col gap-1 rounded-lg border p-3">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {categoryLabel(category.category)}
              </span>
              <span className="text-xl font-semibold tabular-nums">
                {formatCount(category.count)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("{percent} of template messages", {
                  percent: formatPercent(category.percentage) ?? "0%",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <DataTable columns={columns} data={rows} />
      </div>
    </AnalyticsCard>
  );
}

function TeamDeliveryCard({ filters }: Readonly<{ filters: AnalyticsFilters }>) {
  const { t } = useTranslation();
  // Every team, whatever the team filter: this card is the comparison between them.
  const query = useGetTeamApiOverview({ ...deliveryFilter(filters), teamId: "all" });
  const teams = [...(query.data ?? [])].sort(
    (a, b) => (toNumber(b.totalSent) ?? 0) - (toNumber(a.totalSent) ?? 0),
  );

  return (
    <AnalyticsCard
      title={t("Teams")}
      description={t("Messages each team sent, and how many were delivered. Shows every team.")}
      query={query}
      isEmpty={teams.every((team) => !toNumber(team.totalSent))}
      emptyTitle={t("No team sent messages in this range")}
    >
      <BarList
        items={teams.map((team) => ({
          key: team.teamId,
          label: team.teamName,
          dotColor: team.teamColor && team.teamColor !== "null" ? team.teamColor : null,
          secondary: formatPercent(team.successPercentage)
            ? t("{percent} delivered", { percent: formatPercent(team.successPercentage) })
            : undefined,
          value: toNumber(team.totalSent) ?? 0,
        }))}
      />
    </AnalyticsCard>
  );
}

export function MessagesView({ filters }: Readonly<{ filters: AnalyticsFilters }>) {
  return (
    <div className="flex flex-col gap-6">
      <DeliveryTiles filters={filters} />
      <div className="grid gap-4 lg:grid-cols-3">
        <DeliveryTrendCard filters={filters} className="lg:col-span-2" />
        <TeamDeliveryCard filters={filters} />
      </div>
      <TemplatesCard filters={filters} />
    </div>
  );
}
