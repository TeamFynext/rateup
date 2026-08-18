import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  IconCalendarX,
  IconClock,
  IconMessage2,
  IconUnlink,
  IconRosetteDiscountCheck,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Lead } from "@/backend/pipeline/pipeline.types.ts";
import { cn } from "@/lib/utils";

import { TASK_TYPE_ICON } from "../pipeline.constants.tsx";
import { daysIdle, daysInStage, isOverdue, isRotting } from "../pipeline.utils.ts";
import { AssigneeStack } from "../shared/AssigneeStack.tsx";
import { LeadLabelChip } from "../shared/atoms.tsx";
import { LeadAvatar } from "../shared/LeadAvatar.tsx";

/**
 * The payload a dragged card carries; the board's monitor reads it on drop.
 * A type alias rather than an interface so it stays assignable to the
 * `Record<string, unknown>` pragmatic-dnd wants back from `getInitialData`.
 */
export type LeadDragData = {
  type: "pipeline-lead";
  leadId: string;
  fromStageId: string;
};

export function isLeadDragData(
  data: Record<string, unknown>,
): data is Record<string, unknown> & LeadDragData {
  return data.type === "pipeline-lead";
}

interface LeadCardProps {
  lead: Lead;
  rottingEnabled: boolean;
  stageColor: string | null;
  onOpen: (leadId: string) => void;
  onOpenConversation: (lead: Lead) => void;
}

/**
 * One lead on the board. The left edge carries the stage colour, or the
 * destructive colour when the lead has gone stale — the card's most important
 * state is the one you can read without focusing on it.
 */
export function LeadCard({
  lead,
  rottingEnabled,
  stageColor,
  onOpen,
  onOpenConversation,
}: Readonly<LeadCardProps>) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    return draggable({
      element,
      getInitialData: (): LeadDragData => ({
        type: "pipeline-lead",
        leadId: lead.id,
        fromStageId: lead.stageId,
      }),
      onDragStart: () => setDragging(true),
      onDrop: () => setDragging(false),
    });
  }, [lead.id, lead.stageId]);

  const rotting = isRotting(lead, rottingEnabled);
  const overdue = isOverdue(lead);
  const NextIcon = lead.nextTask ? TASK_TYPE_ICON[lead.nextTask.type] : IconCalendarX;

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(lead.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(lead.id);
        }
      }}
      style={{ borderLeftColor: rotting ? undefined : (stageColor ?? undefined) }}
      className={cn(
        "bg-card border-border hover:border-primary/40 focus-visible:ring-ring group cursor-grab rounded-xl border border-l-[3px] p-3 shadow-xs transition-colors focus-visible:ring-2 focus-visible:outline-none",
        rotting && "border-l-destructive",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2.5">
        <LeadAvatar name={lead.name} channel={lead.channel} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-foreground truncate text-[13px] font-bold">{lead.name}</div>
          <div className="text-muted-foreground truncate text-[11px]">
            {lead.company ?? t("Direct customer")}
          </div>
        </div>
        {/* Only a lead raised against a contact has a conversation to open. */}
        {lead.contactId ? (
          <button
            type="button"
            // Phrased with the name as a plain argument rather than a possessive
            // so it survives translation into languages that have no "'s".
            aria-label={t("Open conversation with {name} in Inbox", {
              name: lead.contact?.name ?? t("the contact"),
            })}
            onClick={(event) => {
              event.stopPropagation();
              onOpenConversation(lead);
            }}
            className="text-muted-foreground hover:text-primary opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
          >
            <IconMessage2 className="size-4" />
          </button>
        ) : (
          <IconUnlink
            className="text-muted-foreground size-4 shrink-0"
            title={t("Not linked to a contact")}
          />
        )}
      </div>

      {lead.labels.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {lead.labels.map((label) => (
            <LeadLabelChip key={label.id} label={label} />
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          "mt-2.5 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold",
          lead.status === "WON"
            ? "bg-green-600/10 text-green-700 dark:text-green-500"
            : overdue
              ? "bg-destructive/10 text-destructive"
              : lead.nextTask
                ? "bg-muted text-foreground"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
        )}
      >
        {lead.status === "WON" ? (
          <>
            <IconRosetteDiscountCheck className="size-3.5" />
            <span className="truncate">{t("Won · lifecycle closed")}</span>
          </>
        ) : (
          <>
            <NextIcon className="size-3.5" />
            <span className="truncate">
              {lead.nextTask?.title ?? t("No next activity scheduled")}
            </span>
          </>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        {lead.team ? (
          <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold">
            <IconUsersGroup className="size-2.5" />
            {lead.team.name}
          </span>
        ) : null}
        <AssigneeStack assignees={lead.assignees} owner={lead.owner} />
        <span className="flex-1" />
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-bold",
            rotting ? "text-destructive" : "text-muted-foreground",
          )}
        >
          <IconClock className="size-2.5" />
          {rotting
            ? t("Idle {days}d", { days: daysIdle(lead) })
            : t("{days}d in stage", { days: daysInStage(lead) })}
        </span>
      </div>
    </div>
  );
}
