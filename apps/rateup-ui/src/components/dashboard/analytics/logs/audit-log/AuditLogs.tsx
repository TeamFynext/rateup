import type { PaginationState, SortingState } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useUserAuditLogs } from "@/backend/user/user.query";
import { DataTable } from "@/components/Table/data-table.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

import { AnalyticsCard } from "../../kit/AnalyticsCard.tsx";
import { useAuditColumns } from "./utils.tsx";

export function AuditLogs() {
  const { t } = useTranslation();
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useAuditColumns();

  const params = useMemo(() => ({ pagination, sorting }), [pagination, sorting]);
  const query = useUserAuditLogs(params);
  const rows = query.data?.data ?? [];

  return (
    <AnalyticsCard
      title={t("Team activity")}
      description={t("What your team created, changed or deleted, newest first")}
      query={query}
      isEmpty={rows.length === 0}
      emptyTitle={t("No activity yet")}
      emptyDescription={t("Actions your team takes will show up here.")}
      skeleton={<Skeleton className="h-96 w-full" />}
    >
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
    </AnalyticsCard>
  );
}
