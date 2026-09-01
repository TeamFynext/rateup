// The row card the setup guide and the channels settings page are both built from:
// a tinted icon chip, a title with status badges, a description, and an action
// column pinned to the right. One component so the two pages cannot drift.

import type { TablerIcon } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils.ts";

/** Icon-chip palettes. A finished row overrides whichever tint it declares. */
export const ROW_TINTS = {
  accent: "bg-primary/10 border-primary/15 text-primary",
  green:
    "border-green-100 bg-green-50 text-green-600 dark:border-green-900 dark:bg-green-600/10 dark:text-green-500",
  warm: "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-500",
  brand: "bg-primary border-primary text-primary-foreground",
  done: "border-green-100 bg-green-50 text-green-600 dark:border-green-900 dark:bg-green-600/10 dark:text-green-500",
} as const;

export type RowTint = keyof typeof ROW_TINTS;

export interface SetupRowCardProps {
  /** Anchors deep links — the setup guide scrolls to a row by id. */
  id?: string;
  icon: TablerIcon;
  tint?: RowTint;
  title: string;
  description: ReactNode;
  /** Swaps the chip to the finished palette. */
  done?: boolean;
  /** Status chips beside the title. */
  badges?: ReactNode;
  /** Draws the row as picked out — the guide highlights the step the sidebar points at. */
  highlighted?: boolean;
  /** Dims the row: still there to act on, but not asking for attention. */
  muted?: boolean;
  /** Extra detail under the description: a note, a count, a status line. */
  detail?: ReactNode;
  /** The primary control, sized to fill the action column. */
  action: ReactNode;
  /** Sits under the action — the guide's "Mark done" checkbox. */
  actionFooter?: ReactNode;
}

export function SetupRowCard({
  id,
  icon: Icon,
  tint = "accent",
  title,
  description,
  done = false,
  badges,
  highlighted = false,
  muted = false,
  detail,
  action,
  actionFooter,
}: Readonly<SetupRowCardProps>) {
  return (
    <div
      id={id}
      className={cn(
        "flex flex-col gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-center sm:gap-5",
        highlighted ? "border-primary/30 shadow-custom-base" : "border-border",
        muted && "opacity-65",
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-md border",
          done ? ROW_TINTS.done : ROW_TINTS[tint],
        )}
      >
        <Icon size={21} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2.5">
          <span className="font-heading text-[17px] font-bold tracking-[-0.015em]">{title}</span>
          {badges}
        </span>
        <span className="max-w-[66ch] text-sm leading-relaxed text-muted-foreground">
          {description}
        </span>
        {detail}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-2.5 sm:w-45">
        {action}
        {actionFooter}
      </div>
    </div>
  );
}
