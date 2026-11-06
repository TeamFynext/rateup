/**
 * Shared look for the icon rail's footer controls (theme, docs, what's new,
 * notifications). They match the nav icons above them: 55% white at rest, a
 * soft white pill on hover or while open, no tile of their own. A secondary
 * Button paints a pale tile, which on the navy rail stacked into a column of
 * white squares.
 */
export const railButtonClass =
  "mx-auto size-8 rounded-lg bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground";

/**
 * A count over a rail icon's corner. The rail-coloured ring cuts it out of the
 * icon behind it, and it sits inside the button's own box so it never reaches
 * into the control below.
 */
export const railBadgeClass =
  "pointer-events-none absolute -top-1 -right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2 ring-sidebar";

/** Over 9 the exact number stops helping at this size. */
export const railBadgeCount = (count: number) => (count > 9 ? "9+" : String(count));
