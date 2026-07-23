import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { CharacterCount } from "@tiptap/extensions";
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  BoldIcon,
  ItalicIcon,
  Link2Icon,
  Link2OffIcon,
  ListIcon,
  ListOrderedIcon,
  RedoIcon,
  RemoveFormattingIcon,
  StrikethroughIcon,
  UndoIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Markdown } from "tiptap-markdown";

import { Button } from "@/components/ui/button.tsx";
import { Separator } from "@/components/ui/separator.tsx";

import styles from "./TiptapMarkdown.module.css";

/** Single toolbar control; highlights itself when its mark/node is active. */
function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: Readonly<{
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}>) {
  return (
    <Button
      type="button"
      size="icon-xs"
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

function Toolbar({ editor }: Readonly<{ editor: Editor }>) {
  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <StrikethroughIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Clear formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().run()}
      >
        <RemoveFormattingIcon />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-5" />

      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Ordered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrderedIcon />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-5" />

      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
        <Link2Icon />
      </ToolbarButton>
      <ToolbarButton
        label="Unlink"
        disabled={!editor.isActive("link")}
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        <Link2OffIcon />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-5" />

      <ToolbarButton
        label="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <RedoIcon />
      </ToolbarButton>
    </div>
  );
}

function TiptapMarkdown({ value, onChange, label, max, disabled }) {
  const content = value || "";
  const isUpdatingFromEditor = useRef(false);

  const editor = useEditor({
    editable: !disabled,
    content: content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ link: false }),
      Markdown,
      Link,
      Image.configure({
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: `Enter your ${label === "text" ? "text" : "title"} here`,
      }),
      CharacterCount.configure({
        limit: max,
      }),
    ],
    onUpdate: ({ editor }) => {
      isUpdatingFromEditor.current = true;
      onChange((editor.storage as any).markdown.getMarkdown());
      setTimeout(() => {
        isUpdatingFromEditor.current = false;
      }, 0);
    },
    onBlur: ({ editor }) => {
      onChange((editor.storage as any).markdown.getMarkdown());
    },
    editorProps: {
      attributes: {
        class: styles["tiptap-div"],
      },
    },
  });
  useEffect(() => {
    if (editor && !isUpdatingFromEditor.current) {
      const currentMarkdown = (editor.storage as any).markdown.getMarkdown();
      // Only update content from props if it differs from editor content
      // and either the editor is NOT focused (external update)
      // or the content is completely different (reset/change)
      if (content !== currentMarkdown && !editor.isFocused) {
        const selection = editor.state.selection;
        editor.commands.setContent(content);
        editor.commands.setTextSelection(selection);
      }
    }
  }, [content, editor]);
  const percentage = editor
    ? Math.round((100 / max) * editor.storage.characterCount.characters())
    : 0;

  return (
    <div className={`${styles["root-div"]} rounded-md border border-border`}>
      {editor && (
        <div
          tabIndex={-1}
          className={`${styles["toolbar-div"]} sticky top-0 z-10 border-b border-border bg-background p-1 ${
            disabled ? "hidden" : "block"
          }`}
        >
          <Toolbar editor={editor} />
        </div>
      )}
      <EditorContent editor={editor} className={styles["editor-content"]} />
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
    </div>
  );
}

export default TiptapMarkdown;
