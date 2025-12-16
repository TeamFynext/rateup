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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
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
  const headerText = flexRender(
    header.column.columnDef.header,
    header.getContext(),
  );

  if (String(headerText).length <= 50) {
    return (
      <span className="min-w-[200] max-w-[200] font-medium">{headerText}</span>
    );
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="inline-block min-w-[200px] max-w-[200px] truncate font-bold">
          {headerText}
        </span>
      </HoverCardTrigger>

      <HoverCardContent
        align="start"
        side="bottom"
        className="max-w-[400px] break-words"
      >
        {headerText}
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
      <div className="overflow-auto">
        <Table border={0}>
          <TableHeader className="sticky top-0 z-10 bg-background">
            {isPending ? (
              <TableHeadSkeleton />
            ) : (
              table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const extendedHeader = header as ExtendedHeader;

                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        style={
                          header.getSize() === 10
                            ? { maxWidth: "50px" }
                            : { width: `${header.getSize()}px` }
                        }
                        className="p-2"
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex flex-col gap-2">
                            {/* Sorting button */}
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
                              ? (extendedHeader.column.columnDef?.meta?.filterComponent(
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
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableHeader>

          <TableBody className="">
            {isPending ? (
              <TableBodySkeleton />
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={tempVisibleColumnArray.length}
                  className="text-center"
                >
                  Nothing found
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={`${detailBtn ? "cursor-pointer" : ""} p-2 text-center`}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => {
                    let routeUrl: string | null =
                      detailBtn && row.getValue(DETAIL_BTN);
                    if (routeUrl) {
                      router.push(routeUrl);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell, indexCell) => (
                    <TableCell key={indexCell}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>

          {/* ================= FOOTER ================= */}
          <TableFooter>
            {table.getFooterGroups().map((footerGroup, index) => (
              <TableRow key={index}>
                {footerGroup.headers.map((header, hIndex) => (
                  <TableCell key={hIndex}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.footer,
                          header.getContext(),
                        )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableFooter>
        </Table>
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
