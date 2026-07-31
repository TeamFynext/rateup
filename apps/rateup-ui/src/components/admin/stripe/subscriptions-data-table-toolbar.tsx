import { IconX } from "@tabler/icons-react";
import type { Table } from "@tanstack/react-table";

import { DataTableViewOptions } from "@/components/Table/data-table-view-option.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function SubscriptionsDataTableToolbar<TData>({
  table,
}: Readonly<DataTableToolbarProps<TData>>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Filter by product name or status..."
          value={(table.getColumn("productName")?.getFilterValue() as string) ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            table.getColumn("productName")?.setFilterValue(value);
          }}
          className="h-8 w-[150px] lg:w-[250px]"
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
