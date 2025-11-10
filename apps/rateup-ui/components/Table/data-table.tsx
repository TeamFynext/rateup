"use client";

import * as React from "react";

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTablePagination } from "./data-table-pagination";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  DataTableToolbar?: (
    props: DataTableToolbarProps<TData>,
  ) => React.ReactElement;
  onRowClick?: (row: TData) => void;
  manualPagination?: {
    pagination: PaginationState;
    onPaginationChange: (
      updater: React.SetStateAction<PaginationState>,
    ) => void;
    rowCount: number;
    sorting?: SortingState;
    onSortingChange?: (updater: React.SetStateAction<SortingState>) => void;
  };
}

interface DataTableToolbarProps<TData> {
  table: ReturnType<typeof useReactTable<TData>>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  DataTableToolbar,
  onRowClick,
  manualPagination = undefined,
}: Readonly<DataTableProps<TData, TValue>>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const isManualPagination = manualPagination !== undefined;
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      ...(isManualPagination
        ? {
            pagination: manualPagination.pagination,
            sorting: manualPagination.sorting,
          }
        : undefined),
    },
    ...(isManualPagination
      ? { rowCount: manualPagination?.rowCount }
      : undefined),
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
    enableRowSelection: true,
    manualPagination: isManualPagination,
    manualSorting: isManualPagination,
    ...(isManualPagination
      ? {
          onPaginationChange: manualPagination.onPaginationChange,
          onSortingChange: manualPagination.onSortingChange,
        }
      : {}),
    onRowSelectionChange: setRowSelection,
    // onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="flex flex-col gap-4">
      {DataTableToolbar && <DataTableToolbar table={table} />}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}

export const createSortableHeader = (title: string) => {
  return ({ column }: { column: any }) => {
    return <DataTableColumnHeader column={column} title={title} />;
  };
};
