import {
  IconArrowsShuffle,
  IconCamera,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconCircleX,
  IconHash,
  IconLink,
  IconMessageCircle,
  IconMessages,
  IconPencil,
  IconPhone,
  IconPlus,
  IconRosetteDiscountCheck,
  IconSeeding,
  IconShieldExclamation,
  IconShieldOff,
  IconTicket,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ContactLabelOption } from "@/backend/campaign/contacts/contacts.api";
import {
  useAssignContactLabelsToContactId,
  useContactLabels,
  useEditContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import {
  useClearContactStageMutation,
  useContactStageQuery,
  usePipelineQuery,
  usePipelinesQuery,
  useSetContactStageMutation,
} from "@/backend/pipeline/pipeline.query.tsx";
import type { StageStatus } from "@/backend/pipeline/pipeline.types.ts";
import { useTeamsByUser } from "@/backend/team/team.query";
import type { ConversationTagOption } from "@/backend/whatsapp/inbox/conversationTag/conversationTag.api.ts";
import {
  useAssignConversationTags,
  useConversationTags,
} from "@/backend/whatsapp/inbox/conversationTag/conversationTag.query.ts";
import { getRowKey, type ResolutionResult } from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  useEditConversation,
  useSetContactSpam,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { resolveChannel } from "@/components/input/channelOptions.ts";
import { Button } from "@/components/ui/button.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useTeamFeatures } from "@/context/TeamFeaturesContext.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import { useContactsStore, useMessagesStore } from "@/store/inbox.store.ts";
import {
  MessagePlatform,
  NOT_SPAM_EVENT,
  TeamFeature,
  WaMessageAssignStatus,
} from "@/types/enums.ts";
import { getContactChannelSource, getContactDisplayPhone } from "@/utils/whatsapp/inbox.ts";

import { useDeleteTicket } from "../useDeleteTicket.ts";
import { generateInternalMessageId } from "../util.tsx";
import type { OptimisticMessage } from "./chatdisplayFooter/index.tsx";
import AssignUser from "./chatdisplayHeader/AssignUser.tsx";

interface TicketPanelProps {
  contact: ContactWithUpdatedAt;
  groupId: string;
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  /** Placement, owned by the parent: inline column at xl, overlay sheet below it. */
  className?: string;
}

const RESULT_LABELS: Record<ResolutionResult, string> = {
  RESOLVED: "Resolved",
  ANSWERED: "Question answered",
  NO_RESPONSE: "No response",
  DUPLICATE: "Duplicate",
};

// Channel brand colours are consumed as inline `style` values (avatar chips), so
// they stay as literal hex rather than Tailwind utilities.
const CHANNELS: Record<string, { label: string; color: string; icon: typeof IconMessageCircle }> = {
  [MessagePlatform.WHATSAPP]: {
    label: "WhatsApp",
    color: "#25d366",
    icon: IconMessageCircle,
  },
  [MessagePlatform.INSTAGRAM]: {
    label: "Instagram",
    color: "#dd2a7b",
    icon: IconCamera,
  },
  [MessagePlatform.FACEBOOK]: {
    label: "Messenger",
    color: "#0084ff",
    icon: IconMessages,
  },
  [MessagePlatform.WEBCHAT]: {
    label: "Webchat",
    color: "#1c518e",
    icon: IconMessages,
  },
};

/**
 * The lead-stage picker marks a column by what its band means — still open, won,
 * or lost — rather than by the column itself, since stage names are org-authored
 * and there is no per-stage icon to read. The column's own colour, which the org
 * does choose, paints the marker and the label.
 */
const STAGE_STATUS_ICON: Record<StageStatus, typeof IconSeeding> = {
  OPEN: IconSeeding,
  WON: IconRosetteDiscountCheck,
  LOST: IconCircleX,
};

/** Shared section shell — 18px padding plus the design's hairline divider. */
function Section({
  label,
  action,
  className,
  children,
}: {
  label?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("border-b border-border p-4.5", className)}>
      {label && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/** Label / value row used by the Contact and Ticket Info sections. */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span
        className="text-[13px] font-semibold truncate text-foreground"
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}

export default function TicketPanel({
  contact,
  isOpen,
  setIsOpen,
  className,
}: Readonly<TicketPanelProps>) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { updateContactById, setSelectedContact } = useContactsStore();
  const messagesStore = useMessagesStore();

  // The board replaces the lifecycle chips. Gated on the same check as the
  // sidebar entry — the org's Pipeline feature — so the section is simply absent
  // for orgs whose plan does not include it.
  const { allowedFeatures } = useTeamFeatures();
  const canSeePipeline = allowedFeatures === null || allowedFeatures.has(TeamFeature.Pipeline);

  const { data: pipelines = [] } = usePipelinesQuery(canSeePipeline);
  const { data: board } = usePipelineQuery(canSeePipeline ? pipelines[0]?.id : undefined);
  const { data: contactStage } = useContactStageQuery(contact?.id, canSeePipeline);
  const setStage = useSetContactStageMutation(contact?.id);
  const clearStage = useClearContactStageMutation(contact?.id);
  const [clearOpen, setClearOpen] = useState(false);
  const [stagePickerOpen, setStagePickerOpen] = useState(false);
  const stagePickerRef = useRef<HTMLDivElement>(null);
  const { data: allLabels = [] } = useContactLabels();
  const { data: allTags = [] } = useConversationTags();
  const { data: teamRes } = useTeamsByUser();
  const teams = teamRes?.data ?? [];
  const { data: waSettings } = useWaSettings();

  const editContactMutation = useEditContactMutation(undefined);
  const spamMutation = useSetContactSpam();
  const { canDelete, deleteTicket, isPending: isDeletingTicket } = useDeleteTicket(contact);
  const assignLabels = useAssignContactLabelsToContactId();
  const assignTags = useAssignConversationTags();
  const editConversation = useEditConversation();

  const [copied, setCopied] = useState(false);
  const [assignExpanded, setAssignExpanded] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingTicket, setEditingTicket] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");

  // The stage picker is an inline dropdown rather than a portalled popover, to
  // match the rest of the panel, so dismissing it is ours to wire.
  useEffect(() => {
    if (!stagePickerOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!stagePickerRef.current?.contains(event.target as Node)) setStagePickerOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStagePickerOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [stagePickerOpen]);

  // Every editor closes when the selected ticket changes.
  useEffect(() => {
    setEditingName(false);
    setEditingTicket(false);
    setLabelPickerOpen(false);
    setTagPickerOpen(false);
    setStagePickerOpen(false);
    setAssignExpanded(false);
    setCopied(false);
  }, [contact?.conversationId, contact?.id]);

  const contactLabels: ContactLabelOption[] = contact?.contactLabels ?? [];
  const activeLabelIds = contactLabels.map((l) => l.id);
  const conversationTags: ConversationTagOption[] = contact?.conversationTags ?? [];
  const activeTagIds = conversationTags.map((tag) => tag.id);
  const assignedUsers: { id: string; name: string; teamId: string }[] =
    contact?.assignedUsers ?? [];
  const primaryAssignee = assignedUsers[0];
  const teamName = teams.find((team) => team.id === primaryAssignee?.teamId)?.name;
  // A stage id with no matching column means the board changed under us; the
  // trigger then reads as "not on the board" until the stage query catches up.
  const activeStage = board?.stages.find((stage) => stage.id === contactStage?.stageId) ?? null;
  const ActiveStageIcon = STAGE_STATUS_ICON[activeStage?.status ?? "OPEN"];
  const { platform, identifier: channelIdentifier } = getContactChannelSource(contact);
  const channel = CHANNELS[platform] ?? CHANNELS[MessagePlatform.WHATSAPP];
  const ChannelIcon = channel.icon;
  // The connected number/account this ticket ran through, read off the ticket's
  // own messages. `contact.metadata` is the last webhook payload seen for the
  // *contact*, so on a multi-channel org it names whichever number they wrote to
  // last — not necessarily the one this ticket is on.
  const connectedChannel = resolveChannel(waSettings, platform, channelIdentifier);
  const displayPhone = getContactDisplayPhone(contact);
  const resolutionResult: ResolutionResult | null = contact?.resolutionResult ?? null;

  const copyTicketLink = async () => {
    const id = contact?.conversationId ?? contact?.id;
    const link = `${globalThis.location.origin}/dashboard/inbox?ticket=${id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  /**
   * Picking a column moves the contact's lead there, opening one if it has none.
   * Picking the column it is already on just closes the picker — taking the lead
   * off the board deletes it, so that lives on its own row and asks first.
   */
  const handleStageClick = (stageId: string) => {
    setStagePickerOpen(false);
    if (!contact?.id || contactStage?.stageId === stageId) return;
    // The conversation list's chip is patched by the mutation itself, which the
    // board's own move goes through too — one place, so the two directions
    // cannot drift apart.
    setStage.mutate(stageId);
  };

  const handleToggleLabel = (labelId: string) => {
    if (!contact?.id) return;
    const nextIds = activeLabelIds.includes(labelId)
      ? activeLabelIds.filter((id) => id !== labelId)
      : [...activeLabelIds, labelId];
    const nextLabels = allLabels.filter((label: { id: string }) => nextIds.includes(label.id));

    assignLabels.mutate(
      { contactId: contact.id, labelIds: nextIds },
      {
        onSuccess: () => {
          updateContactById(contact.id, (c) => ({ ...c, contactLabels: nextLabels }));
          setSelectedContact({ ...contact, contactLabels: nextLabels });
        },
      },
    );
  };

  /**
   * Tags live on the ticket, so this keys off `conversationId` rather than the
   * contact — the same customer's other tickets keep their own tag set.
   */
  const handleToggleTag = (tagId: string) => {
    const conversationId = contact?.conversationId;
    if (!conversationId) return;
    const nextIds = activeTagIds.includes(tagId)
      ? activeTagIds.filter((id) => id !== tagId)
      : [...activeTagIds, tagId];

    assignTags.mutate(
      { conversationId, tagIds: nextIds },
      {
        onSuccess: (nextTags) => {
          // The server answers with the tag set it settled on, so the row and the
          // selection are updated from that rather than from the optimistic guess.
          // Keyed by the *row*, not the contact: `updateContactById` resolves a
          // bare contact id to that contact's live ticket, which would move the
          // tags onto the wrong ticket when an older one is open.
          updateContactById(getRowKey(contact), (c) => ({ ...c, conversationTags: nextTags }));
          setSelectedContact({ ...contact, conversationTags: nextTags });
        },
      },
    );
  };

  const saveName = () => {
    const name = nameDraft.trim();
    if (!contact?.id || !name) return;
    editContactMutation.mutate(
      { contactId: contact.id, data: { name } },
      {
        onSuccess: () => {
          updateContactById(contact.id, (c) => ({ ...c, name }));
          setSelectedContact({ ...contact, name });
          setEditingName(false);
        },
      },
    );
  };

  const saveTicket = () => {
    if (!contact?.conversationId) return;
    editConversation.mutate(
      {
        conversationId: contact.conversationId,
        subject: subjectDraft.trim() || null,
        description: descriptionDraft.trim() || null,
      },
      { onSuccess: () => setEditingTicket(false) },
    );
  };

  /**
   * Spam is a *contact* flag, not a ticket status: this hits the dedicated
   * endpoint, which closes the contact's open tickets and drops them out of every
   * tab but Spam. The same button takes them back out again.
   */
  const toggleSpam = (next: boolean) => {
    if (!contact?.id) return;
    const messageId = generateInternalMessageId();
    const newMessage: OptimisticMessage = {
      id: messageId,
      contactId: contact.id,
      waCreatedAt: new Date().toISOString(),
      messageBody: {
        send: null,
        receive: null,
        internal: {
          text: { body: next ? "marked this contact as spam" : "marked this contact as not spam" },
          assignedUsers: [],
          assignStatus: next ? WaMessageAssignStatus.SPAM : NOT_SPAM_EVENT,
          triggeredByUser: { id: user?.userId ?? "", name: user?.userName ?? "" },
        },
        exchangeProcess: "internal",
      },
      sourcePlatform: "INTERNAL",
      sourceIdentifier: null,
      sendBy: user?.userId,
      sender: { name: user?.userName, profilePhoto: user?.profilePhoto },
      stats: { read: "", sent: "", failed: "", delivered: "" },
      messageId,
    };
    const rowKey = getRowKey(contact);
    messagesStore.addMessage(`${rowKey}_all`, newMessage);
    messagesStore.addMessage(`${rowKey}_internal`, newMessage);

    spamMutation.mutate(
      { contactId: contact.id, isSpam: next, messageId },
      {
        onError: () => {
          messagesStore.removeMessage(`${rowKey}_all`, messageId);
          messagesStore.removeMessage(`${rowKey}_internal`, messageId);
        },
      },
    );
  };

  // No persistent rail: the panel unmounts entirely when closed, as in the design.
  // It is reopened from the panel-right toggle in the thread header.
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "flex h-full w-77 shrink-0 flex-col overflow-y-auto border-l border-border bg-background",
        className,
      )}
    >
      {/* ---- Header ---- */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4.5">
        <div className="flex items-center gap-2 min-w-0">
          <IconTicket className="size-4 shrink-0 text-primary" />
          <span className="text-[13px] font-extrabold truncate text-foreground">
            {t("Ticket")} {contact?.ticketNumber ? `#${contact.ticketNumber}` : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            title={t("Copy link to ticket")}
            onClick={copyTicketLink}
            className={cn(
              "inline-flex items-center gap-1 cursor-pointer",
              copied ? "text-green-600" : "text-muted-foreground",
            )}
          >
            {copied ? <IconCheck className="size-3.75" /> : <IconLink className="size-3.75" />}
            {copied && <span className="text-[10px] font-bold">{t("Copied")}</span>}
          </button>
          <button
            type="button"
            title={t("Collapse Panel")}
            onClick={() => setIsOpen(false)}
            className="flex cursor-pointer"
          >
            <IconChevronRight className="size-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ---- Assignment ---- */}
      <Section
        label={t("Assignment")}
        action={
          <button
            type="button"
            onClick={() => setAssignExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer text-primary"
          >
            {assignExpanded ? t("Done") : t("Change")}
            {assignExpanded ? (
              <IconChevronUp className="size-3" />
            ) : (
              <IconChevronDown className="size-3" />
            )}
          </button>
        }
      >
        <div className="flex items-center gap-2.5">
          {primaryAssignee ? (
            <>
              <CreativeAvatar name={primaryAssignee.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold leading-tight truncate text-foreground">
                  {primaryAssignee.name}
                  {assignedUsers.length > 1 && ` +${assignedUsers.length - 1}`}
                </div>
                {teamName && (
                  <div className="text-[11px] truncate text-muted-foreground">{teamName}</div>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="size-8 rounded-full flex items-center justify-center shrink-0 border-[1.5px] border-dashed border-border">
                <IconUser className="size-3.75 text-muted-foreground" />
              </span>
              <div className="flex-1 min-w-0 text-[13px] font-semibold text-muted-foreground">
                {t("Unassigned")}
              </div>
            </>
          )}
        </div>

        {assignExpanded && (
          <div className="mt-3.5 flex flex-col gap-2">
            {/* The real multi-assignee flow — team + agent picking lives inside. */}
            <AssignUser contactId={contact?.id} variant="outline" />
            <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-muted">
              <IconArrowsShuffle className="size-3.25 shrink-0 text-muted-foreground" />
              <span className="text-[11px] leading-snug text-muted-foreground">
                {t("Assign this ticket to a team or to individual agents.")}
              </span>
            </div>
          </div>
        )}
      </Section>

      {/* ---- Title & Description ----
           Directly under Assignment, per the design: the ticket's own words are
           what an agent reads first, so they sit above the contact/meta sections
           rather than at the foot of the panel. */}
      <Section
        label={t("Title & Description")}
        action={
          !editingTicket &&
          contact?.conversationId && (
            <button
              type="button"
              title={t("Edit title and description")}
              onClick={() => {
                setSubjectDraft(contact?.ticketSubject || "");
                setDescriptionDraft(contact?.ticketDescription || "");
                setEditingTicket(true);
              }}
              className="cursor-pointer"
            >
              <IconPencil className="size-3.25 text-muted-foreground" />
            </button>
          )
        }
      >
        {editingTicket ? (
          <div className="flex flex-col gap-2">
            <Input
              value={subjectDraft}
              onChange={(e) => setSubjectDraft(e.target.value)}
              placeholder={t("Ticket title")}
              className="h-8 text-[13px] font-bold"
            />
            <Textarea
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              rows={4}
              placeholder={t("Description")}
              className="text-[13px] resize-y"
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="h-7 text-[11px]"
                onClick={saveTicket}
                disabled={editConversation.isPending}
              >
                {t("Save")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => setEditingTicket(false)}
              >
                {t("Cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-[13px] font-bold mb-1.5 text-foreground">
              {contact?.ticketSubject || t("Untitled ticket")}
            </div>
            {contact?.ticketDescription && (
              <div className="text-[13px] leading-relaxed text-foreground">
                {contact.ticketDescription}
              </div>
            )}
          </>
        )}
      </Section>

      {/* ---- Lead Stage ----
           A single compact row rather than the chip grid it replaces: the panel
           is a narrow column and a board can carry a dozen columns, which the
           grid grew to fill. The trigger reads as the current stage in that
           stage's own colour, and the picker under it is the whole board. */}
      {canSeePipeline && !!board?.stages.length && (
        <div className="border-b border-border px-4.5 py-2.75">
          <div className="flex items-center gap-2.5">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {t("Lead stage")}
            </span>

            <div ref={stagePickerRef} className="relative flex-1 min-w-0">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={stagePickerOpen}
                onClick={() => setStagePickerOpen((open) => !open)}
                disabled={setStage.isPending || clearStage.isPending}
                className="flex w-full items-center justify-between gap-1.5 rounded-[7px] border border-border bg-background px-2 py-1.25 cursor-pointer"
              >
                {activeStage ? (
                  <span
                    className="inline-flex items-center gap-1.5 min-w-0"
                    style={{ color: activeStage.color ?? "var(--color-primary)" }}
                  >
                    <ActiveStageIcon className="size-3.25 shrink-0" />
                    <span className="truncate text-[11.5px] font-bold">{activeStage.name}</span>
                  </span>
                ) : (
                  <span className="truncate text-[11.5px] font-bold text-muted-foreground">
                    {t("Not on the board")}
                  </span>
                )}
                <IconChevronDown className="size-3.25 shrink-0 text-muted-foreground" />
              </button>

              {stagePickerOpen && (
                <div
                  role="listbox"
                  className="absolute top-[calc(100%+4px)] left-0 right-0 z-40 max-h-64 overflow-y-auto overscroll-contain rounded-[9px] border border-border bg-background p-1 shadow-md"
                >
                  {board.stages.map((stage) => {
                    const active = contactStage?.stageId === stage.id;
                    const color = stage.color ?? "var(--color-primary)";
                    const StageIcon = STAGE_STATUS_ICON[stage.status];
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => handleStageClick(stage.id)}
                        className="flex w-full items-center gap-1.75 rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted"
                        style={
                          active
                            ? { backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)` }
                            : undefined
                        }
                      >
                        <StageIcon
                          className="size-3.25 shrink-0"
                          style={{ color: active ? color : "var(--color-muted-foreground)" }}
                        />
                        <span
                          className={cn(
                            "flex-1 truncate text-left text-[12px]",
                            active ? "font-bold" : "font-semibold",
                          )}
                          style={{ color: active ? color : undefined }}
                        >
                          {stage.name}
                        </span>
                        {active && <IconCheck className="size-3.25 shrink-0 text-primary" />}
                      </button>
                    );
                  })}

                  {/* Taking the lead off the board is not a stage, and it deletes
                      the lead, so it sits apart from the columns and confirms. */}
                  {contactStage?.stageId && (
                    <>
                      <div className="my-1 h-px bg-border" />
                      <button
                        type="button"
                        onClick={() => {
                          setStagePickerOpen(false);
                          setClearOpen(true);
                        }}
                        className="flex w-full items-center gap-1.75 rounded-md px-2 py-1.5 cursor-pointer text-destructive hover:bg-destructive/10"
                      >
                        <IconTrash className="size-3.25 shrink-0" />
                        <span className="flex-1 truncate text-left text-[12px] font-semibold">
                          {t("Remove from the board")}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Conversation Tags ----
           Ticket-grained, so they sit directly above the contact-grained labels
           and the two are named apart on screen: a tag describes *this* ticket,
           a label describes the customer. */}
      {contact?.conversationId && (
        <Section label={t("Conversation Tags")}>
          <div className="flex flex-wrap gap-1.5">
            {conversationTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border max-w-full"
                style={{ borderColor: tag.color ?? undefined, color: tag.color ?? undefined }}
              >
                <IconHash className="size-2.5 shrink-0" />
                <span className="truncate">{tag.name}</span>
                <button
                  type="button"
                  aria-label={t("Remove tag")}
                  onClick={() => handleToggleTag(tag.id)}
                  disabled={assignTags.isPending}
                  className="cursor-pointer shrink-0"
                >
                  <IconX className="size-2.75" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setTagPickerOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full cursor-pointer border border-dashed border-border text-muted-foreground"
            >
              <IconPlus className="size-2.75" />
              {t("Add")}
            </button>
          </div>

          {tagPickerOpen &&
            (allTags.length === 0 ? (
              <p className="mt-2 text-[12px] text-muted-foreground">
                {t("No conversation tags yet — create them in Inbox Settings.")}
              </p>
            ) : (
              <div className="mt-2 p-1.5 rounded-[10px] max-h-56 overflow-y-auto overscroll-contain border border-border bg-background shadow-sm">
                {allTags.map((tag) => {
                  const checked = activeTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      disabled={assignTags.isPending}
                      className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md cursor-pointer hover:bg-primary/10"
                    >
                      <span
                        className={cn(
                          "size-3.75 rounded shrink-0 flex items-center justify-center border-[1.5px]",
                          checked ? "bg-primary border-primary" : "border-border",
                        )}
                      >
                        {checked && <IconCheck className="size-2.75 text-primary-foreground" />}
                      </span>
                      <IconHash
                        className="size-3 shrink-0"
                        style={{ color: tag.color ?? undefined }}
                      />
                      <span className="text-[13px] truncate text-foreground">{tag.name}</span>
                    </button>
                  );
                })}
              </div>
            ))}
        </Section>
      )}

      {/* ---- Contact Labels ---- */}
      <Section label={t("Contact Labels")}>
        <div className="flex flex-wrap gap-1.5">
          {contactLabels.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full max-w-full"
              style={{ background: `${label.color}1a`, color: label.color }}
            >
              <span className="truncate">{label.name}</span>
              <button
                type="button"
                aria-label={t("Remove label")}
                onClick={() => handleToggleLabel(label.id)}
                className="cursor-pointer shrink-0"
              >
                <IconX className="size-2.75" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setLabelPickerOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full cursor-pointer border border-dashed border-border text-muted-foreground"
          >
            <IconPlus className="size-2.75" />
            {t("Add")}
          </button>
        </div>

        {labelPickerOpen && (
          <div className="mt-2 p-1.5 rounded-[10px] max-h-56 overflow-y-auto border border-border bg-background shadow-sm">
            {allLabels.map((label: { id: string; name?: string; color?: string }) => {
              const checked = activeLabelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => handleToggleLabel(label.id)}
                  className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md cursor-pointer hover:bg-primary/10"
                >
                  <span
                    className={cn(
                      "size-3.75 rounded shrink-0 flex items-center justify-center border-[1.5px]",
                      checked ? "bg-primary border-primary" : "border-border",
                    )}
                  >
                    {checked && <IconCheck className="size-2.75 text-primary-foreground" />}
                  </span>
                  <span
                    className="size-2.25 rounded-full shrink-0"
                    style={{ background: label.color }}
                  />
                  <span className="text-[13px] truncate text-foreground">{label.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* ---- Contact ---- */}
      <Section label={t("Contact")}>
        <div className="flex flex-col gap-2.5">
          {editingName ? (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-muted-foreground">{t("Name")}</span>
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="h-8 text-[13px]"
              />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 text-[11px]" onClick={saveName}>
                  {t("Save")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => setEditingName(false)}
                >
                  {t("Cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5">
              <IconUser className="size-3.75 mt-px shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-muted-foreground">{t("Name")}</div>
                <div className="text-[13px] font-semibold truncate text-foreground">
                  {contact?.name || contact?.whatsappUserName || "—"}
                </div>
              </div>
              <button
                type="button"
                title={t("Edit name")}
                onClick={() => {
                  setNameDraft(contact?.name || "");
                  setEditingName(true);
                }}
                className="mt-0.5 cursor-pointer shrink-0"
              >
                <IconPencil className="size-3.25 text-muted-foreground" />
              </button>
            </div>
          )}

          {displayPhone && (
            <div className="flex items-start gap-2.5">
              <IconPhone className="size-3.75 mt-px shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">{t("Phone")}</div>
                <div className="text-[13px] font-semibold truncate text-foreground">
                  {displayPhone}
                </div>
              </div>
            </div>
          )}

          {contact?.createdAt && (
            <InfoRow
              label={t("Customer since")}
              value={dayjs(contact.createdAt).format("MMM YYYY")}
            />
          )}
          <InfoRow label={t("Consent")} value={contact?.consent ? t("Given") : t("Not given")} />
        </div>
      </Section>

      {/* ---- Ticket Info ---- */}
      <Section label={t("Ticket Info")}>
        <div className="flex flex-col gap-2.5">
          <InfoRow
            label={t("Channel")}
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-4 rounded-[5px] flex items-center justify-center shrink-0"
                  style={{ background: channel.color }}
                >
                  <ChannelIcon className="size-2.5 text-white" />
                </span>
                {channel.label}
              </span>
            }
          />
          {connectedChannel && (
            <InfoRow
              label={t("Account")}
              value={
                <span className="inline-flex items-center gap-1.5">
                  {[connectedChannel.label, connectedChannel.account].filter(Boolean).join(" · ")}
                  {!connectedChannel.isConnected && (
                    <span className="text-[11px] text-muted-foreground">
                      ({t("no longer connected")})
                    </span>
                  )}
                </span>
              }
            />
          )}
          {contact?.ticketCreatedAt && (
            <InfoRow
              label={t("Created")}
              value={dayjs(contact.ticketCreatedAt).format("MMM D, YYYY")}
            />
          )}
          {resolutionResult && (
            <InfoRow
              label={t("Result")}
              value={
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-0.5 rounded-full text-green-600 bg-green-600/10">
                  {t(RESULT_LABELS[resolutionResult] ?? resolutionResult)}
                </span>
              }
            />
          )}
        </div>
      </Section>

      {/* ---- Board ticket / spam (contact-level, so it toggles both ways) ---- */}
      <div className="flex flex-col gap-2 p-4.5">
        <Button
          type="button"
          onClick={() => toggleSpam(!contact?.isSpam)}
          disabled={spamMutation.isPending}
          variant={contact?.isSpam ? "outline" : "destructive"}
        >
          {contact?.isSpam ? (
            <IconShieldOff className="size-3.75" />
          ) : (
            <IconShieldExclamation className="size-3.75" />
          )}
          {contact?.isSpam ? t("Not spam") : t("Mark contact as spam")}
        </Button>

        {/* Deleting is ticket-grained, unlike spam above it: it takes this one
            ticket and its messages and leaves the contact alone. Admin-only,
            matching the endpoint's own gate. */}
        {canDelete && (
          <Button
            type="button"
            variant="outline"
            onClick={() => deleteTicket()}
            disabled={isDeletingTicket}
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <IconTrash className="size-3.75" />
            {t("Delete conversation")}
          </Button>
        )}
      </div>

      {/* Removing a contact from the board deletes the lead, and with it every
          note, task and timeline entry on that deal. The confirmation is the only
          guard, so it names what goes rather than asking a generic "are you sure". */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Remove from the board?")}</DialogTitle>
            <DialogDescription>
              {contactStage?.loss && (
                <>
                  {t(
                    "This deletes the lead and cannot be undone: {{notes}} note(s), {{tasks}} task(s), {{activities}} timeline entr(y/ies) and {{assignees}} assignee(s) go with it.",
                    contactStage.loss,
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t("Cancel")}</DialogClose>
            <Button
              variant="destructive"
              disabled={clearStage.isPending}
              onClick={() =>
                clearStage.mutate(undefined, {
                  onSuccess: () => setClearOpen(false),
                })
              }
            >
              {clearStage.isPending ? t("Removing...") : t("Remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
