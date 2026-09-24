import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

/** Roughly the height of the sticky top bar, so a scrolled-to list is not tucked under it. */
const STICKY_BAR_ALLOWANCE = 96;

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
  const anchor = useRef<HTMLDivElement>(null);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  /**
   * Turning a page from the bottom of a long list used to leave the reader at the bottom of
   * the next one, or be yanked to the top by the router. Glide back to the head of this list
   * instead, and leave anything above it alone.
   */
  const goTo = (next: number) => {
    onPageChange(next);
    const list = anchor.current?.previousElementSibling ?? anchor.current;
    if (!list) return;
    const top = list.getBoundingClientRect().top + window.scrollY - STICKY_BAR_ALLOWANCE;
    // Only when the list starts above the fold: a short list is fully visible already, and
    // scrolling it would move the page for no reason.
    if (top < window.scrollY) window.scrollTo({ top, behavior: "smooth" });
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div ref={anchor} className="flex items-center justify-between gap-4 pt-2">
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
          onClick={() => goTo(page - 1)}
          aria-label="Previous page"
        >
          <IconChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-10 rounded-xl"
          disabled={page >= pages}
          onClick={() => goTo(page + 1)}
          aria-label="Next page"
        >
          <IconChevronRight />
        </Button>
      </div>
    </div>
  );
}
