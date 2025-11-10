"use client";

import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";

import { DataTableViewOptions } from "@/components/Table/data-table-view-option";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: Readonly<DataTableToolbarProps<TData>>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        {/* <Input
          placeholder="Filter by name or organization..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            table.getColumn("name")?.setFilterValue(value);
          }}
          className="h-8 w-[150px] lg:w-[250px]"
        /> */}
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
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
