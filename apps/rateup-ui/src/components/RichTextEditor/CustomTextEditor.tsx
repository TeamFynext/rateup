import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

import { EditorToolbar } from "@/components/tiptap/toolbars/editor-toolbar.tsx";

import InsertEmoji from "./InsertEmoji/index.tsx";
import InsertImage from "./InsertImage/index.tsx";
import { Video } from "./InsertVideo/CustomVideo.tsx";
import InsertVideo from "./InsertVideo/index.tsx";

export default function CustomTextEditor({
  content,
  onUpdate,
}: {
  content: string;
  onUpdate: (content: string) => void;
}) {
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

  if (!editor) return null;

  return (
    <div
      className="relative w-full overflow-hidden rounded-md border bg-card"
      style={{ height: 300 }}
    >
      <EditorToolbar editor={editor} />
      <div className="flex flex-row flex-wrap items-center gap-1.5 border-b px-2 py-1">
        <InsertEmoji editor={editor} />
        <InsertImage editor={editor} />
        <InsertVideo editor={editor} />
      </div>
      <EditorContent editor={editor} className="w-full cursor-text overflow-auto p-3" />
    </div>
  );
}
