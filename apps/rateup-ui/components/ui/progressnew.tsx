"use client";

import * as React from "react";

import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "./utils";

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorColor?: string;
};

function Progress({
  className,
  value,
  indicatorColor,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 transition-all bg-primary"
        style={{
          transform: `translateX(-${100 - (value || 0)}%)`,
          backgroundColor: indicatorColor,
        }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
