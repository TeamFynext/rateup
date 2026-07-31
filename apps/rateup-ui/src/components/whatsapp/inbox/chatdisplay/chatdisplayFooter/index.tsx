import { IconExclamationCircle } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { EditorContent } from "@tiptap/react";
import dayjs from "dayjs";
import {
  Ban,
  MessageSquare,
  Send,
  ShieldAlert,
  StickyNote,
  TypeOutline,
  UserCheck,
  UserPlus,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { create } from "zustand";

import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useConversationLimit } from "@/backend/stats/stats.query";
import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  useAssignInboxToUer,
  useCreatePrivateMessage,
  useSendNewWaMessage,
  useSetContactSpam,
  useUnBlockWhatsAppUser,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import type { ContactWithUpdatedAt } from "@/components/dashboard/inbox/store.ts";
import useContactStore, {
  useContactsStore,
  useMessagesStore,
} from "@/components/dashboard/inbox/store.ts";
import { useVoiceRecordStore } from "@/components/input/VoiceRecorder.tsx";
import InsertEmoji from "@/components/RichTextEditor/InsertEmoji/index.tsx";
import {
  extractMentionUserIds,
  parseToWhatsAppFormat,
} from "@/components/RichTextEditor/wa-editor/format.tsx";
import type { TiptapNode } from "@/components/RichTextEditor/wa-editor/format.tsx";
import { useWaEditor } from "@/components/RichTextEditor/wa-editor/use-wa-editor.ts";
import WaTextEditor from "@/components/RichTextEditor/waTextEditor.tsx";
import { BlockquoteToolbar } from "@/components/tiptap/toolbars/blockquote.tsx";
import { BoldToolbar } from "@/components/tiptap/toolbars/bold.tsx";
import { BulletListToolbar } from "@/components/tiptap/toolbars/bullet-list.tsx";
import { CodeToolbar } from "@/components/tiptap/toolbars/code.tsx";
import { ItalicToolbar } from "@/components/tiptap/toolbars/italic.tsx";
import { OrderedListToolbar } from "@/components/tiptap/toolbars/ordered-list.tsx";
import { RedoToolbar } from "@/components/tiptap/toolbars/redo.tsx";
import { StrikeThroughToolbar } from "@/components/tiptap/toolbars/strikethrough.tsx";
import { ToolbarProvider } from "@/components/tiptap/toolbars/toolbar-provider.tsx";
import { UndoToolbar } from "@/components/tiptap/toolbars/undo.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import type { User } from "@/context/UserContext.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums.ts";
import { formatDateWithRelativeTime } from "@/utils/dateTime.ts";
import { deleteUploadedFiles } from "@/utils/file-upload/upload.ts";
import {
  getContactPlatform,
  isInboxSessionExpired,
  returnMessageContentBasedOnParsedMessage,
} from "@/utils/whatsapp/inbox.ts";

import { usePhoneIdStore } from "../../chatselect/accountSelectorStore.ts";
import { generateInternalMessageId } from "../../util.tsx";
import AssignUser from "../chatdisplayHeader/AssignUser.tsx";
import { isTicketClosed } from "../chatdisplayHeader/ticket.ts";
import { useComposerTabStore } from "./composerTabStore.ts";
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
  const walk = (node) => {
    if (!node) return;
    if (node.type === "text" && typeof node.text === "string") count += node.text.length;
    if (Array.isArray(node.content)) node.content.forEach(walk);
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
  // Shared with the thread body: the "private" tab also filters the thread to
  // internal notes only.
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
  );
  const createPrivateMessage = useCreatePrivateMessage(contact.id);
  const { addMessage, removeMessage } = useTemperoryMessageStore();
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

  const privateNoteEditor = useWaEditor({
    content: body.text.body,
    placeholder: "Add a private note",
    enableMention: true,
    mentionUsers,
    onChange: (value) => setBody({ ...body, text: { ...body.text, body: value } }),
  });

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
    addMessage(getRowKey(contact), {
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
      type: "text",
    });
    resetMedia();
    setAudioUrl(null);
    sendnewWaMessage.mutate(
      { ...values },
      {
        onSuccess: () => {
          removeMessage(getRowKey(contact));
        },
      },
    );
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
    if (!body.text?.body || parseToWhatsAppFormat(body.text.body).trim().length === 0) {
      return;
    }
    if (!whatsappSettingsPhoneId && platform !== MessagePlatform.WEBCHAT) {
      toast.error("Select a account to send the message");
      return;
    }
    const values = {
      type: body.type,
      text: body.text,
      media: media,
      contacts: body.contacts,
      location: body.location,
    };
    // Mentions are resolved by id (robust to names with spaces), taken straight
    // from the mention nodes the user inserted.
    const mentionedUserIds = extractMentionUserIds(values.text?.body);
    const mentionedUser = mentionUsers.filter((u) => mentionedUserIds.includes(u.id));
    resetBody();
    resetMedia();
    setAudioUrl(null);
    const id = generateInternalMessageId();
    const newMessage: OptimisticMessage = {
      id: id,
      contactId: contact.id,
      waCreatedAt: new Date().toISOString(),
      messageBody: {
        send: null,
        receive: null,
        privateNote: {
          text: {
            body: parseToWhatsAppFormat(values.text.body),
          },
          mentionedUser,
          triggeredByUser: {
            id: user?.userId,
            name: user?.userName,
          },
        },
        exchangeProcess: "privateNote",
      },
      sourcePlatform: "INTERNAL",
      sourceIdentifier: null,
      sendBy: user?.userId,
      sender: {
        name: user?.userName,
        profilePhoto: user?.profilePhoto,
      },
      stats: {
        read: "",
        sent: "",
        failed: "",
        delivered: "",
      },
      messageId: id,
    };
    const rowKey = getRowKey(contact);
    messagesStore.addMessage(`${rowKey}_all`, newMessage);
    messagesStore.addMessage(`${rowKey}_internal`, newMessage);

    createPrivateMessage.mutate(
      {
        data: {
          ...values,
          messageId: id,
          mentionedUserIds,
        },
      },
      {
        onError: () => {
          messagesStore.removeMessage(`${rowKey}_all`, id);
          messagesStore.removeMessage(`${rowKey}_internal`, id);
        },
      },
    );
  }

  const isSessionExpired =
    platform !== MessagePlatform.WEBCHAT &&
    isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp);
  submiRef.current = () => {
    if (isSessionExpired) return;
    handleSendMessage();
  };

  useEffect(() => {
    resetMedia();
  }, [contact]);

  const SendMessageComponent = () => {
    return (
      <CustomTooltip
        trigger={
          <Button
            size="icon-lg"
            className="size-9 shrink-0 bg-green-600 hover:bg-green-700 sm:size-10"
            onClick={handleSendMessage}
            disabled={
              isSessionExpired ||
              isRecording ||
              isOverCharLimit ||
              (!media.length && !body.media?.length && !isTextValid)
            }
          >
            <Send className="w-4 h-4" />
          </Button>
        }
        content={<span>{translations("Send")}</span>}
      />
    );
  };
  const SendPrivateMessageComponent = () => {
    return (
      <CustomTooltip
        trigger={
          <Button
            size="icon-lg"
            className="size-9 shrink-0 bg-amber-600 hover:bg-amber-700 sm:size-10"
            onClick={handleSendPrivateMessage}
            disabled={
              isSessionExpired ||
              isRecording ||
              (!media.length && !body.media?.length && !isTextValid)
            }
          >
            <Send className="w-4 h-4" />
          </Button>
        }
        content={<span>{translations("Send")}</span>}
      />
    );
  };

  if (isSessionExpired) {
    if (platform === MessagePlatform.INSTAGRAM || platform === MessagePlatform.FACEBOOK)
      return null;
    return (
      <div className="flex items-start justify-start gap-2.5 border-t border-border bg-background p-3 lg:p-2">
        <WaInboxFooterMenu sessionExpired={isSessionExpired} contact={contact} />
      </div>
    );
  }
  return (
    // The composer is the one part of the thread that must never be compressed:
    // in a column flex the body above it can give up space, this cannot.
    <div className="shrink-0">
      <div className="flex flex-col gap-2">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v)}
          className="bg-white p-1.5 dark:bg-transparent sm:p-2"
        >
          {/* One line, always: the tabs give up width (the note tab shortens its
              label) so the character count never wraps to a row of its own. Every
              row here is height the message list does not get. */}
          <div className="flex items-center justify-between gap-2">
            <TabsList className="h-8! min-w-0 shrink rounded-lg bg-muted p-0.5 sm:h-9! sm:p-1">
              <TabsTrigger
                value="message"
                className="flex items-center px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-white sm:text-sm"
              >
                <MessageSquare className="mr-1.5 size-3.5" />
                Message
              </TabsTrigger>

              <TabsTrigger
                value="private"
                className="flex items-center px-2 text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white sm:text-sm"
              >
                <StickyNote className="mr-1.5 size-3.5" />
                <span className="sm:hidden">Note</span>
                <span className="hidden sm:inline">Private Note</span>
              </TabsTrigger>
            </TabsList>

            {activeTab === "message" && (
              <div className="flex shrink-0 items-center gap-1">
                <CustomTooltip
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0"
                      onClick={() => setQuickRepliesOpen((prev) => !prev)}
                    >
                      <Zap className="size-4 text-cyan-600" />
                    </Button>
                  }
                  content={<p>Quick Replies</p>}
                />
                <FooterCharacterCount body={body} max={MESSAGE_CHAR_LIMIT} />
              </div>
            )}
          </div>

          <TabsContent value="message">
            {conversationLimitReached ? (
              <Alert className="flex! flex-col items-center gap-2 border-amber-300 bg-amber-50 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <IconExclamationCircle size={"1.1rem"} />
                  <AlertTitle className="text-sm font-medium">
                    {translations("Conversation limit reached")} (
                    {conversationsUsed.toLocaleString()}/{conversationLimit.toLocaleString()})
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
              <WaTextEditor
                handleInputChange={(value) => {
                  setBody({ ...body, text: { ...body.text, body: value } });
                }}
                content={body.text.body}
                mih={67}
                inbox={true}
                customEnter={() => submiRef.current?.()}
                editable={!isSessionExpired && !isRecording && !audioUrl && body.type === "text"}
                placeholder="Type a message...Type / for quick replies"
                sendMessageButton={<SendMessageComponent />}
                border={true}
                allowFiles={true}
                hideCharacterCount={true}
                quickRepliesOpen={quickRepliesOpen}
                onQuickRepliesOpenChange={setQuickRepliesOpen}
              />
            )}
          </TabsContent>

          <TabsContent value="private">
            {/* Same shape as the message composer, so it gets the same treatment:
                the editor column is allowed to shrink and the send button is not. */}
            <div className="flex items-start gap-2 p-2 pb-0 sm:p-4 sm:pb-0">
              <div className="min-w-0 flex-1">
                <ToolbarProvider editor={privateNoteEditor!}>
                  <TooltipProvider>
                    <EditorContent
                      editor={privateNoteEditor}
                      style={{
                        backgroundColor: "var(--accent)",
                        borderRadius: "5px",
                      }}
                      // Same as the message composer: one line to start on a
                      // phone, the roomier fixed box once there is height to spare.
                      className="max-h-40 min-h-9 overflow-y-auto rounded-xl sm:max-h-50 sm:min-h-16.75"
                    />
                    <div className="flex flex-wrap items-center p-2">
                      <div className="mt-1 flex items-center">
                        <InsertEmoji editor={privateNoteEditor} />
                      </div>
                      <Popover>
                        <PopoverTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Format Message"
                          >
                            <TypeOutline className="h-5 w-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full">
                          <div className="flex flex-nowrap gap-1">
                            <div className="flex items-center">
                              <BoldToolbar />
                              <ItalicToolbar />
                              <StrikeThroughToolbar />
                              <CodeToolbar />
                            </div>
                            <div className="flex items-center">
                              <BlockquoteToolbar />
                              <BulletListToolbar />
                              <OrderedListToolbar />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <div className="flex items-center">
                        <UndoToolbar />
                        <RedoToolbar />
                      </div>
                      {/* Sits with the tools on a phone, as in the message tab —
                          a send column beside the editor costs its width down the
                          full height of the composer. */}
                      <div className="ml-auto sm:hidden">
                        <SendPrivateMessageComponent />
                      </div>
                    </div>
                  </TooltipProvider>
                </ToolbarProvider>
              </div>
              <div className="mt-5 hidden shrink-0 sm:block">
                <SendPrivateMessageComponent />
              </div>
            </div>
          </TabsContent>
        </Tabs>
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
  const assignMut = useAssignInboxToUer(contactId ?? "", filterData ?? "");
  const { updateContactById } = useContactsStore();
  const qc = useQueryClient();

  function handleAssignToMe() {
    if (!user) {
      return toast.error("failed!try again");
    }
    const message = `Chat assigned to ${user.userName}`;
    const id = generateInternalMessageId();
    const newMessage: OptimisticMessage = {
      id: id,
      contactId: contactId,
      waCreatedAt: new Date().toISOString(),
      messageBody: {
        send: null,
        receive: null,
        internal: {
          text: {
            body: message,
          },
          assignedUsers: [],
          assignStatus: WaMessageAssignStatus.ASSIGNED,
          triggeredByUser: {
            id: user.userId,
            name: user.userName,
          },
        },
        exchangeProcess: "internal",
      },
      sourcePlatform: "INTERNAL",
      sourceIdentifier: null,
      sendBy: user.userId,
      sender: {
        name: user.userName,
        profilePhoto: user?.profilePhoto,
      },
      stats: {
        read: "",
        sent: "",
        failed: "",
        delivered: "",
      },
      messageId: id,
    };
    const rowKey = getRowKey(contact);
    messagesStore.addMessage(`${rowKey}_all`, newMessage);
    messagesStore.addMessage(`${rowKey}_internal`, newMessage);
    assignMut.mutate(
      {
        messageId: id,
        contactId,
        assignees: [
          {
            userId: user.userId,
            teamId: user.teams?.[0],
          },
        ],
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
            assignedUsers: [
              {
                id: user.userId,
                name: user?.userName,
                teamId: user.teams?.[0],
              },
            ],
          }));
          qc.invalidateQueries({ queryKey: ["wa-messages", contactId] });
        },
        onError: () => {
          messagesStore.removeMessage(`${rowKey}_all`, id);
          messagesStore.removeMessage(`${rowKey}_internal`, id);
        },
      },
    );
  }

  // The ticket decides, not the contact: a contact with a live ticket elsewhere
  // would otherwise make this closed one read as "new and unassigned". Same for
  // the timestamp — `closedAt` on the row is the contact's.
  const isClosed = isTicketClosed(contact);
  const closedAt = contact?.ticketClosedAt ?? contact?.closedAt;

  return (
    <Alert
      // Shadcn Alert, overridden to a full-width warm footer bar (grid → flex,
      // rounded box → top-bordered bar) so it keeps the mockup's warm palette.
      // `flex!` because Alert's base `grid` would otherwise win the display cascade.
      className="flex! shrink-0 flex-wrap items-center gap-3 rounded-none border-x-0 border-t border-b-0 border-border bg-amber-50 px-3 py-2.5 sm:px-6 dark:bg-amber-950/40"
    >
      <UserPlus className="size-4 shrink-0 text-amber-700 dark:text-amber-500" />
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
            . {t("Assign it to start the conversation again.")}
          </>
        ) : (
          t("This conversation is new and unassigned.")
        )}
      </AlertTitle>

      <Button
        size="sm"
        className="h-8 shrink-0 gap-1.5 border-transparent bg-primary text-primary-foreground shadow-none"
        disabled={assignMut.isPending}
        onClick={handleAssignToMe}
      >
        <UserCheck className="size-3.5" />
        <span className="text-xs font-bold">{t("Assign to me")}</span>
      </Button>

      {/* The teammate picker stays `AssignUser` — it owns the real multi-assignee
          and team round-robin behaviour that the mockup's popover only sketches. */}
      <AssignUser contactId={contactId} variant="outline" />
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
      <Ban className="size-4 shrink-0 text-amber-700 dark:text-amber-500" />
      <AlertTitle className="flex-1 text-[13px] font-semibold text-amber-700 dark:text-amber-500">
        This contact has been blocked by you.
      </AlertTitle>
      <Button
        size="sm"
        variant="outline"
        className="h-8 shrink-0"
        onClick={handleUnblock}
        disabled={unblockMut.isPending}
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
      <ShieldAlert className="size-4 shrink-0 text-amber-700 dark:text-amber-500" />
      <AlertTitle className="flex-1 text-[13px] font-semibold text-amber-700 dark:text-amber-500">
        This contact is marked as spam.
      </AlertTitle>
      <Button
        size="sm"
        variant="outline"
        className="h-8 shrink-0"
        onClick={handleNotSpam}
        disabled={spamMutation.isPending}
      >
        <span className="text-xs font-bold">Not spam</span>
      </Button>
    </Alert>
  );
};

interface Message {
  id?: string;
  contactId: string;
  body: {
    /** The composer's Tiptap document, or plain text for legacy entries. */
    text: TiptapNode | string;
    url?: string;
    urlType?: string;
    filename?: string;
  };
  type: string;
  timestamp: number;
  isOutgoing: boolean;
}

interface MessageState {
  messages: Record<string, Message[]>;
  addMessage: (
    contactId: string,
    message: Omit<Message, "contactId" | "timestamp" | "isOutgoing">,
  ) => void;
  getMessages: (contactId: string) => Message[];
  removeMessage: (contactId: string) => void;
}

export const useTemperoryMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  addMessage: (contactId, message) =>
    set((state) => {
      const newMessage: Message = {
        ...message,
        contactId,
        timestamp: Date.now(),
        isOutgoing: true,
      };

      const currentContactMessages = state.messages[contactId] || [];

      return {
        messages: {
          ...state.messages,
          [contactId]: [...currentContactMessages, newMessage],
        },
      };
    }),
  getMessages: (contactId) => get().messages[contactId] || [],
  removeMessage: (contactId) =>
    set((state) => {
      return {
        messages: {
          ...state.messages,
          [contactId]: [],
        },
      };
    }),
}));

/**
 * An optimistic message pushed into the thread before the server echoes it.
 * The `null` slots mirror the wire shape, where only one of
 * send/receive/privateNote is populated.
 */
export interface OptimisticMessage {
  id: string;
  contactId: string;
  waCreatedAt: string;
  messageBody: {
    send: unknown;
    receive: unknown;
    privateNote?: unknown;
    exchangeProcess: string;
    [key: string]: unknown;
  };
  sourcePlatform: string;
  sourceIdentifier: string | null;
  sendBy?: string;
  sender?: { name?: string; profilePhoto?: string };
  stats?: { read: string; sent: string; failed: string; delivered: string };
  messageId: string;
  [key: string]: unknown;
}

interface WaMedia {
  type: string;
  url: string;
  name: string;
  /** Absent until the file has been uploaded (e.g. a fresh voice note). */
  key?: string;
  isVoiceNote?: boolean;
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
    await deleteUploadedFiles({ fileKeyArray: [{ Key: key }] });
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
