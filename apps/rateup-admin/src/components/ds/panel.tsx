import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The white, hairline-bordered surface charts and tables sit on. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-3xl border bg-card p-6 md:p-8", className)}>
      {children}
    </section>
  );
}

/** A section title in the reference's weight ("TOP performers", "By Country"). */
export function SectionTitle({
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
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}
