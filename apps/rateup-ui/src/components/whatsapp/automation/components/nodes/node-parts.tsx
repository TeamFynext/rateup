import { Handle, Position } from "@xyflow/react";
import type React from "react";

import { cn } from "@/lib/utils.ts";

/**
 * Small, shared building blocks for node bodies so every node renders the same
 * way instead of each re-implementing rows, placeholders and choice pills.
 */

export function NodeRow({
  label,
  children,
  className,
}: Readonly<{ label: string; children?: React.ReactNode; className?: string }>) {
  return (
    <div className={cn("flex items-start justify-between gap-2", className)}>
      <span className="shrink-0 font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 wrap-break-word text-right text-foreground">{children}</span>
    </div>
  );
}

export function NodePlaceholder({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="italic text-muted-foreground">{children}</div>;
}

/** A rich-text / free-form block of body content. */
export function NodeText({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="line-clamp-2 wrap-break-word text-foreground **:bg-transparent!">
      {children}
    </div>
  );
}

/**
 * A selectable pill (reply button, list row, quick reply…). When `handleId` is
 * provided it renders its own right-side source handle so the option can branch.
 */
export function NodeChoice({
  handleId,
  title,
  description,
  children,
}: Readonly<{
  handleId?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}>) {
  return (
    <div className="relative w-full rounded-lg border border-border bg-accent px-3 py-1.5 text-center text-xs font-medium text-accent-foreground">
      {children ?? title}
      {description && <div className="mt-0.5 text-[11px] text-muted-foreground">{description}</div>}
      {handleId !== undefined && (
        <Handle
          type="source"
          position={Position.Right}
          id={handleId}
          style={{ zIndex: 12 }}
          className="size-3! border-2! border-(--node-accent)! bg-background!"
        />
      )}
    </div>
  );
}
