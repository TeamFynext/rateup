import type { Editor } from "@tiptap/react";

import { PopoverEmojiPicker } from "@/components/whatsapp/templates/Details/TextFormateToolBar.tsx";

function InsertEmoji({ editor }: { editor: Editor | null }) {
  return (
    <div
      aria-label="Insert emoji"
      title="Insert emoji"
      className="inline-flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9"
    >
      <PopoverEmojiPicker onEmojiClick={(emoji) => editor?.commands?.insertContent(emoji)} />
    </div>
  );
}

export default InsertEmoji;
