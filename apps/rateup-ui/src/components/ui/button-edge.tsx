import { BaseEdge, EdgeLabelRenderer } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * shadcn/ui-style React Flow edge with a centered action button.
 * See https://ui.reactflow.dev — adapted to this project's design tokens.
 */
export function ButtonEdge({
  path,
  labelX,
  labelY,
  markerEnd,
  style,
  children,
}: Readonly<{
  path: string;
  labelX: number;
  labelY: number;
  markerEnd?: EdgeProps["markerEnd"];
  style?: React.CSSProperties;
  children: React.ReactNode;
}>) {
  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan group/edge pointer-events-auto absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          {children}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const ButtonEdgeButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm",
      "opacity-0 transition-all hover:border-destructive hover:bg-destructive hover:text-destructive-foreground",
      "focus-visible:opacity-100 group-hover/edge:opacity-100 in-[.selected]:opacity-100",
      "[&>svg]:size-3.5",
      className,
    )}
    {...props}
  />
));
ButtonEdgeButton.displayName = "ButtonEdgeButton";
