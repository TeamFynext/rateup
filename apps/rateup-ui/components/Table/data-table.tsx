"use client";

import * as React from "react";

import { ScrollArea, ScrollAreaAutosize } from "@mantine/core";
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
    columnFilters?: ColumnFiltersState;
    onColumnFiltersChange?: (
      updater: React.SetStateAction<ColumnFiltersState>,
    ) => void;
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
      columnVisibility,
      rowSelection,
      ...(manualPagination?.pagination
        ? { pagination: manualPagination.pagination }
        : {}),
      ...(manualPagination?.sorting
        ? { sorting: manualPagination.sorting }
        : { sorting }),
      ...(manualPagination?.columnFilters
        ? { columnFilters: manualPagination.columnFilters }
        : { columnFilters }),
    },
    ...(manualPagination?.rowCount
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
    manualFiltering: isManualPagination,
    ...(manualPagination?.onPaginationChange
      ? {
          onPaginationChange: manualPagination.onPaginationChange,
        }
      : {}),
    onRowSelectionChange: setRowSelection,
    onSortingChange: manualPagination?.onSortingChange
      ? manualPagination.onSortingChange
      : setSorting,
    onColumnFiltersChange: manualPagination?.onColumnFiltersChange
      ? manualPagination.onColumnFiltersChange
      : setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    ...(manualPagination?.pagination
      ? {}
      : { getPaginationRowModel: getPaginationRowModel() }),
    ...(manualPagination?.sorting
      ? {}
      : { getSortedRowModel: getSortedRowModel() }),
    ...(manualPagination?.columnFilters
      ? {}
      : { getFilteredRowModel: getFilteredRowModel() }),

    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="flex flex-col gap-4 h-full">
      {DataTableToolbar && <DataTableToolbar table={table} />}
      <div className="overflow-hidden rounded-md border h-full">
        <ScrollAreaAutosize mah={"100%"}>
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
        </ScrollAreaAutosize>
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
