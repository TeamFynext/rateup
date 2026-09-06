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
  onOpen: (leadId: string) => void;
  onOpenConversation: (lead: Lead) => void;
}

/**
 * One lead on the board.
 *
 * The card is a plain hairline panel: the column it sits in already names its
 * stage, so a stage-coloured edge only repeated that. A stale lead outlines the
 * whole card instead, which stays readable without focusing on it and — unlike a
 * thicker left border — does not shift the contents sideways when it appears.
 */
export function LeadCard({
  lead,
  rottingEnabled,
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
      className={cn(
        "bg-card border-border focus-visible:ring-ring cursor-grab rounded-xl border p-3 shadow-xs transition-all focus-visible:ring-2 focus-visible:outline-none",
        "hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-md",
        rotting && "border-destructive/45",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2.25">
        <LeadAvatar name={lead.name} source={lead.source} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-foreground truncate text-[13.5px] font-medium">{lead.name}</div>
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
            className="text-muted-foreground hover:text-primary shrink-0 transition-colors"
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
        <div className="mt-2.25 flex flex-wrap gap-1.25">
          {lead.labels.map((label) => (
            <LeadLabelChip key={label.id} label={label} />
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          "mt-2.25 flex items-center gap-1.5 rounded-sm px-2 py-1.25 text-[11px] font-semibold",
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
            <IconRosetteDiscountCheck className="size-3" />
            <span className="truncate">{t("Won · closed")}</span>
          </>
        ) : (
          <>
            <NextIcon className="size-3" />
            <span className="truncate">
              {lead.nextTask?.title ?? t("No next activity scheduled")}
            </span>
          </>
        )}
      </div>

      <div className="mt-2.25 flex items-center gap-1.75">
        {lead.team ? (
          <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
            <IconUsersGroup className="size-2.5" />
            {lead.team.name}
          </span>
        ) : null}
        <AssigneeStack assignees={lead.assignees} owner={lead.owner} />
        <span className="flex-1" />
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium",
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
