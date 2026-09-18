import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * shadcn/ui-style React Flow node primitives.
 * See https://ui.reactflow.dev — adapted to this project's design tokens.
 *
 * Compose a node with:
 *   <BaseNode selected={selected}>
 *     <BaseNodeHeader>
 *       <NodeHeaderIcon>{icon}</NodeHeaderIcon>
 *       <BaseNodeHeaderTitle>Title</BaseNodeHeaderTitle>
 *       <NodeHeaderActions>...</NodeHeaderActions>
 *     </BaseNodeHeader>
 *     <BaseNodeContent>...</BaseNodeContent>
 *   </BaseNode>
 */
export const BaseNode = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { selected?: boolean }
>(({ className, selected, ...props }, ref) => (
  <div
    ref={ref}
    tabIndex={0}
    className={cn(
      "relative w-[240px] rounded-lg border border-border bg-card text-card-foreground",
      "transition-colors duration-150",
      "hover:border-muted-foreground/40",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      selected && "border-primary ring-1 ring-primary/40",
      className,
    )}
    {...props}
  />
));
BaseNode.displayName = "BaseNode";

export const BaseNodeHeader = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <header
      ref={ref}
      className={cn(
        "relative flex items-center gap-2 rounded-t-xl px-3 py-2",
        "border-b border-border/60",
        className,
      )}
      {...props}
    />
  ),
);
BaseNodeHeader.displayName = "BaseNodeHeader";

export const BaseNodeHeaderTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    data-slot="base-node-title"
    className={cn("flex-1 truncate text-sm font-semibold leading-none", className)}
    {...props}
  />
));
BaseNodeHeaderTitle.displayName = "BaseNodeHeaderTitle";

export const BaseNodeContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5 p-2.5 text-xs text-muted-foreground", className)}
    {...props}
  />
));
BaseNodeContent.displayName = "BaseNodeContent";

export const BaseNodeFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col items-start gap-2 border-t border-border/60 px-3 py-2", className)}
    {...props}
  />
));
BaseNodeFooter.displayName = "BaseNodeFooter";
