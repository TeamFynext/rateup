import type { ReactNode } from "react";

/**
 * The title block of every analytics page: small enough that the numbers start
 * near the top of the screen, and without a card, since it is not content.
 */
export function AnalyticsHeader({
  title,
  description,
  leading,
  badge,
  back,
}: Readonly<{
  title: ReactNode;
  description?: ReactNode;
  /** Before the title: an avatar or a team colour. */
  leading?: ReactNode;
  /** After the title: a status. */
  badge?: ReactNode;
  /** Before the icon on a drill-down: a link back to the list, styled with `BACK_LINK`. */
  back?: ReactNode;
}>) {
  return (
    <header className="flex flex-col gap-1">
      <div className="flex min-w-0 items-center gap-3">
        {back && <div className="shrink-0 text-sm text-muted-foreground">{back}</div>}
        {leading}
        <div className="flex min-w-0 flex-col">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="m-0 truncate font-heading text-xl leading-tight font-bold tracking-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="m-0 text-[13px] leading-snug text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </header>
  );
}

/** For the back link a drill-down passes as `back`; put an arrow icon inside it. */
export const BACK_LINK =
  "inline-flex size-9 items-center justify-center rounded-md border border-border hover:bg-muted hover:text-foreground";

/**
 * The sticky strip that holds a page's filters and actions. `-top-4` and `-mx-4`
 * undo the dashboard scroll container's padding, so it sits flush when stuck.
 */
export function AnalyticsToolbar({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="sticky -top-4 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {children}
    </div>
  );
}
