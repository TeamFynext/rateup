"use client";
"use no memo";

import React from "react";
import { useRouter } from "next/navigation";

import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconChevronUp,
  IconSelector,
} from "@tabler/icons-react";
import { flexRender, Header, Table as TableType } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { PAGE_SIZE } from "../../utils/constants";
import {
  TableBodySkeleton,
  TableHeadSkeleton,
} from "../animation/skeleton/Table.Skeleton";
import { DETAIL_BTN } from "../Contacts/utils/utils";
import { Button } from "../ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hovercard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Filter } from "./Filter/Filter";

type TableLayoutProps = {
  table: TableType<any>;
  enableFilter: boolean;
  filterVisibility: boolean;
  tempVisibleColumnArray: string[];
  enablePagination: boolean;
  detailBtn?: boolean;
  isPending?: boolean;
};

// Extend the Header to use the new ExtendedColumnMeta
type ExtendedHeader = Header<any, unknown> & {
  column: {
    columnDef: {
      meta: {
        filterComponent?: (
          setFilterValue: (value: any) => void,
        ) => React.ReactNode;
      };
    };
  };
};
const renderHeader = (header) => {
  const rendered = flexRender(
    header.column.columnDef.header,
    header.getContext(),
  );
  if (typeof rendered !== "string") {
    return (
      <span className="inline-block min-w-[200px] max-w-[200px] font-medium">
        {rendered}
      </span>
    );
  }
  if (rendered.length <= 50) {
    return (
      <span className="inline-block min-w-[200px] max-w-[200px] font-medium">
        {rendered}
      </span>
    );
  }
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="inline-block min-w-[200px] max-w-[200px] truncate font-medium">
          {rendered}
        </span>
      </HoverCardTrigger>

      <HoverCardContent
        align="start"
        side="bottom"
        className="max-w-[400px] break-words"
      >
        {rendered}
      </HoverCardContent>
    </HoverCard>
  );
};

const TableLayout = ({
  table,
  enableFilter,
  filterVisibility,
  tempVisibleColumnArray,
  enablePagination,
  detailBtn,
  isPending,
}: TableLayoutProps) => {
  const router = useRouter();
  const translations = useTranslations();
  return (
    <div className="h-full">
      <div className="relative h-[50vh] overflow-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead className="bg-background">
            {isPending ? (
              <tr>
                {Array.from({ length: tempVisibleColumnArray.length }).map(
                  (_, i) => (
                    <th key={i} className="p-2 sticky top-0 bg-background">
                      <div className="h-8 w-full animate-pulse rounded bg-muted" />
                    </th>
                  ),
                )}
              </tr>
            ) : (
              table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const extendedHeader = header as ExtendedHeader;

                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        style={
                          header.getSize() === 10
                            ? { maxWidth: "50px" }
                            : { width: `${header.getSize()}px` }
                        }
                        className="sticky top-0 z-30 bg-background p-2 text-left"
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex flex-col gap-2">
                            {/* Sorting */}
                            <Button
                              variant="outline"
                              onClick={header.column.getToggleSortingHandler()}
                              className="flex w-full items-center justify-between"
                            >
                              {renderHeader(header)}

                              {header.column.getCanSort() && (
                                <>
                                  {{
                                    asc: <IconChevronUp className="h-4 w-4" />,
                                    desc: (
                                      <IconChevronDown className="h-4 w-4" />
                                    ),
                                  }[header.column.getIsSorted() as string] ?? (
                                    <IconSelector className="h-4 w-4" />
                                  )}
                                </>
                              )}
                            </Button>

                            {/* Filters */}
                            {enableFilter &&
                            filterVisibility &&
                            header.column.getCanFilter()
                              ? (extendedHeader.column.columnDef?.meta?.filterComponent?.(
                                  header.column.setFilterValue,
                                ) ?? (
                                  <Filter
                                    column={header.column}
                                    table={table}
                                  />
                                ))
                              : filterVisibility && <div className="h-9" />}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))
            )}
          </thead>

          <tbody>
            {isPending ? (
              <tr>
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <div key={rowIndex}>
                    {Array.from({ length: tempVisibleColumnArray.length }).map(
                      (_, colIndex) => (
                        <td key={colIndex} className="p-2">
                          <div className="h-6 w-full animate-pulse rounded bg-muted" />
                        </td>
                      ),
                    )}
                  </div>
                ))}
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={tempVisibleColumnArray.length}
                  className="p-4 text-center"
                >
                  Nothing found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`${detailBtn ? "cursor-pointer" : ""} hover:bg-muted`}
                  onClick={() => {
                    let routeUrl: string | null =
                      detailBtn && row.getValue(DETAIL_BTN);
                    if (routeUrl) {
                      router.push(routeUrl);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-2 text-center">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          <tfoot>
            {table.getFooterGroups().map((footerGroup) => (
              <tr key={footerGroup.id}>
                {footerGroup.headers.map((header) => (
                  <td key={header.id} className="p-2">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.footer,
                          header.getContext(),
                        )}
                  </td>
                ))}
              </tr>
            ))}
          </tfoot>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row justify-start items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {enablePagination && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronsLeft />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronLeft />
              </Button>

              <span className="p-2 border rounded-sm w-7 h-7 flex justify-center items-center text-sm font-semibold bg-primary text-white">
                {table.getState().pagination.pageIndex + 1}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={isPending || !table.getCanNextPage()}
              >
                <IconChevronRight />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={isPending || !table.getCanNextPage()}
              >
                <IconChevronsRight />
              </Button>
            </div>
          )}

          {/* Rows per page */}
          <div className="flex items-center gap-2 font-semibold">
            <p className="text-sm">{translations("Rows Per page")}</p>

            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="flex items-center gap-2 font-semibold">
          {translations("Total Rows: ")}
          {(isPending ? 0 : table.getRowCount()) ?? 0}
        </p>
      </div>
    </div>
  );
};

export default TableLayout;
