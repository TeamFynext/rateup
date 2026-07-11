import { Group, Stack, Text } from "@mantine/core";
import { Link, RichTextEditor } from "@mantine/tiptap";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

import CustomImageExtension from "./InsertImage/CustomImageExtenstion.tsx";

interface HTMLEditorProps {
  titleValue?: string;
  descriptionValue?: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  className?: string;
}

function HTMLEditor({
  titleValue,
  descriptionValue,
  onTitleChange,
  onDescriptionChange,
  className = "",
}: HTMLEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Placeholder.configure({
        placeholder: "Enter your question",
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CustomImageExtension,
    ],
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    content: titleValue,
    onUpdate: ({ editor }) => {
      onTitleChange(editor.getHTML());
    },
  });

  const codeEditor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link,
      Placeholder.configure({
        placeholder: "Enter HTML Code here",
      }),
    ],
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    content: descriptionValue,
    onUpdate: ({ editor }) => {
      onDescriptionChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor) {
      const selection = editor.state.selection;
      editor.commands.setContent(titleValue, {
        parseOptions: { preserveWhitespace: "full" },
      });
      editor.commands.setTextSelection(selection);
      onTitleChange(editor.getHTML());
    }
  }, [titleValue, editor]);

  useEffect(() => {
    if (codeEditor) {
      const selection = codeEditor.state.selection;
      codeEditor.commands.setContent(descriptionValue, {
        parseOptions: { preserveWhitespace: "full" },
      });
      codeEditor.commands.setTextSelection(selection);
      onDescriptionChange(codeEditor.getHTML());
    }
  }, [descriptionValue, codeEditor]);

  return (
    <Stack style={{ width: "100%" }} className={className}>
      <RichTextEditor editor={editor}>
        <RichTextEditor.Toolbar sticky tabIndex={-1}>
          <Group gap={"xs"} style={{ width: "100%" }}>
            <Text c="blue" size="xs" fw={600}>
              Page Title:
            </Text>
          </Group>
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content mih={20} miw={500} style={{ width: "100%" }} />
      </RichTextEditor>

      <RichTextEditor editor={codeEditor}>
        <RichTextEditor.Toolbar sticky tabIndex={-1}>
          <Group gap={"xs"}>
            <Text c="blue" size="xs" fw={600}>
              HTML CODE:
            </Text>
          </Group>
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content mih={120} miw={500} style={{ width: "100%" }} />
      </RichTextEditor>
    </Stack>
  );
}

export default HTMLEditor;
