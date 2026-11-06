import { IconTrash } from "@tabler/icons-react";
import { useReactFlow } from "@xyflow/react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * shadcn/ui-style React Flow node header helpers.
 * See https://ui.reactflow.dev — adapted to this project's design tokens.
 */

export const NodeHeaderIcon = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "flex size-7 shrink-0 items-center justify-center rounded-md",
      "[&>svg]:size-4",
      className,
    )}
    {...props}
  />
));
NodeHeaderIcon.displayName = "NodeHeaderIcon";

export const NodeHeaderActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ml-auto flex items-center gap-1", className)} {...props} />
));
NodeHeaderActions.displayName = "NodeHeaderActions";

export const NodeHeaderAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "flex size-6 items-center justify-center rounded-md text-muted-foreground",
      "transition-colors hover:bg-accent hover:text-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "[&>svg]:size-3.5",
      className,
    )}
    {...props}
  />
));
NodeHeaderAction.displayName = "NodeHeaderAction";

/** Deletes the given node from the flow when clicked. */
export const NodeHeaderDeleteAction = React.forwardRef<
  HTMLButtonElement,
  { id: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "id">
>(({ id, className, onClick, ...props }, ref) => {
  const { deleteElements } = useReactFlow();
  return (
    <NodeHeaderAction
      ref={ref}
      aria-label="Delete node"
      className={cn("hover:bg-destructive/10 hover:text-destructive", className)}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
        void deleteElements({ nodes: [{ id }] });
      }}
      {...props}
    >
      <IconTrash />
    </NodeHeaderAction>
  );
});
NodeHeaderDeleteAction.displayName = "NodeHeaderDeleteAction";
