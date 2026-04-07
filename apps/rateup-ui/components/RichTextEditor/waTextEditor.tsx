"use client";

import React, { useEffect, useMemo, useState } from "react";

import {
  ActionIcon,
  Anchor,
  BoxComponentProps,
  Image,
  Indicator,
  Modal,
  Stack,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { RichTextEditor } from "@mantine/tiptap";
import {
  IconFileFilled,
  IconRobot,
  IconTrash,
  IconWaveSine,
  IconX,
} from "@tabler/icons-react";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import { Extension, generateHTML, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import parse from "html-react-parser";
import { LayoutTemplate, Paperclip, TypeOutline, X, Zap } from "lucide-react";
import { Plugin } from "prosemirror-state";

import { MessagePlatform } from "@/types/enums";
import { useContactsStore } from "@/app/dashboard/inbox/store";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { uploadFile } from "@/utils/file-upload/upload";
import {
  getMessageSourceName,
  isInboxSessionExpired,
} from "@/utils/whatsapp/inbox";

import { AccountSelector } from "../input/AccountSelector";
import VoiceRecorder from "../input/VoiceRecorder";
import { Button } from "../ui/button";
import CustomTooltip from "../ui/custom/CustomTooltip";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useMediaStore } from "../whatsapp/inbox/chatdisplay/chatdisplayFooter";
import WaInboxAutomationDisplayModal from "../whatsapp/inbox/chatdisplay/chatdisplayFooter/automationDisplayModal";
import WaInboxFlowDisplayModal from "../whatsapp/inbox/chatdisplay/chatdisplayFooter/flowDisplayModel";
import WaInboxTemplateDisplayModal from "../whatsapp/inbox/chatdisplay/chatdisplayFooter/templateDisplayModal";
import { usePhoneIdStore } from "../whatsapp/inbox/chatselect/accountSelectorStore";
import InboxContactsControl from "./InboxContactMessage";
import InboxLocationControl from "./InboxLocation";
import InsertEmoji from "./InsertEmoji";
import InsertInboxAudio from "./InsertInboxMedia/InserInboxAudio";
import InsertInboxFile from "./InsertInboxMedia/InsertInboxFile";
import InsertInboxImage from "./InsertInboxMedia/InsertInboxImage";
import InsertInboxVideo from "./InsertInboxMedia/InsertInboxVideo";
import WaQuickReplyControl, {
  isJSONString,
  WaQuickReply,
} from "./WaQuickReply";
import styles from "./waTextEditor.module.css";

interface WaTextEditorProps extends BoxComponentProps {
  handleInputChange: (value) => void;
  content: string;
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
}

export const CustomEnter = Extension.create({
  name: "customEnter",

  addOptions() {
    return {
      onEnter: () => {},
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        this.options.onEnter();
        return true;
      },
    };
  },
});

function WaTextEditor({
  handleInputChange,
  content = "",
  className = "",
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
  otherHeaders = null,
  isQuickReplyEditor = false,
  border,
  allowFiles = false,
  ...props
}: WaTextEditorProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplySearchQuery, setQuickReplySearchQuery] = useState("");
  const { addMedia } = useMediaStore();
  const extensions = useMemo(() => {
    const ext = [
      StarterKit.configure({ link: false }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: max,
      }),
    ];
    if (customEnter)
      ext.push(
        CustomEnter.configure({
          onEnter: customEnter,
        }) as any,
      );
    return ext;
  }, [customEnter]);
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
            handleTextInput(view, from, to, text) {
              if (text === "/" && !isQuickReplyEditor) {
                const slice = view.state.doc.slice(0, from);
                const textBefore = slice.content.textBetween(
                  0,
                  slice.content.size,
                  "\n",
                  "\n",
                );

                const match = textBefore.match(/\/([^\n]*)$/);
                const search = match?.[1]?.trim() ?? "";

                setSearchTerm(search);

                setShowQuickReplies(true);
              }
              return false;
            },

            handlePaste(view, event) {
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
  const { media, setSelectedMedia, selectedMedia, removeMedia } =
    useMediaStore();
  const { selectedContact } = useContactsStore();
  const { data: waSettings } = useWaSettings();
  const [flowModalOpened, { close: flowModalClose, open: openFlowModal }] =
    useDisclosure(false);
  const [
    automationModalOpened,
    { close: automationModalClose, open: openAutomationModal },
  ] = useDisclosure(false);

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
  const [isModalOpened, { close: onModalClose, open: openModal }] =
    useDisclosure(false);
  const { whatsappSettingsPhoneId, updatePhoneId } = usePhoneIdStore();

  const platform = selectedContact
    ? selectedContact.lastMessage?.sourcePlatform
    : null;
  const phone_number_id = useMemo(
    () =>
      waSettings
        ? waSettings?.find(
            (s) => s?.phone === selectedContact?.lastMessage?.sourceIdentifier,
          )?.phoneId
        : "",
    [waSettings],
  );

  useEffect(() => {
    if (!whatsappSettingsPhoneId && phone_number_id) {
      updatePhoneId(phone_number_id);
    }
    if (
      platform === MessagePlatform.INSTAGRAM &&
      whatsappSettingsPhoneId !== selectedContact?.lastMessage?.sourceIdentifier
    ) {
      updatePhoneId(selectedContact.lastMessage.sourceIdentifier);
    }
  }, [whatsappSettingsPhoneId, phone_number_id, updatePhoneId]);

  const isSessionExpired = isInboxSessionExpired(
    selectedContact?.lastReceivedMessageTimeStamp,
  );

  const AccountSelectComponent = () => {
    if (platform === MessagePlatform.WEBCHAT) return null;
    return (
      <AccountSelector
        onChange={(phoneId) => {
          updatePhoneId(phoneId);
        }}
        value={whatsappSettingsPhoneId}
        w={150}
        size="xs"
        styles={{
          input: {
            background: "var(--mantine-primary-color-light)",
            color: "var(--mantine-primary-color-filled)",
            borderRadius: "5px",
            fontWeight: "400",
          },
          label: {
            display: "none",
          },
        }}
        platform={platform as MessagePlatform}
        disabled={platform === MessagePlatform.INSTAGRAM}
        hideLabel={true}
      />
    );
  };

  useEffect(() => {
    const handler = async (e: any) => {
      const files: File[] = e.detail;

      for (const file of files) {
        try {
          const fileKey = await uploadFile(file);
          const fileUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${fileKey}`;

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
    <div
      className={`${border ? "border-t" : ""} bg-background shrink-0 relative`}
    >
      <div className="flex gap-1 ">
        {media.length > 0 &&
          media.map((me) => {
            return (
              <Indicator
                label={
                  <IconX
                    onClick={() => removeMedia(me.key)}
                    size={"1rem"}
                    style={{ cursor: "pointer" }}
                  />
                }
                size={16}
                color="red"
                inline
                key={me?.key}
              >
                <Stack
                  w={50}
                  h={50}
                  bd={"2px solid white"}
                  justify="center"
                  align="center"
                  style={{ zIndex: 9999 }}
                  onClick={() => {
                    if (["audio", "document"].includes(me.type)) return;
                    setSelectedMedia(me);
                    open();
                  }}
                >
                  {me.type === "image" && (
                    <Image src={me.url} width={48} height={48} alt={me.name} />
                  )}
                  {me.type === "video" && (
                    <video src={me.url} width={48} height={48} />
                  )}
                  {me.type === "document" && (
                    <Anchor href={me.url}>
                      <IconFileFilled color="white" size={"2rem"} />
                    </Anchor>
                  )}
                </Stack>
              </Indicator>
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
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="overflow-auto min-w-40 min-h-20 max-h-50 ">
            <WaQuickReply
              handleSelectQuickReply={(value) => {
                if (editor) {
                  const parsedValue = !isJSONString(value)
                    ? parseFromWhatsAppFormat(value)
                    : JSON.parse(value);

                  const { from } = editor.state.selection;
                  const textBefore = editor.state.doc.textBetween(
                    0,
                    from,
                    "\n",
                    "\n",
                  );

                  const match = textBefore.match(/\/[^\n]*$/);
                  if (match) {
                    editor
                      .chain()
                      .focus()
                      .deleteRange({ from: from - match[0].length, to: from })
                      .run();
                  }

                  editor.chain().focus().insertContent(parsedValue).run();
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
          {label} {required && <span className="text-red-500">*</span>}
        </div>
      )}
      <div className={`flex items-start ${border ? "p-4" : ""} pb-0 space-x-2`}>
        <div className="flex-1">
          <RichTextEditor
            classNames={{
              content: `rounded-xl overflow-y-auto`,
            }}
            editor={editor}
            styles={{
              root: {
                border: "none",
              },
              control: {
                border: "none",
              },
              content: {
                maxHeight: `${mah}px`,
                minHeight: `${mih}px`,
              },
            }}
          >
            <div className="relative">
              <RichTextEditor.Content
                bg={"var(--accent)"}
                style={{
                  borderRadius: "5px",
                }}
                className={`${
                  editor?.isFocused ? "ring-1 ring-(--grey-color-4)" : ""
                }`}
              />
              <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                <WaTextCharacterCount editor={editor} max={max} />
                {inbox && (
                  <CustomTooltip
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setShowQuickReplies((prev) => !prev)}
                      >
                        <Zap className="w-4 h-4 text-cyan-600" />
                      </Button>
                    }
                    content={<p>Quick Replies</p>}
                  />
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex flex-wrap p-2">
                <RichTextEditor.ControlsGroup className="mt-1">
                  <InsertEmoji />
                </RichTextEditor.ControlsGroup>
                <Popover>
                  <PopoverTrigger>
                    <CustomTooltip
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <TypeOutline className="w-5 h-5" />
                        </Button>
                      }
                      content={<span>Format Message</span>}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex gap-1 flex-nowrap">
                      <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Bold />
                        <RichTextEditor.Italic />
                        <RichTextEditor.Strikethrough />
                        <RichTextEditor.ClearFormatting />
                        <RichTextEditor.Code />
                      </RichTextEditor.ControlsGroup>

                      <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Blockquote />
                        <RichTextEditor.BulletList />
                        <RichTextEditor.OrderedList />
                      </RichTextEditor.ControlsGroup>
                    </div>
                  </PopoverContent>
                </Popover>
                <CustomTooltip
                  trigger={
                    <Button variant="ghost">
                      <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Undo />
                        <RichTextEditor.Redo />
                      </RichTextEditor.ControlsGroup>
                    </Button>
                  }
                  content={<span>Undo/Redo</span>}
                />
                {inbox && !isQuickReplyEditor && (
                  <Popover>
                    <PopoverTrigger>
                      <CustomTooltip
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Paperclip className="w-5 h-5" />
                          </Button>
                        }
                        content={<span>Insert Media</span>}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-full">
                      <div className="flex items-center justify-center flex-nowrap">
                        <RichTextEditor.ControlsGroup>
                          {platform !== MessagePlatform.INSTAGRAM && (
                            <InsertInboxFile />
                          )}
                          <InsertInboxImage />
                          <InsertInboxVideo />
                          <InsertInboxAudio />
                        </RichTextEditor.ControlsGroup>

                        <RichTextEditor.ControlsGroup>
                          {platform !== MessagePlatform.INSTAGRAM && (
                            <>
                              <InboxContactsControl />
                              <InboxLocationControl />
                            </>
                          )}
                        </RichTextEditor.ControlsGroup>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {inbox && platform === MessagePlatform.WHATSAPP && (
                  <div className="flex">
                    <CustomTooltip
                      trigger={
                        <Button
                          variant="ghost"
                          onClick={() => openModal()}
                          size="sm"
                        >
                          <LayoutTemplate className="w-4 h-4" />
                        </Button>
                      }
                      content={<span>Template</span>}
                    />
                    <CustomTooltip
                      trigger={
                        <Button
                          variant="ghost"
                          onClick={() => openFlowModal()}
                          size="sm"
                        >
                          <IconWaveSine className="w-4 h-4" />
                        </Button>
                      }
                      content={<span>Flow</span>}
                    />
                    <CustomTooltip
                      trigger={
                        <Button
                          variant="ghost"
                          onClick={() => openAutomationModal()}
                          size="sm"
                        >
                          <IconRobot className="w-4 h-4" />
                        </Button>
                      }
                      content={<span>Automation</span>}
                    />
                  </div>
                )}
                {inbox && platform !== MessagePlatform.WEBCHAT && (
                  <VoiceRecorder />
                )}
              </div>

              {inbox && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    Channel - to:
                  </span>
                  <AccountSelectComponent />
                </div>
              )}
            </div>
          </RichTextEditor>
        </div>
        <div className="mt-5">
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

const ShowMedia = ({ opened, close }) => {
  const { selectedMedia: media, removeMedia } = useMediaStore();
  if (!media) return null;
  return (
    <Modal onClose={close} opened={opened} centered>
      <Stack>
        <ActionIcon
          color="red"
          onClick={async () => {
            await removeMedia(media.key);
            close();
          }}
        >
          <IconTrash />
        </ActionIcon>
        {media.type === "image" && (
          <img
            src={media.url}
            width={"100%"}
            height={"100%"}
            alt={media.name}
          />
        )}
        {media.type === "video" && (
          <video src={media.url} width={"100%"} height={"100%"} controls />
        )}
      </Stack>
    </Modal>
  );
};

const WaTextCharacterCount = ({ editor, max }) => {
  const percentage = editor
    ? Math.round((100 / max) * editor.storage.characterCount.characters())
    : 0;
  return (
    <div
      className={`${styles["character-count"]} ${editor?.storage?.characterCount?.characters() === max ? styles["character-count--warning"] : ""}`}
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

export function parseToWhatsAppFormat(editorContent) {
  function formatText(text, type = "*") {
    let trimmedEnd = text.trimEnd();
    let trimmedStart = text.trimStart();
    let trimmed = text.trim();

    let leadingSpaces = " ".repeat(text.length - trimmedStart.length);
    let trailingSpaces = " ".repeat(text.length - trimmedEnd.length);
    let formattedText =
      trailingSpaces.length > 0 ? `${type}${trailingSpaces}${type}` : "";
    return `${leadingSpaces}${type}${trimmed}${type}${formattedText}`;
  }
  const parseNode = (node) => {
    if (!node) return "";
    switch (node.type) {
      case "paragraph":
        return node?.content?.map(parseNode).join("");
      case "text":
        let text = node.text;
        if (node.marks) {
          node.marks.forEach((mark) => {
            switch (mark.type) {
              case "bold":
                text = formatText(text, "*");
                break;
              case "italic":
                text = formatText(text, "_");
                break;
              case "strike":
                text = formatText(text, "~");
                break;
              case "code":
                text = `\`${text}\``;
                break;
              default:
                break;
            }
          });
        }
        return text;
      case "bulletList":
        return node.content.map((item) => `* ${parseNode(item)}`).join("\n");
      case "orderedList":
        return node.content
          .map((item, index) => `${index + 1}. ${parseNode(item)}`)
          .join("\n");
      case "blockquote":
        return node.content.map((item) => `> ${parseNode(item)}`).join("\n");
      case "codeBlock":
        return `\`\`\`${node.content.map(parseNode).join("")}\`\`\``;
      case "listItem":
        return node.content.map(parseNode).join("");
      default:
        return "";
    }
  };

  return editorContent.content.map(parseNode).join("\n");
}
interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  marks?: { type: string }[];
  text?: string;
}

export function parseFromWhatsAppFormat(text: string): {
  type: "doc";
  content: TiptapNode[];
} {
  // Helper to create text node with marks
  const createTextNode = (text: string, marks: string[] = []): TiptapNode => ({
    type: "text",
    text,
    ...(marks.length && { marks: marks.map((type) => ({ type })) }),
  });

  const paragraphs = text.split("\n\n");
  const content: TiptapNode[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;

    const paragraphNode: TiptapNode = {
      type: "paragraph",
      content: [],
    };

    let currentIndex = 0;
    let currentText = "";
    const activeMarks: string[] = [];

    while (currentIndex < paragraph.length) {
      const char = paragraph[currentIndex];

      // Handle WhatsApp style formatting
      switch (char) {
        case "*": {
          // Check if it's opening or closing bold
          const isClosing = activeMarks.includes("bold");
          if (currentText) {
            paragraphNode.content?.push(
              createTextNode(currentText, [...activeMarks]),
            );
            currentText = "";
          }
          if (isClosing) {
            activeMarks.splice(activeMarks.indexOf("bold"), 1);
          } else {
            activeMarks.push("bold");
          }
          break;
        }
        case "_": {
          // Check for italic
          const isClosing = activeMarks.includes("italic");
          if (currentText) {
            paragraphNode.content?.push(
              createTextNode(currentText, [...activeMarks]),
            );
            currentText = "";
          }
          if (isClosing) {
            activeMarks.splice(activeMarks.indexOf("italic"), 1);
          } else {
            activeMarks.push("italic");
          }
          break;
        }
        case "~": {
          // Check for strikethrough
          const isClosing = activeMarks.includes("strike");
          if (currentText) {
            paragraphNode.content?.push(
              createTextNode(currentText, [...activeMarks]),
            );
            currentText = "";
          }
          if (isClosing) {
            activeMarks.splice(activeMarks.indexOf("strike"), 1);
          } else {
            activeMarks.push("strike");
          }
          break;
        }
        case "`": {
          // Check for code
          const isClosing = activeMarks.includes("code");
          if (currentText) {
            paragraphNode.content?.push(
              createTextNode(currentText, [...activeMarks]),
            );
            currentText = "";
          }
          if (isClosing) {
            activeMarks.splice(activeMarks.indexOf("code"), 1);
          } else {
            activeMarks.push("code");
          }
          break;
        }
        default:
          currentText += char;
      }

      currentIndex++;
    }

    // Add any remaining text
    if (currentText) {
      paragraphNode.content?.push(
        createTextNode(currentText, [...activeMarks]),
      );
    }

    // Add paragraph if it has content
    if (paragraphNode.content?.length) {
      content.push(paragraphNode);
    }
  }

  return {
    type: "doc",
    content,
  };
}

export function parseWhatsAppToReact(text: string): React.ReactNode {
  const parseNode = (node: TiptapNode): React.ReactNode => {
    if (!node) return null;
    switch (node.type) {
      case "paragraph":
        return <p>{node.content?.map(parseNode)}</p>;
      case "text":
        let text = node.text;
        if (node.marks) {
          return node.marks.reduce((acc, mark) => {
            switch (mark.type) {
              case "bold":
                return <strong>{acc}</strong>;
              case "italic":
                return <em>{acc}</em>;
              case "strike":
                return <s>{acc}</s>;
              case "code":
                return <code>{acc}</code>;
              default:
                return acc;
            }
          }, text);
        }
        return text;
      case "bulletList":
        return (
          <ul>
            {node.content?.map((item, index) => (
              <li key={index}>{parseNode(item)}</li>
            ))}
          </ul>
        );
      case "orderedList":
        return (
          <ol>
            {node.content?.map((item, index) => (
              <li key={index}>{parseNode(item)}</li>
            ))}
          </ol>
        );
      case "blockquote":
        return <blockquote>{node.content?.map(parseNode)}</blockquote>;
      case "codeBlock":
        return (
          <pre>
            <code>{node.content?.map(parseNode)}</code>
          </pre>
        );
      case "listItem":
        return node.content?.map(parseNode);
      default:
        return null;
    }
  };

  const parsedContent = parseFromWhatsAppFormat(text);
  return parsedContent.content.map((node, index) => (
    <React.Fragment key={index}>{parseNode(node)}</React.Fragment>
  ));
}

export function parseJsonToReact(value) {
  if (typeof value === "string") return value;
  if (!value?.content?.[0]?.content) return "";
  const html = generateHTML(value, [StarterKit]);
  const cleaned = html.replace(/^<p>/, "").replace(/<\/p>$/, "");
  return parse(cleaned);
}

export function whatsappToHTML(text) {
  if (!text) return "";

  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html
    // Bold (*text*)
    .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
    // Italic (_text_)
    .replace(/_(.*?)_/g, "<em>$1</em>")
    // Strikethrough (~text~)
    .replace(/~(.*?)~/g, "<s>$1</s>")
    // Inline code (`code`)
    .replace(/`(.*?)`/g, "<code>$1</code>");

  //Alignment markers
  html = html
    .replace(
      /\[center\]([\s\S]*?)(?=\[|$)/g,
      '<div style="text-align:center;">$1</div>',
    )
    .replace(
      /\[right\]([\s\S]*?)(?=\[|$)/g,
      '<div style="text-align:right;">$1</div>',
    )
    .replace(
      /\[left\]([\s\S]*?)(?=\[|$)/g,
      '<div style="text-align:left;">$1</div>',
    );

  // --- Handle checkboxes / bullets / numbered lists ---
  html = html.replace(
    /(^|\\n)[\s]*[☑☐]\s?(.*?)(?=\\n|$)/g,
    "$1<div>☐ $2</div>",
  );

  // Replace lines that start with "-" or "*" or "•"
  html = html.replace(
    /(^|\\n)[\s]*[-*•]\s+(.*?)(?=\\n|$)/g,
    "$1<div>• $2</div>",
  );

  // Replace numbered list lines "1. text"
  html = html.replace(/(^|\\n)[\s]*\d+\.\s+(.*?)(?=\\n|$)/g, "$1<div>$2</div>");

  // --- Paragraphs & line breaks ---
  // Replace escaped newlines (\n or \\n) with <br>
  html = html.replace(/\\n|\\\\n|\n/g, "<br>");

  // Optional: convert multiple <br> sequences into paragraph breaks
  html = html.replace(/(<br>\s*){2,}/g, "</p><p>");

  return `<p style="font-size:0.875rem;line-spacing:1.25rem;">${html}</p>`;
}
