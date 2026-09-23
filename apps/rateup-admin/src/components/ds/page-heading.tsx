import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Mirrors rateup-ui's `components/common/page-heading.tsx`, so both apps title pages alike. */
export const PAGE_TITLE = "font-display text-[28px] leading-tight font-bold tracking-[-0.025em]";
export const SECTION_TITLE = "font-display text-[15px] font-bold tracking-[-0.015em]";

export function PageHeading({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 space-y-1.5">
        <h1 className={cn(PAGE_TITLE, "wrap-break-word")}>{title}</h1>
        {description && (
          <p className="max-w-[56ch] text-[15px] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeading({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <h2 className={SECTION_TITLE}>{children}</h2>
      {action}
    </div>
  );
}
