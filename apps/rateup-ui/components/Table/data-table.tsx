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
  TableBodySkeleton,
  TableHeadSkeleton,
} from "../animation/skeleton/Table.Skeleton";
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

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  DataTableToolbar?: (
    props: DataTableToolbarProps<TData, TValue>,
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
  isPending?: boolean;
  defaultColumnVisibility?: VisibilityState;
}

interface DataTableToolbarProps<TData, TValue> {
  table: ReturnType<typeof useReactTable<TData>>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  DataTableToolbar,
  onRowClick,
  isPending,
  manualPagination = undefined,
  defaultColumnVisibility = {},
}: Readonly<DataTableProps<TData, TValue>>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultColumnVisibility);
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
      sorting,
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
      columnVisibility: defaultColumnVisibility,
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
    getRowId: (row: any) => row.id,
  });

  const rows = table.getRowModel().rows;

  let tableBodyContent: React.ReactNode;
  if (isPending) {
    tableBodyContent = <TableBodySkeleton />;
  } else if (rows.length) {
    tableBodyContent = rows.map((row) => (
      <TableRow
        key={row.id}
        data-state={row.getIsSelected() && "selected"}
        onClick={() => onRowClick?.(row.original)}
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ));
  } else {
    tableBodyContent = (
      <TableRow className="h-full">
        <TableCell
          colSpan={columns.length}
          className="h-full text-center align-middle"
        >
          No results.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {DataTableToolbar && <DataTableToolbar table={table} />}
      <div className="flex-1 min-h-0 **:data-[slot=table-container]:h-full border bg-card rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            {isPending ? (
              <TableHeadSkeleton />
            ) : (
              table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="sticky top-0 bg-background z-10"
                >
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
              ))
            )}
          </TableHeader>
          <TableBody>{tableBodyContent}</TableBody>
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
