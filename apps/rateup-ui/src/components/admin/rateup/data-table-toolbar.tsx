import { IconPlus, IconX } from "@tabler/icons-react";
import type { ReactTable, RowData } from "@tanstack/react-table";

import type { DataTableFeatures } from "@/components/Table/data-table-features.ts";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";

interface DataTableToolbarProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>;
  onCreatePlan: () => void;
}

export function DataTableToolbar<TData extends RowData>({
  table,
  onCreatePlan,
}: Readonly<DataTableToolbarProps<TData>>) {
  const isFiltered = table.state.columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Filter by plan name..."
          value={(table.getColumn("displayName")?.getFilterValue() as string) ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            table.getColumn("displayName")?.setFilterValue(value);
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
        <Button onClick={onCreatePlan} size="sm">
          <IconPlus className="h-4 w-4 mr-2" />
          Create Plan
        </Button>
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
