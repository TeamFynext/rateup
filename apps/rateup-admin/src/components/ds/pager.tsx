import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

/** "26–50 of 312" with previous / next. Pages are 1-based, as the API counts them. */
export function Pager({
  page,
  pageSize,
  total,
  onPageChange,
  fetching,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  fetching?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <p className="text-xs text-muted-foreground tabular">
        {total === 0
          ? "No results"
          : `${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(total)}`}
        {fetching && <span className="ml-2">· Loading…</span>}
      </p>
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-muted-foreground tabular sm:inline">
          Page {page} of {pages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-10 rounded-xl"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <IconChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-10 rounded-xl"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <IconChevronRight />
        </Button>
      </div>
    </div>
  );
}
