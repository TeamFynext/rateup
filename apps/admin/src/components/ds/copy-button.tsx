import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/** Copies a value (an org id, a WABA id) and says so for a moment. */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-lg text-xs text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
      aria-label={`Copy ${label ?? value}`}
    >
      <span className="truncate font-mono">{label ?? value}</span>
      {copied ? (
        <IconCheck className="size-3.5 shrink-0 text-positive" />
      ) : (
        <IconCopy className="size-3.5 shrink-0" />
      )}
    </button>
  );
}
