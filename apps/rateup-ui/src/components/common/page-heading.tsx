// The page and section headings the setup guide introduced, so every screen that
// adopts that design states its title the same way.

import type { ReactNode } from "react";

export function PageHeading({
  title,
  description,
  actions,
}: Readonly<{
  title: string;
  description?: ReactNode;
  /** Sits opposite the title — a back link, a primary action. */
  actions?: ReactNode;
}>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="m-0 font-display text-[28px] leading-tight font-bold tracking-[-0.025em]">
          {title}
        </h1>
        {description ? (
          <p className="m-0 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

export function SectionHeading({
  title,
  hint,
  badge,
  actions,
}: Readonly<{
  title: string;
  /** A line of context beside the title, in the muted voice. */
  hint?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="font-display text-[15px] font-bold tracking-[-0.015em]">{title}</span>
      {badge}
      {hint ? <span className="text-[13px] text-muted-foreground">{hint}</span> : null}
      {actions ? <span className="ml-auto">{actions}</span> : null}
    </div>
  );
}

/**
 * The page title, for a screen that states its own heading rather than adopting `PageHeading`.
 *
 * `PageHeading` sets a larger 28px title; that is the setup guide's treatment and the pages
 * built on it. Everything else had drifted into a dozen recipes — bare `text-2xl`, extrabold at
 * 22px, one with a gradient clipped to the text — so this is the single answer for them.
 */
export const PAGE_TITLE = "font-display text-2xl font-bold tracking-tight";

/** A step or panel title: one step down from `PAGE_TITLE`, same face and weight. */
export const SECTION_TITLE = "font-display text-xl font-bold tracking-tight";
