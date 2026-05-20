"use client";

import type { Table } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";

import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option.tsx";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: Readonly<DataTableToolbarProps<TData>>) {
  const { t: translations } = useTranslation();
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-start justify-center">
                <div className="flex items-center gap-1">
                  <h4 className="text-xl tracking-tight">
                    {translations("Team Activity log")}
                  </h4>
                  <RefreshButton queryKeys={["userAuditLogs"]} />
                </div>
                <h6>
                  {translations("Recent actions performed by team members")}
                </h6>
              </div>
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
