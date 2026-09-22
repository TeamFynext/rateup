import { cn } from "@/lib/utils";

/** Stored JSON (plan features, audit before/after), readable and contained on any width. */
export function JsonBlock({ value, className }: { value: unknown; className?: string }) {
  return (
    <pre
      className={cn(
        "max-h-96 overflow-auto rounded-2xl bg-muted p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all",
        className,
      )}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
