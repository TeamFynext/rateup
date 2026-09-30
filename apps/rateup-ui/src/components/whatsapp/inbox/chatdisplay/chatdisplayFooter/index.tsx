import {
  IconBan,
  IconBolt,
  IconExclamationCircle,
  IconMessage,
  IconMessagePlus,
  IconNote,
  IconSend,
  IconShieldExclamation,
  IconUserCheck,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { create } from "zustand";

import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useConversationLimit } from "@/backend/stats/stats.query";
import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  useAssignOwner,
  useCreatePrivateMessage,
  useSendNewWaMessage,
  useSetContactSpam,
  useUnBlockWhatsAppUser,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import { whatsappKeys } from "@/backend/whatsapp/whatsapp.keys";
import { useVoiceRecordStore } from "@/components/input/VoiceRecorder.tsx";
import {
  extractMentionUserIds,
  parseToWhatsAppFormat,
} from "@/components/RichTextEditor/wa-editor/format.tsx";
import type { TiptapNode } from "@/components/RichTextEditor/wa-editor/format.tsx";
import WaTextEditor from "@/components/RichTextEditor/waTextEditor.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button, buttonVariants } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import AssigneePicker from "@/components/whatsapp/inbox/assign/AssigneePicker.tsx";
import { buildAssignEvent } from "@/components/whatsapp/inbox/assign/assignEvent.ts";
import { useConfirm } from "@/context/confirm-provider.tsx";
import type { User } from "@/context/UserContext.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import useContactStore, { useContactsStore, useMessagesStore } from "@/store/inbox.store.ts";
import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import { formatDateWithRelativeTime } from "@/utils/dateTime.ts";
import { deleteUploadedFiles } from "@/utils/file-upload/upload.ts";
import {
  getContactPlatform,
  isInboxSessionExpired,
  returnMessageContentBasedOnParsedMessage,
} from "@/utils/whatsapp/inbox.ts";

import { usePhoneIdStore } from "../../chatselect/accountSelectorStore.ts";
import { generateInternalMessageId } from "../../util.tsx";
import { isTicketClosed } from "../chatdisplayHeader/ticket.ts";
import { type ComposerTab, useComposerTabStore } from "./composerTabStore.ts";
import WaInboxFooterMenu from "./footerMenu/index.tsx";

// Mirrors WaTextEditor's default CharacterCount limit so the footer count and the
// editor's own hard limit stay in lock-step.
const MESSAGE_CHAR_LIMIT = 1024;

// The editor writes its content back as a ProseMirror JSON doc (editor.getJSON()),
// so we count characters by summing the text nodes — this matches tiptap's
// CharacterCount.characters() (doc.textContent length) without needing the editor ref.
function countEditorCharacters(content: unknown): number {
  if (!content) return 0;
  if (typeof content === "string") return content.length;
  let count = 0;
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const { type, text, content: children } = node as TiptapNode;
    if (type === "text" && typeof text === "string") count += text.length;
    if (Array.isArray(children)) children.forEach(walk);
  };
  walk(content);
  return count;
}

function FooterCharacterCount({ body, max }: { body: { text?: { body?: unknown } }; max: number }) {
  const count = countEditorCharacters(body?.text?.body);
  const atLimit = count >= max;
  return (
    <Badge
      variant={atLimit ? "destructive" : "outline"}
      className="px-1.5 py-0 text-[10px] whitespace-nowrap tabular-nums sm:text-xs"
    >
      {count} / {max}
    </Badge>
  );
}

export default function WaInboxChatDisplayFooter({
  contact,
}: Readonly<{
  contact: ContactWithUpdatedAt;
}>) {
  const { activeTab, setActiveTab } = useComposerTabStore();
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);

  const submiRef = useRef<(() => void) | null>(null);
  const { t: translations } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const {
    isExceeded: conversationLimitReached,
    used: conversationsUsed,
    limit: conversationLimit,
    isAnnual: isAnnualConversationLimit,
  } = useConversationLimit();
  const { whatsappSettingsPhoneId } = usePhoneIdStore();
  const currentUser = contact.assignedUsers?.find((c) => c.id === user?.userId);
  const platform = getContactPlatform(contact);
  const sendnewWaMessage = useSendNewWaMessage(
    contact.id,
    currentUser?.teamId,
    whatsappSettingsPhoneId,
    platform,
    getRowKey(contact),
  );
  const createPrivateMessage = useCreatePrivateMessage(contact.id);
  const { media, resetMedia } = useMediaStore();
  const { isRecording, audioUrl, setAudioUrl } = useVoiceRecordStore();
  const { body, setBody, resetBody } = useMessageBodyStore();
  const { updateContactById } = useContactsStore();
  const messagesStore = useMessagesStore();
  const { data: orgMembers } = useTeamsMembersOfOrg();
  // Teammates available to @-mention in a private note.
  const mentionUsers = useMemo(
    () => (orgMembers?.data ?? []).map((m) => ({ id: m.id, name: m.name })),
    [orgMembers],
  );

  // Mentioning a teammate means the words are for the team, so the draft becomes a
  // note. Only a mention *added* in message mode switches: an agent who switches back
  // by hand keeps their choice.
  const mentionCountRef = useRef(0);
  const [switchedByMention, setSwitchedByMention] = useState(false);
  function handleDraftChange(value: TiptapNode) {
    setBody({ ...body, text: { ...body.text, body: value } });
    const mentions = extractMentionUserIds(value).length;
    // Read from the store: the editor may still hold the callback from an earlier render.
    if (
      mentions > mentionCountRef.current &&
      useComposerTabStore.getState().activeTab === "message"
    ) {
      setActiveTab("private");
      setSwitchedByMention(true);
    }
    mentionCountRef.current = mentions;
  }
  function chooseTab(tab: ComposerTab) {
    setActiveTab(tab);
    setSwitchedByMention(false);
  }

  useEffect(() => {
    if (body.type === "location" && body.location) {
      handleSendMessage();
    }
  }, [body]);

  useEffect(() => {
    if (audioUrl) {
      setBody({
        ...body,
        media: [{ url: audioUrl, type: "audio", name: "voice-note" }],
        type: "media",
        text: {
          body: "",
        },
      });
    }
  }, [audioUrl]);

  const isTextValid =
    body.text?.body !== "" && parseToWhatsAppFormat(body.text?.body || "").trim().length > 0;
  const charCount = countEditorCharacters(body.text?.body);
  const isOverCharLimit = charCount >= MESSAGE_CHAR_LIMIT;

  function handleSendMessage() {
    if (conversationLimitReached) {
      toast.error(
        translations("Conversation limit reached. Upgrade your plan to send more messages."),
      );
      return;
    }
    const currentType =
      media.length || body.media?.length
        ? body.text?.body === "" || parseToWhatsAppFormat(body.text?.body || "").trim().length === 0
          ? "media"
          : "text"
        : body.type;

    if (
      currentType === "text" &&
      (!body.text?.body || parseToWhatsAppFormat(body.text.body).trim().length === 0)
    ) {
      return;
    }
    if (currentType === "media" && !media.length && !body.media?.length) {
      return;
    }
    if (
      currentType === "contact" &&
      !body.contacts?.contactIds?.length &&
      !body.contacts?.groupIds?.length
    ) {
      return;
    }
    if (!whatsappSettingsPhoneId && platform !== MessagePlatform.WEBCHAT) {
      toast.error("Select a account to send the message");
      return;
    }
    const values = {
      type: currentType,
      text: body.text,
      media: media.length ? media : body.media || [],
      contacts: body.contacts,
      location: body.location,
    };
    resetBody();
    resetMedia();
    setAudioUrl(null);
    sendnewWaMessage.mutate({
      ...values,
      // Drawn in the thread from onMutate until the sent message is read back.
      pending: {
        kind: "message",
        body: {
          text: values.text.body,
          ...(values.media?.length
            ? {
                url: values.media[0].url,
                urlType: values.media[0].type,
                filename: values.media[0].name,
              }
            : {}),
        },
      },
    });
    updateContactById(contact.id, (contact) => ({
      ...contact,
      lastMessage: {
        messageBody: {
          send:
            platform === MessagePlatform.INSTAGRAM
              ? {
                  recipient: {
                    id: contact.igsId,
                  },
                  message:
                    values.type === "text"
                      ? { text: parseToWhatsAppFormat(values.text.body) }
                      : values.type === "media"
                        ? {
                            attachment: {
                              type: values.media[values.media.length - 1].type,
                            },
                          }
                        : {},
                }
              : {
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: contact.phone,
                  type: "text",
                  text: {
                    body:
                      values.type === "text"
                        ? parseToWhatsAppFormat(values.text.body)
                        : values.type === "media"
                          ? returnMessageContentBasedOnParsedMessage(
                              {
                                messageType: values.media[values.media.length - 1].type,
                                messageContent: "",
                                timeStamp: dayjs().unix().toString(),
                              },
                              "send",
                            )
                          : "",
                  },
                },
          exchangeProcess: "send",
          receive: undefined,
        },
        waCreatedAt: new Date().toISOString(),
        sourceIdentifier: whatsappSettingsPhoneId,
        sourcePlatform: platform,
      },
    }));
  }
  function handleSendPrivateMessage() {
    const text = body.text?.body;
    if (!text || parseToWhatsAppFormat(text).trim().length === 0) return;
    const mentionedUserIds = extractMentionUserIds(text);
    // A note is text only: whatever the reply has staged stays staged.
    setBody({ ...body, text: { body: "" } });
    setSwitchedByMention(false);
    mentionCountRef.current = 0;

    const id = generateInternalMessageId();
    const placeholder: OptimisticMessage = {
      id,
      messageId: id,
      kind: "NOTE",
      contactId: contact.id,
      conversationId: contact.conversationId ?? null,
      waCreatedAt: new Date().toISOString(),
      messageBody: {
        exchangeProcess: "privateNote",
        privateNote: {
          text: { body: parseToWhatsAppFormat(text) },
          mentionedUser: mentionUsers.filter((u) => mentionedUserIds.includes(u.id)),
          triggeredByUser: { id: user?.userId ?? "", name: user?.userName ?? "" },
        },
      },
      sourcePlatform: "INTERNAL",
      sourceIdentifier: "internal",
      sendBy: user?.userId,
      sender: { name: user?.userName, profilePhoto: user?.profilePhoto },
      stats: { read: "", sent: "", failed: "", delivered: "" },
    };
    const keys = [`${getRowKey(contact)}_all`, `${getRowKey(contact)}_internal`];
    keys.forEach((key) => messagesStore.addMessage(key, placeholder));

    createPrivateMessage.mutate(
      {
        text: { body: text },
        messageId: id,
        conversationId: contact.conversationId,
        mentionedUserIds,
      },
      {
        // The server's note echoes the placeholder's id as its messageId.
        onSuccess: (note) =>
          keys.forEach((key) => {
            messagesStore.removeMessage(key, id);
            messagesStore.mergeMessages(key, [note]);
          }),
        onError: (error) => {
          keys.forEach((key) => messagesStore.removeMessage(key, id));
          toast.error(getApiErrorMessage(error, "The note wasn't saved."));
        },
      },
    );
  }

  const isSessionExpired =
    platform !== MessagePlatform.WEBCHAT &&
    isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp);
  // Past the 24h window only a template reaches the customer; a note still works.
  const isNoteMode = activeTab === "private" || isSessionExpired;
  submiRef.current = () => {
    if (isNoteMode) handleSendPrivateMessage();
    else handleSendMessage();
  };

  useEffect(() => {
    resetMedia();
    setSwitchedByMention(false);
  }, [contact]);

  const canSend = isNoteMode
    ? isTextValid
    : !isRecording && !isOverCharLimit && (media.length > 0 || !!body.media?.length || isTextValid);

  const SendButton = () => (
    <CustomTooltip
      trigger={
        <Button
          aria-label={isNoteMode ? translations("Add note") : translations("Send")}
          size="icon-lg"
          className={cn(
            "size-9 shrink-0 sm:size-10",
            isNoteMode
              ? "bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-300"
              : "bg-green-600 hover:bg-green-700 dark:hover:bg-green-300",
          )}
          onClick={() => submiRef.current?.()}
          disabled={!canSend}
        >
          {isNoteMode ? <IconNote className="size-4" /> : <IconSend className="size-4" />}
        </Button>
      }
      content={<span>{isNoteMode ? translations("Add note") : translations("Send")}</span>}
    />
  );

  const showMessageTab = !isSessionExpired;
  const composer = (
    <WaTextEditor
      handleInputChange={handleDraftChange}
      content={body.text.body}
      mih={67}
      inbox={true}
      mode={isNoteMode ? "note" : "message"}
      enableMention={true}
      mentionUsers={mentionUsers}
      customEnter={() => submiRef.current?.()}
      editable={!isRecording && !audioUrl && body.type === "text"}
      placeholder={
        isNoteMode
          ? translations("Internal note — only your team sees this. @ to mention")
          : translations("Type a message… / for quick replies, @ to mention a teammate")
      }
      sendMessageButton={<SendButton />}
      border={true}
      allowFiles={true}
      hideCharacterCount={true}
      quickRepliesOpen={quickRepliesOpen}
      onQuickRepliesOpenChange={setQuickRepliesOpen}
    />
  );

  return (
    // The composer is the one part of the thread that must never be compressed:
    // in a column flex the body above it can give up space, this cannot.
    <div className="shrink-0">
      {isSessionExpired && platform === MessagePlatform.WHATSAPP && (
        <div className="flex items-start justify-start gap-2.5 border-t border-border bg-background p-3 lg:p-2">
          <WaInboxFooterMenu sessionExpired={isSessionExpired} contact={contact} />
        </div>
      )}
      <div className="flex flex-col gap-2 bg-white p-1.5 dark:bg-transparent sm:p-2">
        {/* One line, always: the tabs give up width (the note tab shortens its
            label) so the character count never wraps to a row of its own. Every
            row here is height the message list does not get. */}
        <div className="flex items-center justify-between gap-2">
          <Tabs
            value={isNoteMode ? "private" : "message"}
            onValueChange={(v) => chooseTab(v as ComposerTab)}
          >
            <TabsList className="h-8! min-w-0 shrink rounded-lg bg-muted p-0.5 sm:h-9! sm:p-1">
              {showMessageTab && (
                <TabsTrigger
                  value="message"
                  className="flex items-center px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:text-sm"
                >
                  <IconMessage className="mr-1.5 size-3.5" />
                  Message
                </TabsTrigger>
              )}
              <TabsTrigger
                value="private"
                className="flex items-center px-2 text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white sm:text-sm"
              >
                <IconNote className="mr-1.5 size-3.5" />
                <span className="sm:hidden">Note</span>
                <span className="hidden sm:inline">Private Note</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {isNoteMode ? (
            <p className="hidden min-w-0 truncate text-xs text-amber-700 dark:text-amber-400 sm:block">
              {switchedByMention
                ? translations("Mentioning a teammate turns this into an internal note.")
                : translations("Only your team sees notes.")}
            </p>
          ) : (
            <div className="flex shrink-0 items-center gap-1">
              <CustomTooltip
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0"
                    onClick={() => setQuickRepliesOpen((prev) => !prev)}
                  >
                    <IconBolt className="size-4 text-cyan-600" />
                  </Button>
                }
                content={<p>Quick Replies</p>}
              />
              <FooterCharacterCount body={body} max={MESSAGE_CHAR_LIMIT} />
            </div>
          )}
        </div>

        {!isNoteMode && conversationLimitReached ? (
          <Alert className="flex! flex-col items-center gap-2 border-amber-300 bg-amber-50 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <IconExclamationCircle size={"1.1rem"} />
              <AlertTitle className="text-sm font-medium">
                {translations("Conversation limit reached")} ({conversationsUsed.toLocaleString()}/
                {conversationLimit.toLocaleString()})
              </AlertTitle>
            </div>
            <AlertDescription className="max-w-md text-xs">
              {isAnnualConversationLimit
                ? translations(
                    "You've used all conversations in your annual plan. Upgrade your plan to send more messages, or wait for it to reset.",
                  )
                : translations(
                    "You've used all conversations for this month. Upgrade your plan to send more messages, or wait for your monthly limit to reset.",
                  )}
            </AlertDescription>
            <Button size="sm" onClick={() => navigate({ to: "/dashboard/settings/billing" })}>
              {translations("Upgrade Plan")}
            </Button>
          </Alert>
        ) : (
          composer
        )}
        <p className="hidden px-2 text-[11px] text-muted-foreground sm:block">
          {translations("Enter to send · Shift + Enter for a new line")}
        </p>
      </div>
    </div>
  );
}

export const WaInboxAssignUserFooter = ({
  contact,
  user,
}: {
  contact: ContactWithUpdatedAt;
  user: User;
}) => {
  const { id: contactId, closedUser } = contact ?? {};
  const { t } = useTranslation();
  const { filterData } = useContactStore();
  const messagesStore = useMessagesStore();
  const assignMut = useAssignOwner(filterData ?? "");
  const { updateContactById } = useContactsStore();
  const qc = useQueryClient();

  function handleAssignToMe() {
    if (!user) {
      return toast.error("Your account details haven't loaded yet.");
    }
    const newMessage = buildAssignEvent({
      contactId,
      actor: { id: user.userId, name: user.userName, profilePhoto: user.profilePhoto },
      added: [{ id: user.userId, name: user.userName }],
      removed: [],
    });
    const id = newMessage.id;
    const rowKey = getRowKey(contact);
    messagesStore.addMessage(`${rowKey}_all`, newMessage);
    messagesStore.addMessage(`${rowKey}_internal`, newMessage);
    // The API records me under the ticket's team when I am in it, not my first team.
    assignMut.mutate(
      {
        messageId: id,
        contactId,
        conversationId: contact.conversationId,
        userId: user.userId,
      },
      {
        onSuccess: (result) => {
          // A closed ticket is not revived by assigning it — the API opens a
          // successor and the thread has already followed it — so the optimistic
          // "assigned" event moves to the successor's bucket too, or it would sit
          // in the closed ticket's thread until the refetch corrects it.
          const assignedRowKey = result?.conversation?.id;
          if (assignedRowKey && assignedRowKey !== rowKey) {
            messagesStore.removeMessage(`${rowKey}_all`, id);
            messagesStore.removeMessage(`${rowKey}_internal`, id);
            messagesStore.addMessage(`${assignedRowKey}_all`, newMessage);
            messagesStore.addMessage(`${assignedRowKey}_internal`, newMessage);
          }
          updateContactById(assignedRowKey ?? contactId, (contact) => ({
            ...contact,
            waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
            assignedUsers: (result?.assignees ?? []).map((a) => ({
              id: a.userId,
              name: user.userName,
              teamId: a.teamId,
            })),
          }));
          qc.invalidateQueries({ queryKey: whatsappKeys.messagesByContact(contactId) });
        },
        onError: (error) => {
          messagesStore.removeMessage(`${rowKey}_all`, id);
          messagesStore.removeMessage(`${rowKey}_internal`, id);
          toast.error(getApiErrorMessage(error, t("Could not change the assignee")));
        },
      },
    );
  }

  // The ticket decides, not the contact: a contact with a live ticket elsewhere
  // would otherwise make this closed one read as "new and unassigned". Same for
  // the timestamp — `closedAt` on the row is the contact's.
  const isClosed = isTicketClosed(contact);
  const closedAt = contact?.ticketClosedAt ?? contact?.closedAt;
  const platform = getContactPlatform(contact);
  const sessionOpen =
    platform === MessagePlatform.WEBCHAT ||
    !isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp);

  return (
    <Alert
      // Shadcn Alert, overridden to a full-width warm footer bar (grid → flex,
      // rounded box → top-bordered bar) so it keeps the mockup's warm palette.
      // `flex!` because Alert's base `grid` would otherwise win the display cascade.
      className="flex! shrink-0 flex-wrap items-center gap-3 rounded-none border-x-0 border-t border-b-0 border-border bg-amber-50 px-3 py-2.5 sm:px-6 dark:bg-amber-950/40"
    >
      <IconUserPlus className="size-4 shrink-0 text-amber-700 dark:text-amber-500" />
      <AlertTitle className="flex-1 text-[13px] font-semibold text-amber-700 dark:text-amber-500">
        {isClosed ? (
          <>
            {t("This chat has been closed")}
            {closedAt && (
              <span className="lowercase">
                {" "}
                by {closedUser?.name ?? "Unknown"} at {formatDateWithRelativeTime(closedAt)}
              </span>
            )}
            .{" "}
            {sessionOpen
              ? t("Their 24-hour window is still open, so you can message them straight away.")
              : t("Start a new conversation with a template.")}
          </>
        ) : (
          t("This conversation is new and unassigned.")
        )}
      </AlertTitle>

      {/* On a closed chat, assigning opens a fresh ticket rather than reviving the
          old one (see `assignWaMessageToUser` in rateup-api), so it is named for that. */}
      <Button
        size="sm"
        className="h-8 shrink-0 gap-1.5 border-transparent bg-primary text-primary-foreground shadow-none"
        loading={assignMut.isPending}
        onClick={handleAssignToMe}
      >
        {isClosed ? (
          <IconMessagePlus className="size-3.5" />
        ) : (
          <IconUserCheck className="size-3.5" />
        )}
        <span className="text-xs font-bold">
          {isClosed ? t("New conversation") : t("Assign to me")}
        </span>
      </Button>

      <AssigneePicker
        contact={contact}
        align="end"
        triggerClassName={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-8 shrink-0 gap-1.5 text-xs font-bold",
        )}
      >
        <IconUsers className="size-3.5" />
        {t("Assign to…")}
      </AssigneePicker>
    </Alert>
  );
};

export const WaInboxBlockedContactFooter = ({ contact }: { contact: ContactWithUpdatedAt }) => {
  const { filterData } = useContactStore();
  const { setSelectedContact } = useContactsStore();
  const confirm = useConfirm();
  const unblockMut = useUnBlockWhatsAppUser(filterData ?? "");
  async function handleUnblock() {
    const shouldUnblock = await confirm({
      title: `Unblock ${contact?.name ?? contact?.phone}`,
      description: "Are you sure to unblock this contact?",
      confirmText: "Unblock",
      cancelText: "cancel",
    });

    if (!shouldUnblock) return;

    unblockMut.mutate(
      { phoneNumbersList: [contact.phone] },
      {
        onSuccess: () => {
          setSelectedContact({ ...contact, blockedOnWhatsApp: false });
        },
      },
    );
  }
  return (
    // Same banner shape as the assign footer, so the three footer states read as
    // one family rather than a black bar next to a redesigned one.
    <Alert className="flex! shrink-0 flex-wrap items-center gap-3 rounded-none border-x-0 border-t border-b-0 border-border bg-amber-50 px-3 py-2.5 sm:px-6 dark:bg-amber-950/40">
      <IconBan className="size-4 shrink-0 text-amber-700 dark:text-amber-500" />
      <AlertTitle className="flex-1 text-[13px] font-semibold text-amber-700 dark:text-amber-500">
        This contact has been blocked by you.
      </AlertTitle>
      <Button
        size="sm"
        variant="outline"
        className="h-8 shrink-0"
        onClick={handleUnblock}
        loading={unblockMut.isPending}
      >
        <span className="text-xs font-bold">Unblock contact</span>
      </Button>
    </Alert>
  );
};

/**
 * A spam contact's thread is read-only, and the way out is "Not spam" — the same
 * shape as the blocked banner, since both are contact-level states rather than
 * anything to do with the ticket.
 */
export const WaInboxSpamContactFooter = ({ contact }: { contact: ContactWithUpdatedAt }) => {
  const confirm = useConfirm();
  const spamMutation = useSetContactSpam();

  async function handleNotSpam() {
    const confirmed = await confirm({
      title: `Remove ${contact?.name ?? contact?.phone} from spam`,
      description: "Are you sure this contact is not spam?",
      confirmText: "Not spam",
      cancelText: "Cancel",
    });
    if (!confirmed) return;
    spamMutation.mutate({ contactId: contact.id, isSpam: false });
  }

  return (
    <Alert className="flex! shrink-0 flex-wrap items-center gap-3 rounded-none border-x-0 border-t border-b-0 border-border bg-amber-50 px-3 py-2.5 sm:px-6 dark:bg-amber-950/40">
      <IconShieldExclamation className="size-4 shrink-0 text-amber-700 dark:text-amber-500" />
      <AlertTitle className="flex-1 text-[13px] font-semibold text-amber-700 dark:text-amber-500">
        This contact is marked as spam.
      </AlertTitle>
      <Button
        size="sm"
        variant="outline"
        className="h-8 shrink-0"
        onClick={handleNotSpam}
        loading={spamMutation.isPending}
      >
        <span className="text-xs font-bold">Not spam</span>
      </Button>
    </Alert>
  );
};

/**
 * A message the composer adds to the thread before the send round-trips. It is the same row
 * the list renders, minus the fields only the server can fill in.
 */
export interface OptimisticMessage extends WaGetMessagesBody {
  contactId: string;
  sendBy?: string;
}

export interface WaMedia {
  type: string;
  url: string;
  name: string;
  /** Absent until the file has been uploaded (e.g. a fresh voice note). */
  key?: string;
  isVoiceNote?: boolean;
  /**
   * The file belongs to something saved (a quick reply), not to this draft, so
   * removing it from the draft must not delete it from storage.
   */
  shared?: boolean;
}

interface MediaStore {
  media: WaMedia[];
  addMedia: (value: WaMedia) => void;
  removeMedia: (key: string) => Promise<void>;
  removeMediaSilently: (key: string) => void;
  resetMedia: () => void;
  selectedMedia: WaMedia | null;
  setSelectedMedia: (value: WaMedia | null) => void;
}

export const useMediaStore = create<MediaStore>((set) => ({
  media: [],
  addMedia: (value) => set((state) => ({ media: [...state.media, value] })),
  selectedMedia: null,
  setSelectedMedia: (value) => set(() => ({ selectedMedia: value })),
  removeMediaSilently: (key) =>
    set((state) => ({ media: state.media.filter((m) => m.key !== key) })),
  removeMedia: async (key) => {
    const entry = useMediaStore.getState().media.find((m) => m.key === key);
    if (!entry?.shared) await deleteUploadedFiles({ fileKeyArray: [{ Key: key }] });
    set((state) => {
      const medias = state.media.filter((m) => m.key !== key);
      return { media: medias };
    });
  },
  resetMedia: () => set(() => ({ media: [] })),
}));

const initialMessgabody: MessageBody = {
  type: "text",
  media: [],
  text: { body: "" },
  contacts: {
    contactIds: [],
    groupIds: [],
  },
  location: null,
};

/** The composer's in-progress outgoing message. */
interface MessageBody {
  type: string;
  media?: WaMedia[];
  /** Holds the editor's Tiptap document. */
  text: { body: TiptapNode | string };
  contacts?: {
    contactIds: string[];
    groupIds: string[];
  };
  location?: {
    longitude: string | number;
    latitude: string | number;
    name?: string;
    address?: string;
  } | null;
}

export const useMessageBodyStore = create<{
  body: MessageBody;
  setBody: (value: MessageBody) => void;
  resetBody: () => void;
}>((set) => ({
  body: initialMessgabody,
  setBody: (value) => set({ body: value }),
  resetBody: () => set({ body: initialMessgabody }),
}));
