import {
  IconArrowBackUp,
  IconArrowsExchange,
  IconCircleCheck,
  IconCircleX,
  IconDots,
  IconMessage2,
  IconPlugConnectedX,
  IconPlus,
  IconRefresh,
  IconRosetteDiscountCheck,
  IconTrash,
  IconUsersGroup,
  IconX,
  type Icon,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCreateLeadNoteMutation,
  useDeleteLeadMutation,
  useDeleteLeadNoteMutation,
  useLeadQuery,
  useReopenLeadMutation,
} from "@/backend/pipeline/pipeline.query.tsx";
import type {
  Lead,
  LeadActivity,
  PipelineDetail,
  PipelineStage,
  PipelineUser,
} from "@/backend/pipeline/pipeline.types.ts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatToRelativeTime } from "@/utils/dateTime.ts";

import { channelLabel, sourceLabel } from "../pipeline.labels.ts";
import { daysIdle, isRotting, leadAgeDays } from "../pipeline.utils.ts";
import { FieldLabel } from "../shared/atoms.tsx";
import { LeadAvatar } from "../shared/LeadAvatar.tsx";
import { LeadAssigneePicker } from "./LeadAssigneePicker.tsx";
import { LeadStageStepper } from "./LeadStageStepper.tsx";
import { NextActivityPanel } from "./NextActivityPanel.tsx";

const ACTIVITY_ICON: Record<string, Icon> = {
  CREATED: IconPlus,
  MOVED: IconArrowsExchange,
  ASSIGNEES_CHANGED: IconUsersGroup,
  WON: IconRosetteDiscountCheck,
  LOST: IconCircleX,
  REOPENED: IconArrowBackUp,
  NOTE_ADDED: IconMessage2,
  TASK_ADDED: IconPlus,
  TASK_COMPLETED: IconCircleCheck,
  INTEGRATION_SYNCED: IconRefresh,
  INTEGRATION_SKIPPED: IconPlugConnectedX,
};

/**
 * Timeline entries are tinted by what happened, not by a single accent: wins and
 * completions read green, closures and quiet-lead nudges warm, the rest brand.
 */
const ACTIVITY_TONE: Record<string, string> = {
  WON: "bg-green-600/10 text-green-700 dark:text-green-500",
  TASK_COMPLETED: "bg-green-600/10 text-green-700 dark:text-green-500",
  LOST: "bg-muted text-muted-foreground",
  NOTE_ADDED: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
  ASSIGNEES_CHANGED: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
  TASK_ADDED: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
  // A skipped sync is something the org may need to act on, so it reads warm
  // rather than as neutral chrome.
  INTEGRATION_SKIPPED: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
};

const DEFAULT_ACTIVITY_TONE = "bg-primary/10 text-primary";

/**
 * Renders a timeline entry as a sentence, from whatever `details` it carries.
 *
 * Takes `t` rather than reading it from a hook so the whole entry is one
 * translated sentence per case. Building these by concatenating fragments would
 * fix English word order into every other language.
 */
function describeActivity(t: TFunction, activity: LeadActivity): { title: string; body: string } {
  const details = activity.details ?? {};
  const actor = activity.user?.name ?? t("Someone");

  switch (activity.type) {
    case "CREATED":
      // An automated lead still names the user whose lifecycle change set the
      // rule off, when there was one — a webhook or a bot leaves nobody.
      if (details.automated) {
        return {
          title: t("Lead created automatically"),
          body: activity.user
            ? t("Added by automation when {actor} changed this contact's lifecycle.", { actor })
            : t("Added by automation when a rule filed this contact onto the board."),
        };
      }
      return {
        title: t("Lead created"),
        body: t("{actor} added this lead to the pipeline.", { actor }),
      };
    case "MOVED":
      return {
        title: t("Moved to {stage}", { stage: details.toStageName ?? t("a new stage") }),
        body: t("{actor} moved this lead from {stage}.", {
          actor,
          stage: details.fromStageName ?? t("its previous stage"),
        }),
      };
    case "ASSIGNEES_CHANGED": {
      const added = details.addedNames ?? [];
      const removed = details.removedNames ?? [];
      return {
        title: t("Assignees changed"),
        body: [
          added.length ? t("{actor} assigned {names}", { actor, names: added.join(",") }) : null,
          removed.length
            ? t("{actor} unassigned {names}", { actor, names: removed.join(",") })
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }
    case "WON":
      return {
        title: t("Marked won"),
        body: details.note || t("{actor} closed this lead as won.", { actor }),
      };
    case "LOST":
      return {
        title: t("Marked lost"),
        // The reason is org-authored copy, so it is passed through untranslated.
        body: details.lostReasonLabel
          ? details.note
            ? t("{reason} — {note}", { reason: details.lostReasonLabel, note: details.note })
            : details.lostReasonLabel
          : (details.note ?? t("{actor} closed this lead as lost.", { actor })),
      };
    case "REOPENED":
      return {
        title: t("Reopened"),
        body: t("{actor} put this lead back on the board.", { actor }),
      };
    case "NOTE_ADDED":
      return { title: t("Note added"), body: t("{actor} left a note on this lead.", { actor }) };
    case "TASK_ADDED":
      return { title: t("Next activity scheduled"), body: details.taskTitle ?? "" };
    case "INTEGRATION_SYNCED": {
      const target = details.integrationName ?? t("the CRM");
      if (details.statusRejected) {
        // The lead reached the CRM but its stage did not. Called out rather than
        // reported as a plain success, because it is a mapping the org must fix.
        return {
          title: t("Synced to {crm}, but not the stage", { crm: target }),
          body: t(
            "{crm} would not accept this lead's stage. Check the stage mapping in the integration settings.",
            { crm: target },
          ),
        };
      }
      return {
        title: details.externalCreated
          ? t("Added to {crm}", { crm: target })
          : t("Updated in {crm}", { crm: target }),
        body: details.toStageName
          ? t("Synced as {stage}.", { stage: details.toStageName })
          : t("This lead is up to date in {crm}.", { crm: target }),
      };
    }
    case "INTEGRATION_SKIPPED": {
      const target = details.integrationName ?? t("the CRM");
      // The only reason so far, and the common one: Instagram and Messenger
      // leads have no phone number at all, and GetLead requires one.
      if (details.skipReason === "NO_PHONE") {
        return {
          title: t("Not sent to {crm}", { crm: target }),
          body: details.sourceLabel
            ? t(
                "{crm} needs a phone number, and this {source} lead has none. Add one and it will sync.",
                {
                  crm: target,
                  source: sourceLabel(t, details.sourceLabel as Parameters<typeof sourceLabel>[1]),
                },
              )
            : t("{crm} needs a phone number, and this lead has none.", { crm: target }),
        };
      }
      if (details.skipReason === "NOT_CONFIGURED") {
        return {
          title: t("Not sent to {crm}", { crm: target }),
          body: t("{crm} is connected but not finished setting up.", { crm: target }),
        };
      }
      return { title: t("Not sent to {crm}", { crm: target }), body: "" };
    }
    default:
      // An activity type the UI does not know yet; the raw type is better than
      // a blank row, and it is deliberately not a translation key.
      return { title: activity.type, body: "" };
  }
}

interface LeadDetailModalProps {
  leadId: string | undefined;
  pipeline: PipelineDetail | undefined;
  /** Everyone on the pipeline's teams — the assignee picker's options. */
  members: PipelineUser[];
  onClose: () => void;
  onMarkWon: (lead: Lead) => void;
  onMarkLost: (lead: Lead) => void;
  onMoveStage: (leadId: string, fromStageId: string, stage: PipelineStage, known?: Lead) => void;
  onOpenConversation: (lead: Lead) => void;
}

/**
 * Everything known about one lead: its position in the funnel, its fields, its
 * timeline and its notes. Opened from every view, so it takes only a lead id and
 * fetches the detail itself rather than depending on which list it came from.
 *
 * A centred modal rather than a side drawer: the lead's fields and its history
 * are read together, and a 520px column forced them behind tabs, so answering
 * "where is this lead and what happened last?" cost a tab switch. Side by side
 * from `lg` up, both columns scroll on their own; below that they stack in one
 * scroll, which is also the whole layout on a phone.
 */
export function LeadDetailModal({
  leadId,
  pipeline,
  members,
  onClose,
  onMarkWon,
  onMarkLost,
  onMoveStage,
  onOpenConversation,
}: Readonly<LeadDetailModalProps>) {
  const { t } = useTranslation();
  const [noteDraft, setNoteDraft] = useState("");
  const { data: lead, isPending } = useLeadQuery(leadId);
  const createNote = useCreateLeadNoteMutation();
  const deleteNote = useDeleteLeadNoteMutation();
  const reopenLead = useReopenLeadMutation();
  const deleteLead = useDeleteLeadMutation();

  const rotting = lead ? isRotting(lead, pipeline?.rottingEnabled ?? false) : false;

  const saveNote = () => {
    const text = noteDraft.trim();
    if (!text || !leadId) return;
    createNote.mutate({ leadId, text }, { onSuccess: () => setNoteDraft("") });
  };

  return (
    <Dialog open={Boolean(leadId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[calc(100dvh-3rem)] max-h-190 w-full flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-255"
      >
        {isPending || !lead ? (
          <div className="flex flex-col gap-3 p-5">
            <DialogTitle className="sr-only">{t("Loading lead")}</DialogTitle>
            <Skeleton className="h-11 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <div className="border-border shrink-0 border-b px-6 pt-5 pb-4">
              <div className="flex items-start gap-3">
                <LeadAvatar name={lead.name} channel={lead.channel} size="xl" />
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-display truncate text-xl leading-tight font-bold tracking-[-0.01em]">
                    {lead.name}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 truncate text-sm">
                    {[
                      lead.channel === "NONE" ? null : channelLabel(t, lead.channel),
                      lead.phone,
                      lead.company,
                    ]
                      .filter(Boolean)
                      .join(" · ") || sourceLabel(t, lead.source)}
                  </DialogDescription>
                </div>
                <DialogClose
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground -mt-1 shrink-0"
                      aria-label={t("Close")}
                    >
                      <IconX className="size-4.5" />
                    </Button>
                  }
                />
              </div>

              <div className="mt-3.5 flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-9 gap-1.5 text-xs"
                  onClick={() => onOpenConversation(lead)}
                  disabled={!lead.contactId}
                >
                  <IconMessage2 className="size-3.5" />
                  {t("Open conversation")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 text-xs font-medium text-green-700 dark:text-green-500"
                  onClick={() => onMarkWon(lead)}
                  disabled={lead.status === "WON"}
                >
                  <IconCircleCheck className="size-3.5" />
                  {t("Won")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:bg-muted h-9 gap-1.5 text-xs font-medium"
                  onClick={() => onMarkLost(lead)}
                  disabled={lead.status === "LOST"}
                >
                  <IconCircleX className="size-3.5" />
                  {t("Lost")}
                </Button>

                <span className="flex-1" />

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground size-9"
                        aria-label={t("More lead actions")}
                      >
                        <IconDots className="size-4.5" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={lead.status === "OPEN"}
                      onClick={() => reopenLead.mutate(lead.id)}
                    >
                      <IconArrowBackUp />
                      {t("Reopen lead")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => deleteLead.mutate(lead.id, { onSuccess: onClose })}
                    >
                      <IconTrash />
                      {t("Delete lead")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {pipeline ? (
              <LeadStageStepper
                lead={lead}
                pipeline={pipeline}
                onMoveStage={(stage) => onMoveStage(lead.id, lead.stageId, stage, lead)}
              />
            ) : null}

            {/* Below lg the two panels stack and the whole body is one scroll;
                from lg they sit side by side and each scrolls on its own, so
                reading the timeline never scrolls the fields out of view. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
              <div className="border-border bg-muted shrink-0 border-b px-5.5 pt-5 pb-6 lg:w-93 lg:overflow-y-auto lg:border-r lg:border-b-0">
                <FieldLabel>{t("Details")}</FieldLabel>
                <div className="mt-3 grid grid-cols-2 gap-x-4.5 gap-y-3.5">
                  {/* Assignees are the one field worth editing here, so they are
                      the one that is a control rather than a read-out. */}
                  <div className="min-w-0">
                    <FieldLabel>{t("Assignees")}</FieldLabel>
                    <LeadAssigneePicker lead={lead} members={members} />
                  </div>

                  {/* Read-only by design: the owner records who brought the lead
                      in, so it stays put while assignees come and go. */}
                  <div className="min-w-0">
                    <FieldLabel>{t("Owner")}</FieldLabel>
                    {lead.owner ? (
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <LeadAvatar
                          name={lead.owner.name}
                          photo={lead.owner.profilePhoto}
                          tone="person"
                          colorKey={lead.owner.id}
                          size="sm"
                          className="rounded-full ring-2 ring-amber-500 dark:ring-amber-400"
                        />
                        <span className="text-foreground min-w-0 truncate text-[13px] font-semibold">
                          {lead.owner.name ?? t("Teammate")}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground mt-0.5 block text-[13px] font-semibold">
                        {t("Added automatically")}
                      </span>
                    )}
                  </div>

                  {/* `key` is the field's own id rather than its label, so React
                      does not remount the row when the language changes. */}
                  {[
                    { key: "team", label: t("Team"), value: lead.team?.name ?? t("No team") },
                    { key: "source", label: t("Source"), value: sourceLabel(t, lead.source) },
                    {
                      key: "channel",
                      label: t("Channel"),
                      value: channelLabel(t, lead.channel),
                    },
                    {
                      key: "age",
                      label: t("Lead age"),
                      value: t("{days} days", { days: leadAgeDays(lead) }),
                    },
                    {
                      key: "idle",
                      label: t("Idle"),
                      value: rotting
                        ? t("{days} days — stalled", { days: daysIdle(lead) })
                        : t("{days} days", { days: daysIdle(lead) }),
                      tone: rotting ? "text-destructive" : undefined,
                    },
                    {
                      key: "expectedClose",
                      label: t("Expected close"),
                      value: lead.expectedCloseAt
                        ? dayjs(lead.expectedCloseAt).format("D MMM YYYY")
                        : t("Not set"),
                    },
                    {
                      // `contactId` is the link; the name is just how it reads.
                      key: "contact",
                      label: t("Contact"),
                      value: lead.contact?.name ?? t("Not linked"),
                      tone: lead.contactId ? undefined : "text-amber-700 dark:text-amber-500",
                    },
                  ].map((field) => (
                    <div key={field.key} className="min-w-0">
                      <FieldLabel>{field.label}</FieldLabel>
                      <div
                        className={cn(
                          "mt-0.75 truncate text-[13.5px] font-medium",
                          field.tone ?? "text-foreground",
                        )}
                      >
                        {field.value}
                      </div>
                    </div>
                  ))}
                </div>

                <NextActivityPanel lead={lead} />
              </div>

              <div className="min-h-0 flex-1 px-6 pt-5 pb-6 lg:overflow-y-auto">
                <div className="border-border rounded-xl border p-3">
                  <Textarea
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    placeholder={t("Add a note about this lead…")}
                    className="min-h-12 resize-y border-none p-0 shadow-none focus-visible:ring-0"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={saveNote}
                      disabled={!noteDraft.trim() || createNote.isPending}
                    >
                      {t("Save note")}
                    </Button>
                  </div>
                </div>

                <div className="mt-4.5">
                  <FieldLabel>{t("Notes ({total})", { total: lead.notes.length })}</FieldLabel>
                  {lead.notes.length === 0 ? (
                    <p className="text-muted-foreground mt-2 text-xs">
                      {t("No notes yet — anything the team types here stays with the lead.")}
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-3">
                      {lead.notes.map((note) => (
                        <div
                          key={note.id}
                          className="rounded-xl border border-amber-200 bg-amber-50 p-3.25 dark:border-amber-900/40 dark:bg-amber-950/20"
                        >
                          <div className="flex items-baseline gap-2">
                            <span className="text-foreground text-[13px] font-medium">
                              {note.author?.name ?? t("Someone")}
                            </span>
                            <span className="text-muted-foreground text-[11.5px]">
                              {dayjs(note.createdAt).format("D MMM, h:mm A")}
                            </span>
                            <span className="flex-1" />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive size-6"
                              onClick={() => deleteNote.mutate(note.id)}
                              aria-label={t("Delete note")}
                            >
                              <IconTrash className="size-3.5" />
                            </Button>
                          </div>
                          <p className="text-muted-foreground mt-1.25 text-[13.5px] leading-normal whitespace-pre-wrap">
                            {note.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5.5">
                  <FieldLabel>{t("Activity")}</FieldLabel>
                  <div className="mt-3">
                    {lead.activities.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {t("Nothing has happened yet.")}
                      </p>
                    ) : (
                      lead.activities.map((activity, index) => {
                        const ActivityIcon = ACTIVITY_ICON[activity.type] ?? IconArrowsExchange;
                        const { title, body } = describeActivity(t, activity);
                        return (
                          <div key={activity.id} className="flex gap-3">
                            <div className="flex shrink-0 flex-col items-center">
                              <span
                                className={cn(
                                  "flex size-7 items-center justify-center rounded-full",
                                  ACTIVITY_TONE[activity.type] ?? DEFAULT_ACTIVITY_TONE,
                                )}
                              >
                                <ActivityIcon className="size-3.5" />
                              </span>
                              {index < lead.activities.length - 1 ? (
                                <span className="bg-border my-1 w-px flex-1" />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1 pb-4.5">
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span className="text-foreground text-[13.5px] font-medium">
                                  {title}
                                </span>
                                <span className="text-muted-foreground text-[11.5px]">
                                  {formatToRelativeTime(activity.createdAt)}
                                </span>
                              </div>
                              {body ? (
                                <p className="text-muted-foreground mt-0.75 text-[13px] leading-normal">
                                  {body}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
