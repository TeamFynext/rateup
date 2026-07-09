import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { PAGE_SIZE } from "@/utils/constants.ts";

import { ContainedSelection } from "../input/ContainedInput/ContainedInput.tsx";
import { Button } from "../ui/button.tsx";

const ContactPagination = ({ totalPageCount, setPagination, pagination }) => {
  const totalPages = Math.max(1, Math.round(totalPageCount));
  const goTo = (pageIndex: number) =>
    setPagination((prev) => ({
      ...prev,
      pageIndex,
    }));

  const isFirst = pagination.pageIndex === 0;
  const isLast = pagination.pageIndex >= totalPages - 1;

  return (
    <div className="mt-2 flex items-center gap-2">
      <Button variant="outline" size="icon" disabled={isFirst} onClick={() => goTo(0)}>
        <ChevronsLeft />
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled={isFirst}
        onClick={() => goTo(pagination.pageIndex - 1)}
      >
        <ChevronLeft />
      </Button>
      <span className="text-sm text-muted-foreground">
        {pagination.pageIndex + 1} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon"
        disabled={isLast}
        onClick={() => goTo(pagination.pageIndex + 1)}
      >
        <ChevronRight />
      </Button>
      <Button variant="outline" size="icon" disabled={isLast} onClick={() => goTo(totalPages - 1)}>
        <ChevronsRight />
      </Button>
      <ContainedSelection
        onChange={(value) => {
          setPagination((prev) => ({
            ...prev,
            pageSize: Number(value),
          }));
        }}
        value={String(pagination.pageSize)}
        data={PAGE_SIZE}
        allowDeselect={false}
        styles={{
          input: {
            height: 10,
            width: 80,
          },
        }}
      />
    </div>
  );
};

export default ContactPagination;
