"use client";

import { useEffect } from "react";

import { Link, RichTextEditor } from "@mantine/tiptap";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Youtube from "@tiptap/extension-youtube";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import InsertEmoji from "./InsertEmoji";
import InsertImage from "./InsertImage";
import InsertVideo from "./InsertVideo";
import { Video } from "./InsertVideo/CustomVideo";

export default function CustomTextEditor({ content, onUpdate }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link,
      Color,
      TextStyle,
      Youtube,
      Video,
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    shouldRerenderOnTransaction: true,
    immediatelyRender: false,
    content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content) {
      if (!content.startsWith("<")) {
        editor.commands.setHeading({ level: 3 });
      }
      const selection = editor.state.selection;
      editor.commands.setTextSelection(selection);
    }
  }, [content, editor]);

  return (
    <RichTextEditor editor={editor} h={300}>
      <RichTextEditor.Toolbar sticky stickyOffset={60}>
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
          />
          <RichTextEditor.UnsetColor />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold />
          <RichTextEditor.Italic />
          <RichTextEditor.Underline />
          <RichTextEditor.Strikethrough />
          <RichTextEditor.ClearFormatting />
          <RichTextEditor.Highlight />
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
        <RichTextEditor.ControlsGroup>
          <InsertEmoji />
          <InsertImage />
          <InsertVideo />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>

      <RichTextEditor.Content />
    </RichTextEditor>
  );
}
