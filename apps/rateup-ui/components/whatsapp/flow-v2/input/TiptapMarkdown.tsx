import { useEffect } from "react";

import { Group } from "@mantine/core";
import { Link, RichTextEditor } from "@mantine/tiptap";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

import InsertTable from "@/components/RichTextEditor/InsertTable";

import styles from "./TiptapMarkdown.module.css";

function TiptapMarkdown({ form }) {
  let content = form.values?.text || "";
  const editor = useEditor({
    content: content,
    extensions: [
      StarterKit,
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
    ],
    onUpdate: ({ editor }) => {
      form.setFieldValue("text", editor.storage.markdown.getMarkdown());
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

  return (
    <RichTextEditor editor={editor} className={styles["root-div"]}>
      <RichTextEditor.Toolbar
        sticky
        tabIndex={-1}
        className={styles["toolbar-div"]}
      >
        <Group gap={"xs"}>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.ClearFormatting />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H1 />
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
            <RichTextEditor.H4 />
            <RichTextEditor.H5 />
            <RichTextEditor.H6 />
          </RichTextEditor.ControlsGroup>

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
            {/* <InsertBase64Image /> */}
            <InsertTable />
          </RichTextEditor.ControlsGroup>
        </Group>
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content mih={120} className={styles["editor-content"]} />
    </RichTextEditor>
  );
}

export default TiptapMarkdown;
