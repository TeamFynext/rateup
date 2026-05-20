"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

interface StatePaginationProps {
  totalItems: number;
  pagination: {
    pageIndex: number;
    pageSize: number;
  };
  setPagination: React.Dispatch<
    React.SetStateAction<{
      pageIndex: number;
      pageSize: number;
    }>
  >;
  pageSizeOptions: number[];
}

function getPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const pages: (number | "...")[] = [];
  const delta = 1;
  const rangeStart = Math.max(1, current - delta);
  const rangeEnd = Math.min(total - 2, current + delta);

  pages.push(0);
  if (rangeStart > 1) pages.push("...");
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < total - 2) pages.push("...");
  pages.push(total - 1);

  return pages;
}

const StatePagination = ({
  totalItems,
  pagination,
  setPagination,
  pageSizeOptions,
}: StatePaginationProps) => {
  const totalPageCount = Math.ceil(totalItems / pagination.pageSize);
  const { pageIndex } = pagination;

  if (totalPageCount <= 1) return null;

  const isFirst = pageIndex === 0;
  const isLast = pageIndex === totalPageCount - 1;
  const pageRange = getPageRange(pageIndex, totalPageCount);

  const goTo = (index: number) =>
    setPagination((prev) => ({ ...prev, pageIndex: index }));

  return (
    <div className="flex items-center gap-1 mt-3 flex-wrap">
      {/* First */}
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={isFirst}
        onClick={() => goTo(0)}
        aria-label="First page"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      {/* Previous */}
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={isFirst}
        onClick={() => goTo(pageIndex - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page numbers with ellipsis */}
      {pageRange.map((page, i) =>
        page === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="flex items-center justify-center h-8 w-8 text-sm text-muted-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ) : (
          <Button
            key={page}
            size="sm"
            variant={pageIndex === page ? "default" : "outline"}
            className="h-8 min-w-8 px-2.5 text-sm"
            onClick={() => goTo(page)}
            aria-label={`Page ${page + 1}`}
            aria-current={pageIndex === page ? "page" : undefined}
          >
            {page + 1}
          </Button>
        ),
      )}

      {/* Next */}
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={isLast}
        onClick={() => goTo(pageIndex + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Last */}
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={isLast}
        onClick={() => goTo(totalPageCount - 1)}
        aria-label="Last page"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>

      {/* Page size selector — inline, right after nav */}
      <Select
        value={String(pagination.pageSize)}
        onValueChange={(value) =>
          setPagination((prev) => ({
            ...prev,
            pageSize: Number(value),
            pageIndex: 0,
          }))
        }
      >
        <SelectTrigger className="h-8 w-17.5 text-sm ml-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {pageSizeOptions.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default StatePagination;
