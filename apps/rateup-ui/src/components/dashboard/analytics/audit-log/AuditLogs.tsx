"use client";

import { useCallback, useMemo, useState } from "react";

import type { PaginationState, SortingState } from "@tanstack/react-table";

import { useUserAuditLogs } from "@/backend/user/user.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { DataTable } from "@/components/Table/data-table.tsx";

import { DataTableToolbar } from "./data-table-toolbar.tsx";
import { columns, ErrorCard } from "./utils.tsx";

export function AuditLogs() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const params = useMemo(
    () => ({ pagination, sorting }),
    [pagination, sorting],
  );
  const { data, isFetched, isLoading, isError, error } =
    useUserAuditLogs(params);

  const handlePaginationChange = useCallback((updater: any) => {
    setPagination(updater);
  }, []);

  const handleSortingChange = useCallback((updater: any) => {
    setSorting(updater);
  }, []);

  if (isError) {
    return (
      <ErrorCard
        message={
          error instanceof Error
            ? error.message
            : "An error occurred while loading audit logs."
        }
      />
    );
  }

  if (isLoading) {
    return <RateupLoader h="100dvh" />;
  }

  const tableData = isFetched ? data?.data || [] : [];

  return (
    <DataTable
      columns={columns}
      data={tableData}
      DataTableToolbar={DataTableToolbar}
      serverSide={{
        pagination,
        onPaginationChange: handlePaginationChange,
        rowCount: data?.pagination?.total || 0,
        sorting,
        onSortingChange: handleSortingChange,
      }}
    />
  );
}
