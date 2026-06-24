import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import { TableBodySkeleton, TableHeadSkeleton } from "../animation/skeleton/Table.Skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table.tsx";
import { DataTableColumnHeader } from "./data-table-column-header.tsx";
import { DataTablePagination } from "./data-table-pagination.tsx";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  DataTableToolbar?: (props: DataTableToolbarProps<TData, TValue>) => React.ReactElement;
  onRowClick?: (row: TData) => void;
  serverSide?: {
    pagination: PaginationState;
    onPaginationChange: (updater: React.SetStateAction<PaginationState>) => void;
    rowCount: number;
    sorting?: SortingState;
    onSortingChange?: (updater: React.SetStateAction<SortingState>) => void;
    columnFilters?: ColumnFiltersState;
    onColumnFiltersChange?: (updater: React.SetStateAction<ColumnFiltersState>) => void;
  };
  isPending?: boolean;
  defaultColumnVisibility?: VisibilityState;
}

interface DataTableToolbarProps<TData, _TValue> {
  table: ReturnType<typeof useReactTable<TData>>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  DataTableToolbar,
  onRowClick,
  isPending,
  serverSide = undefined,
  defaultColumnVisibility = {},
}: Readonly<DataTableProps<TData, TValue>>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultColumnVisibility);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const isServerSide = serverSide !== undefined;

  const table = useReactTable({
    data,
    columns,
    state: {
      columnVisibility,
      sorting,
      rowSelection,
      globalFilter,
      ...(serverSide?.pagination ? { pagination: serverSide.pagination } : {}),
      ...(serverSide?.sorting ? { sorting: serverSide.sorting } : { sorting }),
      ...(serverSide?.columnFilters
        ? { columnFilters: serverSide.columnFilters }
        : { columnFilters }),
    },
    ...(serverSide?.rowCount ? { rowCount: serverSide?.rowCount } : undefined),
    initialState: {
      pagination: {
        pageSize: 25,
      },
      columnVisibility: defaultColumnVisibility,
    },
    enableRowSelection: true,
    manualPagination: isServerSide,
    manualSorting: isServerSide,
    manualFiltering: isServerSide,
    ...(serverSide?.onPaginationChange
      ? {
          onPaginationChange: serverSide.onPaginationChange,
        }
      : {}),
    onRowSelectionChange: setRowSelection,
    onSortingChange: serverSide?.onSortingChange ? serverSide.onSortingChange : setSorting,
    onColumnFiltersChange: serverSide?.onColumnFiltersChange
      ? serverSide.onColumnFiltersChange
      : setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    ...(serverSide?.pagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    ...(serverSide?.sorting ? {} : { getSortedRowModel: getSortedRowModel() }),
    ...(serverSide?.columnFilters ? {} : { getFilteredRowModel: getFilteredRowModel() }),

    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row: any) => row.id,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();

      return Object.values(row.original).some((value) =>
        String(value).toLowerCase().includes(search),
      );
    },
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
        <TableCell colSpan={columns.length} className="h-full text-center align-middle">
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
                <TableRow key={headerGroup.id} className="sticky top-0 bg-background z-10">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
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
  const SortableHeader = ({ column }: { column: any }) => {
    return <DataTableColumnHeader column={column} title={title} />;
  };

  SortableHeader.displayName = `SortableHeader(${title})`;
  return SortableHeader;
};
