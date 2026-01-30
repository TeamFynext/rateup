"use client";

import { useCallback, useMemo, useState } from "react";

import { PaginationState, SortingState } from "@tanstack/react-table";

import { useUserAuditLogs } from "@/backend/user/user.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { DataTable } from "@/components/Table/data-table";

import { DataTableToolbar } from "./data-table-toolbar";
import { columns, ErrorCard } from "./utils";

const AuditLogs = () => {
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
      manualPagination={{
        pagination,
        onPaginationChange: handlePaginationChange,
        rowCount: data?.pagination?.total || 0,
        sorting,
        onSortingChange: handleSortingChange,
      }}
    />
  );
};

export default AuditLogs;
