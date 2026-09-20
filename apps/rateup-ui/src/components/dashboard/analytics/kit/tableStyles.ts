/** A real link, so it can be focused and opened in a new tab; the row's own click does the same. */
export const NAME_LINK =
  "truncate font-medium text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:underline";

/** Every row opens a drill-down, so the whole row reads as clickable. */
export const CLICKABLE_ROWS = "overflow-x-auto [&_tbody_tr]:cursor-pointer";
