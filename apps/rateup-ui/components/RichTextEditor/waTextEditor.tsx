"use client";

import React, { useEffect, useMemo } from "react";

import {
  ActionIcon,
  Anchor,
  Box,
  BoxComponentProps,
  Flex,
  Group,
  Image,
  Indicator,
  Modal,
  Popover,
  ScrollAreaAutosize,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { RichTextEditor } from "@mantine/tiptap";
import {
  IconFileFilled,
  IconPaperclip,
  IconTrash,
  IconTypography,
  IconX,
} from "@tabler/icons-react";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import { Extension, generateHTML, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import parse from "html-react-parser";

import { MessagePlatform } from "@/types/enums";
import { useContactsStore } from "@/app/dashboard/inbox/store";

import { useMediaStore } from "../whatsapp/inbox/chatdisplay/chatdisplayFooter";
import InboxContactsControl from "./InboxContactMessage";
import InboxLocationControl from "./InboxLocation";
import InsertEmoji from "./InsertEmoji";
import InsertInboxAudio from "./InsertInboxMedia/InserInboxAudio";
import InsertInboxFile from "./InsertInboxMedia/InsertInboxFile";
import InsertInboxImage from "./InsertInboxMedia/InsertInboxImage";
import InsertInboxVideo from "./InsertInboxMedia/InsertInboxVideo";
import WaQuickReplyControl from "./WaQuickReply";
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
  customEnter?: () => void;
  editable?: boolean;
  customHeaders?: React.ReactNode;
  otherHeaders?: React.ReactNode;
  isQuickReplyEditor?: boolean;
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
  mah = 350,
  placeholder = "Enter your text",
  label = "",
  max = 1024,
  required = false,
  mih = 120,
  inbox = false,
  customEnter,
  editable = true,
  customHeaders = null,
  otherHeaders = null,
  isQuickReplyEditor = false,
  ...props
}: WaTextEditorProps) {
  const [opened, { open, close }] = useDisclosure(false);
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
        }),
      );
    return ext;
  }, [customEnter]);
  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      handleInputChange(editor.getJSON());
    },
    editable,
  });
  const { media, setSelectedMedia, selectedMedia, removeMedia } =
    useMediaStore();
  const { selectedContact } = useContactsStore();
  const platform =
    selectedContact?.source?.toUpperCase() !== MessagePlatform.INSTAGRAM
      ? MessagePlatform.WHATSAPP
      : MessagePlatform.INSTAGRAM;

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

  return (
    <Box {...props}>
      <Text
        fz={12}
        c={
          "light-dark(var(--mantine-color-gray-7), var(--mantine-color-gray-4))"
        }
      >
        {label}{" "}
        <span
          style={{
            color: "var(--mantine-color-red-6)",
            fontWeight: 700,
          }}
        >
          {required ? "*" : ""}
        </span>
      </Text>
      <Group gap={1}>
        {media.length &&
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
      </Group>

      <RichTextEditor editor={editor} className={className} bg={"white"}>
        <RichTextEditor.Toolbar sticky tabIndex={-1} p={2}>
          <WaTextCharacterCount editor={editor} max={max} /> {otherHeaders}
        </RichTextEditor.Toolbar>
        <Modal opened={opened} onClose={close} title="Text Formatting" centered>
          <Group gap="md">
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
          </Group>
        </Modal>
        <ScrollAreaAutosize mah={mah}>
          <RichTextEditor.Content mih={mih} />
        </ScrollAreaAutosize>
        <Flex justify="space-between" align="center" w="100%" px="sm" py={6}>
          <Group gap="xs">
            <Popover position="top-start" withArrow shadow="md">
              <Popover.Target>
                <ActionIcon variant="default">
                  <IconTypography size={18} color="#343A40" />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <Group gap="sm" wrap="nowrap">
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
                </Group>
              </Popover.Dropdown>
            </Popover>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Undo />
              <RichTextEditor.Redo />
            </RichTextEditor.ControlsGroup>

            {inbox && !isQuickReplyEditor && (
              <Popover position="top-start" withArrow shadow="md">
                <Popover.Target>
                  <ActionIcon variant="default">
                    <IconPaperclip size={18} color="#343A40" />
                  </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown>
                  <Group gap="sm" wrap="nowrap">
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
                  </Group>
                </Popover.Dropdown>
              </Popover>
            )}
            {!isQuickReplyEditor && <WaQuickReplyControl />}

            <RichTextEditor.ControlsGroup>
              <InsertEmoji />
            </RichTextEditor.ControlsGroup>
          </Group>
          <Group gap="xs">{customHeaders}</Group>
        </Flex>
      </RichTextEditor>
    </Box>
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
  return parse(generateHTML(value, [StarterKit]));
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

  return `<p>${html}</p>`;
}
