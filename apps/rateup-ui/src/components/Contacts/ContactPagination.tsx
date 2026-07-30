import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import type { PaginationState } from "@/types/api.ts";
import { PAGE_SIZE } from "@/utils/constants.ts";

import { Button } from "../ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";

const pageSizeOptions = PAGE_SIZE.map((size) => ({ value: size, label: size }));

const ContactPagination = ({
  totalPageCount,
  setPagination,
  pagination,
}: {
  totalPageCount: number;
  setPagination: Dispatch<SetStateAction<PaginationState>>;
  pagination: PaginationState;
}) => {
  const totalPages = Math.max(1, Math.round(totalPageCount));
  const goTo = (pageIndex: number) =>
    setPagination((prev) => ({
      ...prev,
      pageIndex,
    }));

  const isFirst = pagination.pageIndex === 0;
  const isLast = pagination.pageIndex >= totalPages - 1;

  return (
    <nav className="mt-2 flex items-center gap-2" aria-label="Contact pagination">
      <Button
        variant="outline"
        size="icon"
        aria-label="First page"
        disabled={isFirst}
        onClick={() => goTo(0)}
      >
        <ChevronsLeft />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous page"
        disabled={isFirst}
        onClick={() => goTo(pagination.pageIndex - 1)}
      >
        <ChevronLeft />
      </Button>
      <span className="text-sm text-muted-foreground" aria-current="page">
        {pagination.pageIndex + 1} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next page"
        disabled={isLast}
        onClick={() => goTo(pagination.pageIndex + 1)}
      >
        <ChevronRight />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Last page"
        disabled={isLast}
        onClick={() => goTo(totalPages - 1)}
      >
        <ChevronsRight />
      </Button>
      <Select
        items={pageSizeOptions}
        value={String(pagination.pageSize)}
        onValueChange={(value) => {
          setPagination((prev) => ({
            ...prev,
            pageSize: Number(value),
          }));
        }}
      >
        <SelectTrigger size="sm" aria-label="Contacts per page" className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pageSizeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </nav>
  );
};

export default ContactPagination;
