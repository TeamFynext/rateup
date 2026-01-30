"use client";

import { Table } from "@tanstack/react-table";
import { Shield } from "lucide-react";
import { useTranslations } from "next-intl";

import RefreshButton from "@/components/Button/RefreshButton";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: Readonly<DataTableToolbarProps<TData>>) {
  const translations = useTranslations();
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-semibold tracking-tight">
                  {translations("Team Activity")}
                </h1>
              </div>
              <RefreshButton queryKeys={["userAuditLogs"]} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
