"use client";

import { useCallback, useMemo, useState } from "react";

import { PaginationState, SortingState } from "@tanstack/react-table";
import { Shield } from "lucide-react";
import { useTranslations } from "next-intl";

import { useUserAuditLogs } from "@/backend/user/user.query";
import RefreshButton from "@/components/Button/RefreshButton";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { DataTable } from "@/components/Table/data-table";

import { DataTableToolbar } from "./data-table-toolbar";
import { columns, ErrorCard } from "./utils";

const AuditLogs = () => {
  const translations = useTranslations();
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
    <div className="container mx-auto space-y-4">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">
                {translations("AuditLogs")}
              </h1>
            </div>
            <RefreshButton queryKeys={["userAuditLogs"]} />
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default AuditLogs;
