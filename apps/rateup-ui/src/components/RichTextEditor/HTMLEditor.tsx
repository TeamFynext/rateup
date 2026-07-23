import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

import { EditorToolbar } from "@/components/tiptap/toolbars/editor-toolbar.tsx";

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
    <div style={{ width: "100%" }} className={`flex flex-col gap-4 ${className}`}>
      <div className="relative w-full overflow-hidden rounded-md border bg-card">
        {editor && <EditorToolbar editor={editor} />}
        <div className="flex w-full flex-row items-center gap-1.5 border-b px-2 py-1">
          <span className="text-blue-600 text-xs font-semibold">Page Title:</span>
        </div>
        <EditorContent
          editor={editor}
          className="w-full min-w-[500px] cursor-text p-3"
          style={{ minHeight: 20 }}
        />
      </div>

      <div className="relative w-full overflow-hidden rounded-md border bg-card">
        {codeEditor && <EditorToolbar editor={codeEditor} />}
        <div className="flex flex-row items-center gap-1.5 border-b px-2 py-1">
          <span className="text-blue-600 text-xs font-semibold">HTML CODE:</span>
        </div>
        <EditorContent
          editor={codeEditor}
          className="w-full min-w-[500px] cursor-text p-3"
          style={{ minHeight: 120 }}
        />
      </div>
    </div>
  );
}

export default HTMLEditor;
