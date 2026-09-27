import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBolt,
  IconClearFormatting,
  IconDots,
  IconFileFilled,
  IconLayoutBoard,
  IconPaperclip,
  IconRobot,
  IconTrash,
  IconTypography,
  IconWaveSine,
  IconX,
} from "@tabler/icons-react";
import { Plugin } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { pressable } from "@/components/common/pressable.ts";
import type { TiptapNode } from "@/components/RichTextEditor/wa-editor/format.tsx";
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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";
import { cn } from "@/lib/utils";
import { useContactsStore } from "@/store/inbox.store.ts";
import { MessagePlatform } from "@/types/enums.ts";
import { uploadFile } from "@/utils/file-upload/upload.ts";
import { getContactChannelSource, isInboxSessionExpired } from "@/utils/whatsapp/inbox.ts";

import { AccountSelector } from "../input/AccountSelector.tsx";
import { findChannelAccount } from "../input/channelOptions.ts";
import VoiceRecorder from "../input/VoiceRecorder.tsx";
import { Button } from "../ui/button.tsx";
import CustomTooltip from "../ui/custom/CustomTooltip.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover.tsx";
import WaInboxAutomationDisplayModal from "../whatsapp/inbox/chatdisplay/chatdisplayFooter/automationDisplayModal/index.tsx";
import WaInboxFlowDisplayModal from "../whatsapp/inbox/chatdisplay/chatdisplayFooter/flowDisplayModel/index.tsx";
import { useMediaStore } from "../whatsapp/inbox/chatdisplay/chatdisplayFooter/index.tsx";
import WaInboxTemplateDisplayModal from "../whatsapp/inbox/chatdisplay/chatdisplayFooter/templateDisplayModal/index.tsx";
import { usePhoneIdStore } from "../whatsapp/inbox/chatselect/accountSelectorStore.ts";
import InboxContactsControl from "./InboxContactMessage/index.tsx";
import InboxLocationControl from "./InboxLocation/index.tsx";
import InsertEmoji from "./InsertEmoji/index.tsx";
import InsertInboxAudio from "./InsertInboxMedia/InserInboxAudio.tsx";
import InsertInboxFile from "./InsertInboxMedia/InsertInboxFile.tsx";
import InsertInboxImage from "./InsertInboxMedia/InsertInboxImage.tsx";
import InsertInboxVideo from "./InsertInboxMedia/InsertInboxVideo.tsx";
import type { MentionUser } from "./mention/MentionList.tsx";
import { createWaExtensions } from "./wa-editor/extensions.ts";
import { parseFromWhatsAppFormat } from "./wa-editor/format.tsx";
import { isJSONString, WaQuickReply } from "./WaQuickReply/index.tsx";
interface WaTextEditorProps {
  /** Receives the editor's Tiptap document (`editor.getJSON()`). */
  handleInputChange: (value: TiptapNode) => void;
  /** Initial content: a Tiptap document, or WhatsApp-formatted/plain text. */
  content: TiptapNode | string;
  className?: string;
  mah?: number | string;
  placeholder?: string;
  label?: string;
  max?: number;
  mih?: number;
  required?: boolean;
  inbox?: boolean;
  privateMessage?: boolean;
  customEnter?: () => void;
  editable?: boolean;
  sendMessageButton?: React.ReactNode;
  otherHeaders?: React.ReactNode;
  isQuickReplyEditor?: boolean;
  border?: boolean;
  allowFiles?: boolean;
  hideCharacterCount?: boolean;
  /** Enable @-mentions of teammates (used by the private-note composer). */
  enableMention?: boolean;
  /** Candidate users for the @-mention suggestion list. */
  mentionUsers?: MentionUser[];
  // When provided, the quick-replies panel is controlled by the parent (so the
  // toggle button can live outside the editor, e.g. in the footer tab row).
  quickRepliesOpen?: boolean;
  onQuickRepliesOpenChange?: (value: boolean | ((prev: boolean) => boolean)) => void;
}

function WaTextEditor({
  handleInputChange,
  content = "",
  mah = 200,
  placeholder = "Enter your text",
  label = "",
  max = 1024,
  required = false,
  mih = 120,
  inbox = false,
  privateMessage = false,
  customEnter,
  editable = true,
  sendMessageButton = null,
  isQuickReplyEditor = false,
  border,
  allowFiles = false,
  hideCharacterCount = false,
  enableMention = false,
  mentionUsers,
  quickRepliesOpen,
  onQuickRepliesOpenChange,
}: Readonly<WaTextEditorProps>) {
  const [opened, { open, close }] = useDisclosure(false);
  const [internalShowQuickReplies, setInternalShowQuickReplies] = useState(false);
  // Controlled when the parent owns the toggle; otherwise fall back to local state.
  const quickRepliesControlled = onQuickRepliesOpenChange !== undefined;
  const showQuickReplies = quickRepliesControlled
    ? (quickRepliesOpen ?? false)
    : internalShowQuickReplies;
  const setShowQuickReplies = quickRepliesControlled
    ? onQuickRepliesOpenChange
    : setInternalShowQuickReplies;
  const [quickReplySearchQuery, setQuickReplySearchQuery] = useState("");
  const { addMedia } = useMediaStore();
  // The editor (and its extensions) are created once; the suggestion reads this
  // ref so the mention list stays current as `mentionUsers` updates.
  const mentionUsersRef = useRef<MentionUser[]>([]);
  mentionUsersRef.current = mentionUsers ?? [];
  const extensions = useMemo(
    () => createWaExtensions({ placeholder, max, customEnter, enableMention, mentionUsersRef }),
    [customEnter, enableMention, placeholder, max],
  );
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuickReplySearchQuery(searchTerm.trim());
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchTerm]);
  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onCreate({ editor }) {
      editor.registerPlugin(
        new Plugin({
          props: {
            handleTextInput(view, from, _to, text) {
              if (text === "/" && !isQuickReplyEditor) {
                const slice = view.state.doc.slice(0, from);
                const textBefore = slice.content.textBetween(0, slice.content.size, "\n", "\n");

                const match = textBefore.match(/\/([^\n]*)$/);
                const search = match?.[1]?.trim() ?? "";

                setSearchTerm(search);

                setShowQuickReplies(true);
              }
              return false;
            },

            handlePaste(_view, event) {
              if (!allowFiles) return false;
              const items = event.clipboardData?.items;
              if (!items) return false;

              const files: File[] = [];

              for (let i = 0; i < items.length; i++) {
                const item = items[i];

                if (item.kind === "file") {
                  const file = item.getAsFile();
                  if (file) files.push(file);
                }
              }

              if (files.length) {
                event.preventDefault();

                window.dispatchEvent(
                  new CustomEvent("editor-file-drop", {
                    detail: files,
                  }),
                );

                return true;
              }

              return false;
            },
          },
        }),
      );
    },
    onUpdate: ({ editor }) => {
      handleInputChange(editor.getJSON());
      if (!showQuickReplies) return;
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(0, from, "\n", "\n");
      if (!textBefore.includes("/")) {
        setShowQuickReplies(false);
        setSearchTerm("");
        return;
      }
      const match = textBefore.match(/\/([^\n]*)$/);
      const search = match?.[1]?.trim() ?? "";
      if (textBefore.endsWith("/")) {
        setSearchTerm("");
      } else {
        setSearchTerm(search);
      }
    },
    editable,
  });
  const { media, setSelectedMedia, removeMedia } = useMediaStore();
  const { selectedContact } = useContactsStore();
  const { data: waSettings } = useWaSettings();
  const [flowModalOpened, { close: flowModalClose, open: openFlowModal }] = useDisclosure(false);
  const [automationModalOpened, { close: automationModalClose, open: openAutomationModal }] =
    useDisclosure(false);

  useEffect(() => {
    if (editor) {
      const selection = editor.state.selection;
      editor.commands.setContent(content, {
        parseOptions: { preserveWhitespace: "full" },
      });
      editor.commands.setTextSelection(selection);
    }
  }, [content, editor, editable]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable]);
  const [isModalOpened, { close: onModalClose, open: openModal }] = useDisclosure(false);
  const { whatsappSettingsPhoneId, updatePhoneId } = usePhoneIdStore();

  const { platform: contactPlatform, identifier: channelIdentifier } = useMemo(
    () => getContactChannelSource(selectedContact),
    [selectedContact],
  );
  const platform = selectedContact ? contactPlatform : null;

  /**
   * The account this conversation actually runs on — read off the thread, not off
   * whatever the agent last sent from.
   *
   * Two things made replies leave on the wrong number. The account was matched
   * with `s.phone === sourceIdentifier`, which never holds for WhatsApp (`+965…`
   * against `965…`), so nothing ever resolved; and the store was only seeded
   * while it was still empty, so the first thread of a session fixed the number
   * for every thread after it. A reply sent on a number the customer never wrote
   * to has no 24h window open, which is what came back as 131047
   * "Re-engagement message".
   *
   * Instagram and Messenger address the send by the account id the thread already
   * recorded, so those pass the identifier straight through.
   */
  const conversationChannelId = useMemo(() => {
    if (!platform || platform === MessagePlatform.WEBCHAT) return "";
    if (platform !== MessagePlatform.WHATSAPP) return channelIdentifier ?? "";
    return findChannelAccount(waSettings, platform, channelIdentifier)?.phoneId ?? "";
  }, [waSettings, platform, channelIdentifier]);

  /**
   * Re-seeded per conversation, so switching threads switches the number back to
   * that thread's own. An agent's manual pick in the selector survives — it moves
   * the store, not `conversationChannelId`, so this does not fire again until the
   * conversation itself changes. Left empty when the thread names no channel we
   * still have connected: the agent picks, rather than the send silently going
   * out on whichever number the org connected first.
   */
  useEffect(() => {
    updatePhoneId(conversationChannelId);
  }, [conversationChannelId, updatePhoneId]);

  const isSessionExpired = isInboxSessionExpired(selectedContact?.lastReceivedMessageTimeStamp);

  const AccountSelectComponent = () => {
    if (platform === MessagePlatform.WEBCHAT) return null;
    return (
      <AccountSelector
        onChange={(phoneId) => {
          updatePhoneId(phoneId ?? "");
        }}
        value={whatsappSettingsPhoneId}
        // Shrinks with the row on a phone (the value is line-clamped, so it
        // truncates), fixed width once the toolbar is not fighting for space.
        className="min-w-16 flex-1 rounded-[5px] bg-primary/10 font-normal text-primary sm:w-37.5 sm:flex-none"
        platform={platform}
        disabled={platform === MessagePlatform.INSTAGRAM || platform === MessagePlatform.FACEBOOK}
        hideLabel={true}
      />
    );
  };

  useEffect(() => {
    const handler = async (e: Event) => {
      const files: File[] = (e as CustomEvent<File[]>).detail;

      for (const file of files) {
        try {
          const fileKey = await uploadFile(file);
          const fileUrl = `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${fileKey}`;

          const type = file.type.startsWith("image/")
            ? "image"
            : file.type.startsWith("video/")
              ? "video"
              : file.type.startsWith("audio/")
                ? "audio"
                : "document";

          addMedia({
            type,
            name: file.name,
            url: fileUrl,
            key: fileKey,
          });
        } catch (e) {
          console.error(e);
        }
      }
    };

    window.addEventListener("editor-file-drop", handler);
    return () => window.removeEventListener("editor-file-drop", handler);
  }, []);

  return (
    <div className={`${border ? "border-t" : ""} bg-background shrink-0 relative`}>
      {/* Attachments wrap instead of pushing the composer sideways — ten pending
          files on a phone is a second row, not a horizontal scroll. */}
      <div className="flex flex-wrap gap-1 px-2 pt-2 empty:hidden">
        {media.length > 0 &&
          media.map((me) => {
            return (
              <div className="relative inline-flex" key={me?.key}>
                <span className="absolute -top-2 -right-2 z-10 flex size-4 items-center justify-center rounded-full bg-destructive text-white">
                  <IconX
                    onClick={() => removeMedia(me.key ?? "")}
                    size={12}
                    className="cursor-pointer"
                  />
                </span>
                <div
                  className="w-[50px] h-[50px] border-2 border-white flex flex-col justify-center items-center relative"
                  style={{ zIndex: 9999 }}
                  {...pressable(() => {
                    if (["audio", "document"].includes(me.type)) return;
                    setSelectedMedia(me);
                    open();
                  }, me.name)}
                >
                  {me.type === "image" && (
                    <img src={me.url} className="w-[48px] h-[48px] object-cover" alt={me.name} />
                  )}
                  {me.type === "video" && <video src={me.url} width={48} height={48} />}
                  {me.type === "document" && (
                    <a href={me.url}>
                      <IconFileFilled color="white" size={"2rem"} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        <ShowMedia opened={opened} close={close} />
      </div>
      {showQuickReplies && (
        <div className="p-2 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Quick Replies</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setShowQuickReplies(false)}
            >
              <IconX className="w-3 h-3" />
            </Button>
          </div>
          <div className="overflow-auto min-w-40 min-h-20 max-h-50">
            <WaQuickReply
              handleSelectQuickReply={(reply) => {
                if (editor) {
                  const value = reply.text ?? "";
                  const parsedValue = !isJSONString(value)
                    ? parseFromWhatsAppFormat(value)
                    : JSON.parse(value);

                  const { from } = editor.state.selection;
                  const textBefore = editor.state.doc.textBetween(0, from, "\n", "\n");

                  const match = textBefore.match(/\/[^\n]*$/);
                  if (match) {
                    editor
                      .chain()
                      .focus()
                      .deleteRange({ from: from - match[0].length, to: from })
                      .run();
                  }

                  if (value) editor.chain().focus().insertContent(parsedValue).run();
                  // Attachments only exist in the inbox composer. `shared`: the files
                  // are the quick reply's, so dropping one from this draft keeps it.
                  if (inbox) {
                    const inDraft = new Set(media.map((m) => m.key));
                    for (const item of reply.media ?? []) {
                      if (!inDraft.has(item.key)) addMedia({ ...item, shared: true });
                    }
                  }
                  setShowQuickReplies(false);
                  setSearchTerm("");
                }
              }}
              searchQuery={quickReplySearchQuery}
            />
          </div>
        </div>
      )}
      {label && (
        <div className="text-xs font-bold text-muted-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </div>
      )}
      <div className={`flex items-start gap-2 ${border ? "p-2 sm:p-4" : ""} pb-0`}>
        <div className="min-w-0 flex-1">
          <ToolbarProvider editor={editor!}>
            <TooltipProvider>
              {inbox && !quickRepliesControlled && (
                <div className="flex items-center justify-end px-2 pb-1">
                  <CustomTooltip
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setShowQuickReplies((prev) => !prev)}
                      >
                        <IconBolt className="w-4 h-4 text-cyan-600" />
                      </Button>
                    }
                    content={<p>Quick Replies</p>}
                  />
                </div>
              )}
              <div className="relative">
                {/* The caller's heights are handed over as custom properties so
                    they can apply from sm up and a phone can start at one line
                    and grow — a hard `minHeight` spends that space whether the
                    message needs it or not. */}
                <EditorContent
                  editor={editor}
                  style={
                    {
                      backgroundColor: "var(--accent)",
                      borderRadius: "5px",
                      "--wa-editor-min-h": `${mih}px`,
                      "--wa-editor-max-h": `${mah}px`,
                    } as React.CSSProperties
                  }
                  className={`max-h-40 min-h-9 overflow-y-auto rounded-xl sm:max-h-(--wa-editor-max-h) sm:min-h-(--wa-editor-min-h) ${
                    editor?.isFocused ? "ring-1 ring-(--grey-color-4)" : ""
                  }`}
                />
              </div>
              <div
                className={`${hideCharacterCount ? "hidden" : "flex"} items-center justify-end px-2 pt-1 space-x-1`}
              >
                {!hideCharacterCount && <WaTextCharacterCount editor={editor} max={max} />}
              </div>
              {/* One row, tools and channel picker. The picker keeps its width;
                  the tool group is the part that gives, scrolling sideways in the
                  rare case (a channel with every control shown, a very narrow
                  pane) that five buttons still do not fit. */}
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                {/* Tools keep their size — they are icon buttons with nothing to
                    give — so the account picker is the element that absorbs a
                    narrow row, truncating its label rather than letting the row
                    scroll. */}
                <div className="flex shrink-0 items-center py-1 sm:flex-wrap sm:p-2">
                  <div className="mt-1 flex items-center">
                    <InsertEmoji editor={editor} />
                  </div>
                  <Popover>
                    <PopoverTrigger>
                      <CustomTooltip
                        trigger={
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <IconTypography className="w-5 h-5" />
                          </Button>
                        }
                        content={<span>Format Message</span>}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-full">
                      <div className="flex gap-1 flex-nowrap">
                        <div className="flex items-center">
                          <BoldToolbar />
                          <ItalicToolbar />
                          <StrikeThroughToolbar />
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Clear formatting"
                            aria-label="Clear formatting"
                            className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                            onClick={() =>
                              editor?.chain().focus().unsetAllMarks().clearNodes().run()
                            }
                          >
                            <IconClearFormatting className="h-4 w-4" />
                          </Button>
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
                  <CustomTooltip
                    trigger={
                      <Button variant="ghost" className="hidden sm:inline-flex">
                        <div className="flex items-center">
                          <UndoToolbar />
                          <RedoToolbar />
                        </div>
                      </Button>
                    }
                    content={<span>Undo/Redo</span>}
                  />
                  {inbox && !isQuickReplyEditor && (
                    <Popover>
                      <PopoverTrigger>
                        <CustomTooltip
                          trigger={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <IconPaperclip className="w-5 h-5" />
                            </Button>
                          }
                          content={<span>Insert Media</span>}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-full">
                        <div className="flex items-center justify-center flex-nowrap">
                          <div className="flex items-center">
                            {platform !== MessagePlatform.INSTAGRAM && <InsertInboxFile />}
                            <InsertInboxImage />
                            <InsertInboxVideo />
                            <InsertInboxAudio />
                          </div>

                          <div className="flex items-center">
                            {!(
                              platform === MessagePlatform.INSTAGRAM ||
                              platform === MessagePlatform.FACEBOOK
                            ) && (
                              <>
                                <InboxContactsControl />
                                <InboxLocationControl />
                              </>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  {inbox && platform === MessagePlatform.WHATSAPP && (
                    <div className="hidden sm:flex">
                      <CustomTooltip
                        trigger={
                          <Button variant="ghost" onClick={() => openModal()} size="sm">
                            <IconLayoutBoard className="w-4 h-4" />
                          </Button>
                        }
                        content={<span>Template</span>}
                      />
                      <CustomTooltip
                        trigger={
                          <Button variant="ghost" onClick={() => openFlowModal()} size="sm">
                            <IconWaveSine className="w-4 h-4" />
                          </Button>
                        }
                        content={<span>Flow</span>}
                      />
                      <CustomTooltip
                        trigger={
                          <Button variant="ghost" onClick={() => openAutomationModal()} size="sm">
                            <IconRobot className="w-4 h-4" />
                          </Button>
                        }
                        content={<span>Automation</span>}
                      />
                    </div>
                  )}
                  {inbox && platform !== MessagePlatform.WEBCHAT && <VoiceRecorder />}
                  {/* Everything above that is a named action rather than a typing
                      aid collapses into one button on a phone. Kept as a separate
                      trigger rather than a JS breakpoint so no toolbar control
                      unmounts and remounts as the pane is resized. */}
                  {inbox && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0 sm:hidden"
                            aria-label="More composer actions"
                          />
                        }
                      >
                        <IconDots className="size-5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {platform === MessagePlatform.WHATSAPP && (
                          <>
                            <DropdownMenuItem className="gap-2 text-xs" onClick={() => openModal()}>
                              <IconLayoutBoard className="size-4" />
                              Template
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 text-xs"
                              onClick={() => openFlowModal()}
                            >
                              <IconWaveSine size={16} />
                              Flow
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 text-xs"
                              onClick={() => openAutomationModal()}
                            >
                              <IconRobot size={16} />
                              Automation
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          className="gap-2 text-xs"
                          onClick={() => editor?.chain().focus().undo().run()}
                        >
                          <IconArrowBackUp className="size-4" />
                          Undo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-xs"
                          onClick={() => editor?.chain().focus().redo().run()}
                        >
                          <IconArrowForwardUp className="size-4" />
                          Redo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:flex-none sm:gap-2">
                  {inbox && <AccountSelectComponent />}
                  {/* On a phone the send button rides at the end of this row. As
                      its own column it reserved its width down the whole height
                      of the composer — width the message box never got back,
                      for a button that only needs one line. */}
                  <div className="shrink-0 sm:hidden">
                    {(inbox || privateMessage) && sendMessageButton}
                  </div>
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
        <div className="mt-5 hidden shrink-0 sm:block">
          {(inbox || privateMessage) && sendMessageButton}
        </div>
      </div>
      <WaInboxTemplateDisplayModal
        sessionExpired={isSessionExpired}
        contact={selectedContact}
        opened={isModalOpened}
        onClose={onModalClose}
      />
      <WaInboxFlowDisplayModal
        sessionExpired={isSessionExpired}
        contact={selectedContact}
        opened={flowModalOpened}
        close={flowModalClose}
      />
      <WaInboxAutomationDisplayModal
        sessionExpired={isSessionExpired}
        contact={selectedContact}
        opened={automationModalOpened}
        close={automationModalClose}
      />
    </div>
  );
}

export default WaTextEditor;

const ShowMedia = ({ opened, close }: { opened: boolean; close: () => void }) => {
  const { selectedMedia: media, removeMedia } = useMediaStore();
  if (!media) return null;
  return (
    <Dialog
      open={opened}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent>
        <DialogTitle className="sr-only">{media.name}</DialogTitle>
        <div className="flex flex-col gap-4">
          <Button
            size="icon"
            aria-label="Remove media"
            className="bg-destructive text-white hover:bg-destructive"
            onClick={async () => {
              await removeMedia(media.key ?? "");
              close();
            }}
          >
            <IconTrash />
          </Button>
          {media.type === "image" && (
            <img src={media.url} className="w-full h-full object-contain" alt={media.name} />
          )}
          {media.type === "video" && (
            <video src={media.url} width={"100%"} height={"100%"} controls />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const WaTextCharacterCount = ({ editor, max }: { editor: Editor | null; max: number }) => {
  const percentage = editor
    ? Math.round((100 / max) * editor.storage.characterCount.characters())
    : 0;
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2.5 text-xs text-muted-foreground [&>svg]:text-green-600",
        editor?.storage?.characterCount?.characters() === max &&
          "text-destructive [&>svg]:text-destructive",
      )}
    >
      <svg height="20" width="20" viewBox="0 0 20 20">
        <circle r="10" cx="10" cy="10" fill="#e9ecef" />
        <circle
          r="5"
          cx="10"
          cy="10"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={`calc(${percentage} * 31.4 / 100) 31.4`}
          transform="rotate(-90) translate(-20)"
        />
        <circle r="6" cx="10" cy="10" fill="white" />
      </svg>
      {editor?.storage?.characterCount?.characters()} / {max} characters
    </div>
  );
};
