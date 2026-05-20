"use client";

import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";

import { DataTableViewOptions } from "@/components/Table/data-table-view-option.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: Readonly<DataTableToolbarProps<TData>>) {
  const globalFilter = table.getState().globalFilter as string;

  return (
    <div className="flex items-center justify-between mb-2">
      {/* LEFT: Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search name, email or org..."
          value={globalFilter ?? ""}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />

        {globalFilter && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setGlobalFilter("")}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* RIGHT: View Options */}
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
