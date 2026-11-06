// The strip of tool tiles under the channel header: one per tool, each saying where that tool
// stands and opening it in the workspace below.

import { Skeleton } from "@rateup/ui/components/skeleton";
import type { TablerIcon } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/** `live`: something is on. `idle`: nothing set up, or all of it off. `warning`: couldn't tell. */
export type ToolTone = "live" | "idle" | "warning";

export interface ToolStatus {
  tone: ToolTone;
  /** "3 on · 1 off", "Live · 4 items", "Not set up". */
  text: string;
}

export interface ChannelToolSummary<T extends string = string> {
  value: T;
  label: string;
  icon: TablerIcon;
  /** `undefined` while what it reads is loading. */
  status: ToolStatus | undefined;
}

const DOT: Record<ToolTone, string> = {
  live: "bg-green-600 dark:bg-green-500",
  idle: "bg-muted-foreground/35",
  warning: "bg-amber-500 dark:bg-amber-400",
};

/** The small dot that says whether a tool is live. */
export function ToolStatusDot({
  tone,
  className,
}: Readonly<{ tone: ToolTone | undefined; className?: string }>) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        tone ? DOT[tone] : "bg-muted",
        tone === "live" && "ring-3 ring-green-600/15 dark:ring-green-500/20",
        className,
      )}
    />
  );
}

export function ChannelOverview<T extends string>({
  tools,
  active,
  onOpen,
}: Readonly<{
  tools: readonly ChannelToolSummary<T>[];
  active: T;
  onOpen: (tool: T) => void;
}>) {
  const { t } = useTranslation();
  return (
    <section
      aria-label={t("Tools")}
      // A swipeable row on phones, so every label stays whole; a grid from `sm` up.
      className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5"
    >
      {tools.map(({ value, label, icon: Icon, status }) => (
        <button
          key={value}
          type="button"
          aria-pressed={value === active}
          onClick={() => onOpen(value)}
          className={cn(
            "group relative flex w-60 shrink-0 snap-start items-center gap-2.5 sm:w-auto sm:min-w-0 rounded-xl border bg-card p-3 text-left shadow-xs transition-colors outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50 sm:flex-col sm:items-stretch sm:gap-3 sm:p-3.5",
            value === active && "border-primary/50 bg-accent/40",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:text-primary",
              value === active && "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-4.5" />
          </span>
          <ToolStatusDot
            tone={status?.tone}
            className="absolute top-3 right-3 sm:top-4.5 sm:right-3.5"
          />
          <div className="flex min-w-0 flex-col gap-0.5 pr-3 sm:pr-0">
            <span className="truncate text-sm font-medium">{label}</span>
            {status ? (
              <span className="truncate text-xs text-muted-foreground tabular-nums">
                {status.text}
              </span>
            ) : (
              <Skeleton className="my-0.5 h-3 w-20" />
            )}
          </div>
        </button>
      ))}
    </section>
  );
}

/** Loading: the tiles' shape, before the account is known. */
export function ChannelOverviewSkeleton({ count = 5 }: Readonly<{ count?: number }>) {
  return (
    <div className="flex gap-3 overflow-hidden sm:grid sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-15 w-60 shrink-0 rounded-xl sm:h-25 sm:w-auto" />
      ))}
    </div>
  );
}
