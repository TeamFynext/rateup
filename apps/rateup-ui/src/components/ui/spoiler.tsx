import * as React from "react";

import { cn } from "@/lib/utils";

export interface SpoilerProps extends React.ComponentProps<"div"> {
  /** Collapsed height in px. The toggle only appears if content exceeds it. */
  maxHeight?: number;
  showLabel?: React.ReactNode;
  hideLabel?: React.ReactNode;
  /** Applied to the show/hide toggle. */
  controlClassName?: string;
}

/**
 * Clips its content to `maxHeight` and reveals a show/hide toggle only when the
 * content actually overflows. Replaces the former Mantine `Spoiler`.
 */
export function Spoiler({
  maxHeight = 200,
  showLabel = "Show more",
  hideLabel = "Hide",
  className,
  controlClassName,
  children,
  ...props
}: Readonly<SpoilerProps>) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [overflows, setOverflows] = React.useState(false);

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => setOverflows(el.scrollHeight > maxHeight);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [maxHeight, children]);

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <div
        ref={contentRef}
        className={cn(!expanded && "overflow-hidden")}
        style={expanded ? undefined : { maxHeight }}
      >
        {children}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={cn(
            "mt-2 w-fit text-sm text-primary underline-offset-4 hover:underline",
            controlClassName,
          )}
        >
          {expanded ? hideLabel : showLabel}
        </button>
      )}
    </div>
  );
}
