import { cn } from "@/lib/utils.ts";

/** A dot and a word, the same treatment the integration pages use for Connected. */
export function StatusLine({ live, label }: Readonly<{ live: boolean; label: string }>) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          live ? "bg-green-600 dark:bg-green-500" : "bg-muted-foreground/40",
        )}
      />
      {label}
    </span>
  );
}
