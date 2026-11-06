import { IconBroadcast } from "@tabler/icons-react";
import type { ReactNode } from "react";

/** Says a list is read from the gateway right now, and what that implies. */
export function LiveNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground">
      <IconBroadcast className="mt-px size-4 shrink-0" stroke={1.5} />
      <span>{children}</span>
    </p>
  );
}
