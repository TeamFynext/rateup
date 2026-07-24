import dayjs from "dayjs";
import {
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Link2,
  MessageCircle,
  MessagesSquare,
  Pencil,
  Phone,
  Plus,
  ShieldAlert,
  ShieldOff,
  Shuffle,
  Ticket,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useAssignContactLabelsToContactId,
  useContactLabels,
  useEditContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { getRowKey, type ResolutionResult } from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  useEditConversation,
  useSetContactSpam,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useContactsStore, useMessagesStore } from "@/components/dashboard/inbox/store.ts";
import { Button } from "@/components/ui/button.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useLifecycleContext } from "@/context/LifecycleContext.ts";
import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";
import { MessagePlatform, NOT_SPAM_EVENT, WaMessageAssignStatus } from "@/types/enums.ts";
import { getContactPlatform } from "@/utils/whatsapp/inbox.ts";

import { generateInternalMessageId } from "../util.tsx";
import AssignUser from "./chatdisplayHeader/AssignUser.tsx";

interface TicketPanelProps {
  contact: any;
  groupId: string;
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

const RESULT_LABELS: Record<ResolutionResult, string> = {
  RESOLVED: "Resolved",
  ANSWERED: "Question answered",
  NO_RESPONSE: "No response",
  DUPLICATE: "Duplicate",
};

// Channel brand colours are consumed as inline `style` values (avatar chips), so
// they stay as literal hex rather than Tailwind utilities.
const CHANNELS: Record<string, { label: string; color: string; icon: typeof MessageCircle }> = {
  [MessagePlatform.WHATSAPP]: {
    label: "WhatsApp",
    color: "#25d366",
    icon: MessageCircle,
  },
  [MessagePlatform.INSTAGRAM]: {
    label: "Instagram",
    color: "#dd2a7b",
    icon: Camera,
  },
  [MessagePlatform.FACEBOOK]: {
    label: "Messenger",
    color: "#0084ff",
    icon: MessagesSquare,
  },
  [MessagePlatform.WEBCHAT]: {
    label: "Webchat",
    color: "#1c518e",
    icon: MessagesSquare,
  },
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

export default function TicketPanel({ contact, isOpen, setIsOpen }: Readonly<TicketPanelProps>) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { updateContactById, setSelectedContact } = useContactsStore();
  const messagesStore = useMessagesStore();

  const lifecycles = useLifecycleContext() as
    | { id: string; name: string; emoji: string; category: string }[]
    | undefined;
  const { data: allLabels = [] } = useContactLabels();
  const { data: teamRes } = useTeamsByUser();
  const teams = teamRes?.data ?? [];

  const editContactMutation = useEditContactMutation(null);
  const spamMutation = useSetContactSpam();
  const assignLabels = useAssignContactLabelsToContactId();
  const editConversation = useEditConversation();

  const [copied, setCopied] = useState(false);
  const [assignExpanded, setAssignExpanded] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingTicket, setEditingTicket] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");

  // Every editor closes when the selected ticket changes.
  useEffect(() => {
    setEditingName(false);
    setEditingTicket(false);
    setLabelPickerOpen(false);
    setAssignExpanded(false);
    setCopied(false);
  }, [contact?.conversationId, contact?.id]);

  const contactLabels: { id: string; name: string; color: string }[] = contact?.contactLabels ?? [];
  const activeLabelIds = contactLabels.map((l) => l.id);
  const assignedUsers: { id: string; name: string; teamId: string }[] =
    contact?.assignedUsers ?? [];
  const primaryAssignee = assignedUsers[0];
  const teamName = teams.find((team) => team.id === primaryAssignee?.teamId)?.name;
  const platform = getContactPlatform(contact);
  const channel = CHANNELS[platform] ?? CHANNELS[MessagePlatform.WHATSAPP];
  const ChannelIcon = channel.icon;
  const account = contact?.metadata?.display_phone_number;
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

  const handleLifecycleChange = (lifecycle: { id: string; name: string; emoji: string }) => {
    if (!contact?.id || contact?.lifecycleId === lifecycle.id) return;
    editContactMutation.mutate(
      { contactId: contact.id, data: { lifecycleId: lifecycle.id } },
      {
        onSuccess: () => {
          updateContactById(contact.id, (c) => ({
            ...c,
            lifecycleId: lifecycle.id,
            lifecycleName: `${lifecycle.emoji} ${lifecycle.name}`,
          }));
        },
      },
    );
  };

  const handleToggleLabel = (labelId: string) => {
    if (!contact?.id) return;
    const nextIds = activeLabelIds.includes(labelId)
      ? activeLabelIds.filter((id) => id !== labelId)
      : [...activeLabelIds, labelId];
    const nextLabels = allLabels.filter((label) => nextIds.includes(label.id));

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
    const newMessage = {
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
          triggeredByUser: { id: user.userId, name: user.userName },
        },
        exchangeProcess: "internal",
      },
      sourcePlatform: "INTERNAL",
      sourceIdentifier: null,
      sendBy: user.userId,
      sender: { name: user.userName, profilePhoto: user?.profilePhoto },
      stats: { read: "", sent: "", failed: "", delivered: "" },
      messageId,
    };
    const rowKey = getRowKey(contact);
    messagesStore.addMessage(`${rowKey}_all`, newMessage as any);
    messagesStore.addMessage(`${rowKey}_internal`, newMessage as any);

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
    <div className="w-77 shrink-0 flex flex-col overflow-y-auto h-full border-l border-border bg-background">
      {/* ---- Header ---- */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4.5">
        <div className="flex items-center gap-2 min-w-0">
          <Ticket className="size-4 shrink-0 text-primary" />
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
            {copied ? <Check className="size-3.75" /> : <Link2 className="size-3.75" />}
            {copied && <span className="text-[10px] font-bold">{t("Copied")}</span>}
          </button>
          <button
            type="button"
            title={t("Collapse Panel")}
            onClick={() => setIsOpen(false)}
            className="flex cursor-pointer"
          >
            <ChevronRight className="size-4 text-muted-foreground" />
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
            {assignExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
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
                <User className="size-3.75 text-muted-foreground" />
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
              <Shuffle className="size-3.25 shrink-0 text-muted-foreground" />
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
              <Pencil className="size-3.25 text-muted-foreground" />
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

      {/* ---- Lifecycle Stage ---- */}
      {!!lifecycles?.length && (
        <Section label={t("Lifecycle Stage")}>
          <div className="grid grid-cols-2 gap-2">
            {lifecycles.map((lifecycle) => {
              const active = contact?.lifecycleId === lifecycle.id;
              return (
                <button
                  key={lifecycle.id}
                  type="button"
                  onClick={() => handleLifecycleChange(lifecycle)}
                  disabled={editContactMutation.isPending}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full cursor-pointer min-w-0 border-[1.5px]",
                    active ? "border-primary bg-primary/10" : "border-border",
                  )}
                >
                  <span className="text-[13px] leading-none shrink-0" role="img">
                    {lifecycle.emoji}
                  </span>
                  <span
                    className={cn(
                      "text-[12px] font-bold truncate",
                      active ? "text-primary" : "text-foreground",
                    )}
                  >
                    {lifecycle.name}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* ---- Labels ---- */}
      <Section label={t("Labels")}>
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
                <X className="size-2.75" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setLabelPickerOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full cursor-pointer border border-dashed border-border text-muted-foreground"
          >
            <Plus className="size-2.75" />
            {t("Add")}
          </button>
        </div>

        {labelPickerOpen && (
          <div className="mt-2 p-1.5 rounded-[10px] max-h-56 overflow-y-auto border border-border bg-background shadow-sm">
            {allLabels.map((label) => {
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
                    {checked && <Check className="size-2.75 text-primary-foreground" />}
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
              <User className="size-3.75 mt-px shrink-0 text-muted-foreground" />
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
                <Pencil className="size-3.25 text-muted-foreground" />
              </button>
            </div>
          )}

          {contact?.phone && (
            <div className="flex items-start gap-2.5">
              <Phone className="size-3.75 mt-px shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">{t("Phone")}</div>
                <div className="text-[13px] font-semibold truncate text-foreground">
                  {contact.phone}
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
          {account && <InfoRow label={t("Account")} value={account} />}
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
            <ShieldOff className="size-3.75" />
          ) : (
            <ShieldAlert className="size-3.75" />
          )}
          {contact?.isSpam ? t("Not spam") : t("Mark contact as spam")}
        </Button>
      </div>
    </div>
  );
}
