import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The Design System V2 card surface: white, a faint ring, the lightest shadow. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 md:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}
