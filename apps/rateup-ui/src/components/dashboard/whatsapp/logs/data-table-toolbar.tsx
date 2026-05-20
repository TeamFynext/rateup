"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { Table } from "@tanstack/react-table";
import { RefreshCw, X } from "lucide-react";

import { DataTableViewOptions } from "@/components/Table/data-table-view-option.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: Readonly<DataTableToolbarProps<TData>>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const queryClient = useQueryClient();

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Filter by phone number"
          value={(table.getColumn("phone")?.getFilterValue() as string) ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            table.getColumn("phone")?.setFilterValue(value);
          }}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetColumnFilters()}
          >
            Reset
            <X />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => {
            queryClient.invalidateQueries({
              queryKey: ["waLogs"],
            });
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
