import { useEffect } from "react";

import { Link, RichTextEditor } from "@mantine/tiptap";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { isHtml } from "../../utils";

export default function TextEditor({ form, selectedLanguage }) {
  const content = getContent(
    form.values?.title?.[selectedLanguage],
    form.values?.description?.[selectedLanguage],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      form.setFieldValue(`title.${selectedLanguage}`, editor.getHTML());
      if (form.values?.description?.[selectedLanguage]) {
        form.setFieldValue(`description.${selectedLanguage}`, "");
      }
    },
  });

  useEffect(() => {
    if (editor) {
      editor.commands.setContent(content, null, {
        preserveWhitespace: "full",
      });
    }
  }, [content, editor, selectedLanguage]);

  return (
    <RichTextEditor editor={editor}>
      <RichTextEditor.Toolbar sticky>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.ColorPicker
            colors={[
              "#25262b",
              "#868e96",
              "#fa5252",
              "#e64980",
              "#be4bdb",
              "#7950f2",
              "#4c6ef5",
              "#228be6",
              "#15aabf",
              "#12b886",
              "#40c057",
              "#82c91e",
              "#fab005",
              "#fd7e14",
            ]}
            popoverProps={{
              withinPortal: false,
            }}
          />
          <RichTextEditor.UnsetColor />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold />
          <RichTextEditor.Italic />
          <RichTextEditor.Strikethrough />
          <RichTextEditor.ClearFormatting />
          <RichTextEditor.Code />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.H1 />
          <RichTextEditor.H2 />
          <RichTextEditor.H3 />
          <RichTextEditor.H4 />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Blockquote />
          <RichTextEditor.Hr />
          <RichTextEditor.BulletList />
          <RichTextEditor.OrderedList />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Link />
          <RichTextEditor.Unlink />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.AlignLeft />
          <RichTextEditor.AlignCenter />
          <RichTextEditor.AlignJustify />
          <RichTextEditor.AlignRight />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Undo />
          <RichTextEditor.Redo />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>

      <RichTextEditor.Content />
    </RichTextEditor>
  );
}

const getContent = (title: string, desc: string) => {
  if (isHtml(title)) {
    return title;
  } else if (desc) {
    return `<h3>${title}</h3><p> ${desc}</p>`;
  } else {
    return `<h3>${title}</h3>`;
  }
};
