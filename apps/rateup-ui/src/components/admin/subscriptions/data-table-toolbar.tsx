import { IconX } from "@tabler/icons-react";
import type { ReactTable, RowData } from "@tanstack/react-table";

import type { DataTableFeatures } from "@/components/Table/data-table-features.ts";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";

interface DataTableToolbarProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>;
}

export function DataTableToolbar<TData extends RowData>({
  table,
}: Readonly<DataTableToolbarProps<TData>>) {
  const isFiltered = table.state.columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Search by organization name..."
          value={(table.getColumn("orgName")?.getFilterValue() as string) ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            table.getColumn("orgName")?.setFilterValue(value);
          }}
          className="h-8 w-[150px] lg:w-[300px]"
        />
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={() => table.resetColumnFilters()}>
            Reset
            <IconX />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
