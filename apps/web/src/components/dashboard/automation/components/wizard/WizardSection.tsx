import { FieldDescription, FieldLegend, FieldSet } from "@rateup/ui/components/field";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils.ts";

/** A titled block of a wizard step, so every step labels its sections the same way. */
export function WizardSection({
  title,
  hint,
  className,
  children,
}: Readonly<{
  title: ReactNode;
  /** A line under the block, in the muted voice. */
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}>) {
  return (
    <FieldSet className={cn("gap-3", className)}>
      <FieldLegend variant="label" className="mb-0">
        {title}
      </FieldLegend>
      {children}
      {hint && <FieldDescription className="text-xs">{hint}</FieldDescription>}
    </FieldSet>
  );
}
