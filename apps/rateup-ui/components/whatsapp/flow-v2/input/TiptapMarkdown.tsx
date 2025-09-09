"use client";

import { useEffect } from "react";

import { Group } from "@mantine/core";
import { Link, RichTextEditor } from "@mantine/tiptap";
import CharacterCount from "@tiptap/extension-character-count";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

// import InsertBase64Image from "@/components/RichTextEditor/InsertImage/insertBase64Image";
// import InsertTable from "@/components/RichTextEditor/InsertTable";

import styles from "./TiptapMarkdown.module.css";

function TiptapMarkdown({ value, onChange, label, max, disabled }) {
  let content = value || "";
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
    if (editor) {
      const selection = editor.state.selection;
      editor.commands.setContent(content);
      editor.commands.setTextSelection(selection);
    }
  }, [content, editor]);
  const percentage = editor
    ? Math.round((100 / max) * editor.storage.characterCount.characters())
    : 0;
  return (
    <RichTextEditor editor={editor} className={styles["root-div"]}>
      <RichTextEditor.Toolbar
        sticky
        tabIndex={-1}
        className={styles["toolbar-div"]}
        display={disabled ? "none" : "block"}
      >
        <Group gap={"xs"}>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.ClearFormatting />
          </RichTextEditor.ControlsGroup>
          {/* Todo: add this again when richtext can be included with other component */}
          {/* <RichTextEditor.ControlsGroup>
            <RichTextEditor.H1 />
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
            <RichTextEditor.H4 />
            <RichTextEditor.H5 />
            <RichTextEditor.H6 />
          </RichTextEditor.ControlsGroup> */}

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Link popoverProps={{ withinPortal: false }} />
            <RichTextEditor.Unlink />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Undo />
            <RichTextEditor.Redo />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            {/* Todo: add this again when richtext can be included with other component */}
            {/* <InsertBase64Image /> 
            <InsertTable /> */}
          </RichTextEditor.ControlsGroup>
        </Group>
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content className={styles["editor-content"]} />
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
    </RichTextEditor>
  );
}

export default TiptapMarkdown;
