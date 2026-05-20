"use client";

import { RichTextEditor, useRichTextEditorContext } from "@mantine/tiptap";

import { PopoverEmojiPicker } from "@/components/whatsapp/templates/Details/TextFormateToolBar.tsx";

function InsertEmoji() {
  const { editor } = useRichTextEditorContext();
  return (
    <RichTextEditor.Control
      component={"div"}
      aria-label="Insert emoji"
      title="Insert emoji"
    >
      <PopoverEmojiPicker
        onEmojiClick={(emoji) => editor?.commands?.insertContent(emoji)}
      />
    </RichTextEditor.Control>
  );
}

export default InsertEmoji;
