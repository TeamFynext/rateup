import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { EditorToolbar } from "@/components/tiptap/toolbars/editor-toolbar.tsx";
import { Button } from "@/components/ui/button.tsx";

import InsertEmoji from "./InsertEmoji/index.tsx";
import InsertImage from "./InsertImage/index.tsx";
import { Video } from "./InsertVideo/CustomVideo.tsx";

export default function TicketTextEditor({ content, onUpdate, placeholder = "", saveBtn = false }) {
  // const [focus, setFocus] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Image,
      Link,
      Color,
      TextStyle,
      Youtube,
      Video,
      TextAlign.configure({ types: ["paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      if (saveBtn) return;
      onUpdate(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-md border bg-card">
      <EditorToolbar editor={editor} />
      <div className="flex flex-row flex-wrap items-center gap-1.5 border-b px-2 py-1">
        <InsertEmoji editor={editor} />
        <InsertImage editor={editor} />
        {saveBtn && (
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => {
              onUpdate(editor.getHTML());
              editor.commands.clearContent();
            }}
          >
            Submit
          </Button>
        )}
      </div>
      <EditorContent editor={editor} className="w-full cursor-text p-3" />
    </div>
  );
}
