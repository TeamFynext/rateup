import {
  IconArrowBackUp,
  IconArrowsExchange,
  IconCircleCheck,
  IconCircleX,
  IconDots,
  IconLink,
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
import { toast } from "sonner";

import { useLeadQuery, useReopenLeadMutation } from "@/backend/pipeline/pipeline.query.tsx";
import type {
  Lead,
  LeadActivity,
  PipelineDetail,
  PipelineStage,
  PipelineUser,
} from "@/backend/pipeline/pipeline.types.ts";
import { useUserInfo } from "@/backend/user/user.query.tsx";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appInfo } from "@/config/appInfo.ts";
import { cn } from "@/lib/utils";
import { formatToRelativeTime } from "@/utils/dateTime.ts";

import { channelLabel, sourceLabel } from "../pipeline.labels.ts";
import { usePipelineTypeConfig } from "../pipelineTypes.ts";
import { FieldLabel } from "../shared/atoms.tsx";
import { LeadAvatar } from "../shared/LeadAvatar.tsx";
import { LeadAssigneePicker } from "./LeadAssigneePicker.tsx";
import { LeadNotes } from "./LeadNotes.tsx";
import { LeadStageStepper } from "./LeadStageStepper.tsx";
import { NextActivityPanel } from "./NextActivityPanel.tsx";
import { useDeleteLeads } from "./useDeleteLeads.ts";
import { CardContact, CardDescription, CardDueDate } from "./WorkCardFields.tsx";

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
 * Fields sit beside Notes/Activity tabs so the fields never hide behind a tab;
 * the Notes tab names the latest activity, so "what happened last?" needs no
 * switch. Side by side from `lg` up, each column scrolls on its own; below that
 * they stack in one scroll, which is also the whole layout on a phone.
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
  // Keyed to the lead so opening the next one starts back on Notes.
  const [tabState, setTabState] = useState<{ leadId?: string; tab: string }>({ tab: "notes" });
  const tab = tabState.leadId === leadId ? tabState.tab : "notes";
  const setTab = (next: string) => setTabState({ leadId, tab: next });
  const { data: lead, isPending } = useLeadQuery(leadId);
  const { data: userInfo } = useUserInfo();
  const currentUserId =
    userInfo && "data" in userInfo ? (userInfo.data as UserData).userId : undefined;
  const reopenLead = useReopenLeadMutation();
  const { canDelete, deleteLead } = useDeleteLeads();
  const typeConfig = usePipelineTypeConfig(pipeline);

  const TypeIcon = typeConfig.icon;

  // A phone gets the system share sheet; a desktop, the clipboard.
  const shareLead = async (shortUrlId: string) => {
    const url = `${appInfo.websiteDomain}/pl/${shortUrlId}`;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ title: lead?.name, url }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("Link copied"), { id: "pipeline-lead-share" });
    } catch {
      toast.error(t("Could not copy the link"), { id: "pipeline-lead-share" });
    }
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
            <div className="border-border flex shrink-0 items-center gap-3 border-b px-6 py-4">
              {typeConfig.cardIsCustomer ? (
                <LeadAvatar name={lead.name} channel={lead.channel} size="xl" />
              ) : (
                <span className="bg-muted text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-xl">
                  <TypeIcon className="size-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <DialogTitle className="font-display truncate text-xl leading-tight font-bold tracking-[-0.01em]">
                  {lead.name}
                </DialogTitle>
                <DialogDescription className="mt-0.5 truncate text-sm">
                  {!typeConfig.cardIsCustomer
                    ? (lead.contact?.name ?? typeConfig.cardHeading)
                    : [
                        lead.channel === "NONE" ? null : channelLabel(t, lead.channel),
                        lead.phone,
                        lead.company,
                      ]
                        .filter(Boolean)
                        .join(" · ") ||
                      (typeConfig.features.source ? sourceLabel(t, lead.source) : null)}
                </DialogDescription>
              </div>

              {/* Labels drop below `sm` so the name keeps room on a phone; the
                  aria-labels carry them there. */}
              <div className="flex shrink-0 items-center gap-1.5">
                {typeConfig.cardIsCustomer || lead.contactId ? (
                  <Button
                    size="sm"
                    className="h-9 gap-1.5 text-xs"
                    onClick={() => onOpenConversation(lead)}
                    disabled={!lead.contactId}
                    aria-label={t("Open conversation")}
                  >
                    <IconMessage2 className="size-3.5" />
                    <span className="hidden sm:inline">{t("Open conversation")}</span>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 text-xs font-medium text-green-700 dark:text-green-500"
                  onClick={() => onMarkWon(lead)}
                  disabled={lead.status === "WON"}
                  aria-label={typeConfig.wonLabel}
                >
                  <IconCircleCheck className="size-3.5" />
                  <span className="hidden sm:inline">{typeConfig.wonLabel}</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:bg-muted h-9 gap-1.5 text-xs font-medium"
                  onClick={() => onMarkLost(lead)}
                  disabled={lead.status === "LOST"}
                  aria-label={typeConfig.lostLabel}
                >
                  <IconCircleX className="size-3.5" />
                  <span className="hidden sm:inline">{typeConfig.lostLabel}</span>
                </Button>

                {lead.shortUrlId ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground size-9"
                    onClick={() => lead.shortUrlId && void shareLead(lead.shortUrlId)}
                    aria-label={t("Copy link to this card")}
                    title={t("Copy link to this card")}
                  >
                    <IconLink className="size-4.5" />
                  </Button>
                ) : null}

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
                      {typeConfig.type === "LEADS" ? t("Reopen lead") : t("Reopen")}
                    </DropdownMenuItem>
                    {canDelete && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => void deleteLead(lead, onClose)}
                      >
                        <IconTrash />
                        {typeConfig.type === "LEADS" ? t("Delete lead") : t("Delete")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DialogClose
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground size-9"
                      aria-label={t("Close")}
                    >
                      <IconX className="size-4.5" />
                    </Button>
                  }
                />
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
                {typeConfig.cardIsCustomer ? null : <CardDescription lead={lead} />}
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
                    ...(typeConfig.features.source
                      ? [
                          { key: "source", label: t("Source"), value: sourceLabel(t, lead.source) },
                          {
                            key: "channel",
                            label: t("Channel"),
                            value: channelLabel(t, lead.channel),
                          },
                        ]
                      : []),
                    ...(typeConfig.features.forecast
                      ? [
                          {
                            key: "expectedClose",
                            label: t("Expected close"),
                            value: lead.expectedCloseAt
                              ? dayjs(lead.expectedCloseAt).format("D MMM YYYY")
                              : t("Not set"),
                          },
                        ]
                      : []),
                    ...(typeConfig.cardIsCustomer
                      ? [
                          {
                            // `contactId` is the link; the name is just how it reads.
                            key: "contact",
                            label: t("Contact"),
                            value: lead.contact?.name ?? t("Not linked"),
                            tone: lead.contactId ? undefined : "text-amber-700 dark:text-amber-500",
                          },
                        ]
                      : []),
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
                  {typeConfig.cardIsCustomer ? null : (
                    <>
                      <CardDueDate lead={lead} />
                      <CardContact lead={lead} />
                    </>
                  )}
                </div>

                <NextActivityPanel lead={lead} />
              </div>

              <Tabs
                value={tab}
                onValueChange={(value) => setTab(String(value))}
                className="min-h-0 flex-1 gap-0 lg:overflow-hidden"
              >
                <div className="border-border shrink-0 border-b px-6">
                  <TabsList variant="line" className="h-11">
                    <TabsTrigger value="notes">
                      {t("Notes ({total})", { total: lead.notes.length })}
                    </TabsTrigger>
                    <TabsTrigger value="activity">{t("Activity")}</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="notes" className="min-h-0 px-6 pt-4 pb-6 lg:overflow-y-auto">
                  {lead.activities[0] ? (
                    <button
                      type="button"
                      onClick={() => setTab("activity")}
                      className="text-muted-foreground hover:text-foreground mb-3 flex w-full min-w-0 items-center gap-1.5 text-left text-xs"
                    >
                      <span className="shrink-0 font-semibold">{t("Last activity")}</span>
                      <span className="truncate">
                        {describeActivity(t, lead.activities[0]).title} ·{" "}
                        {formatToRelativeTime(lead.activities[0].createdAt)}
                      </span>
                    </button>
                  ) : null}
                  <LeadNotes
                    key={lead.id}
                    leadId={lead.id}
                    notes={lead.notes}
                    currentUserId={currentUserId}
                  />
                </TabsContent>

                <TabsContent value="activity" className="min-h-0 px-6 pt-5 pb-6 lg:overflow-y-auto">
                  <div>
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
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
