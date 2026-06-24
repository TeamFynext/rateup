import { Group, Stack, Text } from "@mantine/core";
import { Link, RichTextEditor } from "@mantine/tiptap";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

import CustomImageExtension from "./InsertImage/CustomImageExtenstion.tsx";

function HTMLEditor({ form, selectedLanguage, className = "" }) {
  const content = form.values?.title?.[selectedLanguage];
  const htmlContent = form.values?.description?.[selectedLanguage];

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
    content: content,
    onUpdate: ({ editor }) => {
      form.setFieldValue(`title.${selectedLanguage}`, editor.getHTML());
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
    content: htmlContent,
    onUpdate: ({ editor }) => {
      form.setFieldValue(`description.${selectedLanguage}`, editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor) {
      const selection = editor.state.selection;
      editor.commands.setContent(content, {
        parseOptions: { preserveWhitespace: "full" },
      });
      editor.commands.setTextSelection(selection);
      form.setFieldValue(`title.${selectedLanguage}`, editor.getHTML());
    }
  }, [content, editor]);

  useEffect(() => {
    if (codeEditor) {
      const selection = codeEditor.state.selection;
      codeEditor.commands.setContent(htmlContent, {
        parseOptions: { preserveWhitespace: "full" },
      });
      codeEditor.commands.setTextSelection(selection);
      form.setFieldValue(`description.${selectedLanguage}`, codeEditor.getHTML());
    }
  }, [htmlContent, codeEditor]);

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
