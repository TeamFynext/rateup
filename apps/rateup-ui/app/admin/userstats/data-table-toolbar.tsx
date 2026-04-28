"use client";

import { Table } from "@tanstack/react-table";

import { DataTableViewOptions } from "@/components/Table/data-table-view-option";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: Readonly<DataTableToolbarProps<TData>>) {
  return (
    <div className="flex items-center justify-end mb-2">
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
