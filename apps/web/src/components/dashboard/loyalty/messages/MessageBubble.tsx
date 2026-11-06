import { cn } from "@/lib/utils";

/**
 * A message as the customer sees it, with the `{n}` slots picked out so the merchant
 * can tell the words they wrote from the values the programme fills in.
 */
export function MessageBubble({ text, className }: Readonly<{ text: string; className?: string }>) {
  const parts = text.split(/(\{\{\d+\}\})/g);
  return (
    <p
      className={cn(
        "whitespace-pre-line rounded-lg rounded-tl-sm bg-muted/60 px-3 py-2 text-sm text-foreground",
        className,
      )}
    >
      {parts.map((part, index) =>
        /^\{\{\d+\}\}$/.test(part) ? (
          <span key={index} className="rounded bg-primary/10 px-1 font-mono text-xs text-primary">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
}
