import { IconSettings2 } from "@tabler/icons-react";
import type { Column, ReactTable, RowData } from "@tanstack/react-table";

import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

import type { DataTableFeatures } from "./data-table-features.ts";

export function DataTableViewOptions<TData extends RowData>({
  table,
}: Readonly<{
  table: ReactTable<DataTableFeatures, TData>;
}>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className="ml-auto hidden lg:flex" />}
      >
        <IconSettings2 />
        <span className="font-medium text-sm">View</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-37.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {table
            .getAllColumns()
            .filter((column) => column.accessorFn && column.getCanHide())
            .map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {getColumnLabel(column)}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getColumnLabel<TData extends RowData, TValue>(
  column: Column<DataTableFeatures, TData, TValue>,
) {
  const header = column.columnDef.header;

  if (typeof header === "string") {
    return header;
  } else if (typeof column.columnDef.header === "function") {
    try {
      // `createSortableHeader` needs the header context; the catch below covers it.
      const result = (column.columnDef.header as (context: unknown) => unknown)({});
      if (typeof result === "string") return result;
    } catch {
      // header requires column context (e.g. createSortableHeader)
    }
  }

  return column.columnDef.meta?.title ?? column.id;
}
