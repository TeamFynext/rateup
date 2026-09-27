import type { PaginationState, SortingState } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useAuditLogFeatures, useUserAuditLogs } from "@/backend/user/user.query";
import { DataTable } from "@/components/Table/data-table.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { AnalyticsDateRange } from "@/types/api.ts";

import { AnalyticsCard, AnalyticsEmpty } from "../../kit/AnalyticsCard.tsx";
import { featureLabel, useAuditColumns } from "./utils.tsx";

const ALL = "all";

export function AuditLogs({ dateRange }: Readonly<{ dateRange: AnalyticsDateRange }>) {
  const { t } = useTranslation();
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [userId, setUserId] = useState(ALL);
  const [feature, setFeature] = useState(ALL);
  const columns = useAuditColumns();
  const { data: members } = useTeamsMembersOfOrg();
  const { data: features = [] } = useAuditLogFeatures();

  // A new filter starts from its first page; page 4 of the old result may not exist.
  const [filterKey, setFilterKey] = useState("");
  const nextFilterKey = `${dateRange.key}|${dateRange.range.join()}|${userId}|${feature}`;
  if (nextFilterKey !== filterKey) {
    setFilterKey(nextFilterKey);
    if (pagination.pageIndex !== 0) setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

  const params = useMemo(
    () => ({
      pagination,
      sorting,
      filters: {
        from: dateRange.range[0],
        to: dateRange.range[1],
        userId: userId === ALL ? undefined : userId,
        feature: feature === ALL ? undefined : feature,
      },
    }),
    [pagination, sorting, dateRange, userId, feature],
  );
  const query = useUserAuditLogs(params);
  const rows = query.data?.data ?? [];
  const isFiltered = userId !== ALL || feature !== ALL;

  const userItems = [
    { value: ALL, label: t("Everyone") },
    ...[...(members?.data ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => ({ value: m.id, label: m.name })),
  ];
  const featureItems = [
    { value: ALL, label: t("All features") },
    ...features.map((f) => ({ value: f.key, label: featureLabel(f.key) })),
  ];

  return (
    <AnalyticsCard
      title={t("Team activity")}
      description={t("What your team created, changed or deleted, newest first")}
      query={query}
      isEmpty={false}
      skeleton={<Skeleton className="h-96 w-full" />}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={userId} onValueChange={(value) => setUserId(value ?? ALL)} items={userItems}>
          <SelectTrigger className="w-full sm:w-48" aria-label={t("User")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {userItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={feature}
          onValueChange={(value) => setFeature(value ?? ALL)}
          items={featureItems}
        >
          <SelectTrigger className="w-full sm:w-48" aria-label={t("Feature")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {featureItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <AnalyticsEmpty
          title={t("No activity found")}
          description={
            isFiltered
              ? t("Nothing matches these filters in this date range.")
              : t("Nothing your team did falls in this date range.")
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={rows}
            serverSide={{
              pagination,
              onPaginationChange: setPagination,
              rowCount: query.data?.pagination?.total ?? 0,
              sorting,
              onSortingChange: setSorting,
            }}
          />
        </div>
      )}
    </AnalyticsCard>
  );
}
