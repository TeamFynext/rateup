import type { Content, JSONContent } from "@tiptap/react";
import { useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef } from "react";

import type { MentionUser } from "../mention/MentionList.tsx";
import { createWaExtensions } from "./extensions.ts";

export interface UseWaEditorOptions {
  /** Current value, as stored (tiptap JSON or a WhatsApp-formatted string). */
  content?: Content;
  placeholder?: string;
  max?: number;
  editable?: boolean;
  /** Receives the editor's JSON on every change. */
  onChange?: (value: JSONContent) => void;
  /** Enter submits instead of inserting a newline. */
  customEnter?: () => void;
  enableMention?: boolean;
  mentionUsers?: MentionUser[];
}

/**
 * Creates a WhatsApp-style tiptap editor: shared extension list, JSON `onChange`,
 * and external-content sync that preserves the caret.
 *
 * This is deliberately a hook, not a component — every call site renders its own
 * markup inline, so there is no editor wrapper component to go stale.
 */
export function useWaEditor({
  content = "",
  placeholder = "Enter your text",
  max = 1024,
  editable = true,
  onChange,
  customEnter,
  enableMention = false,
  mentionUsers,
}: UseWaEditorOptions = {}) {
  // A ref (not the array) so the suggestion list stays current without
  // rebuilding the extension list and tearing down the editor.
  const mentionUsersRef = useRef<MentionUser[]>([]);
  mentionUsersRef.current = mentionUsers ?? [];

  // Read through a ref: callers pass a new function every render, and rebuilding the
  // extension list for each one would reconfigure the editor on every keystroke.
  const onEnterRef = useRef(customEnter);
  onEnterRef.current = customEnter;
  const submitsOnEnter = customEnter !== undefined;
  const extensions = useMemo(
    () =>
      createWaExtensions({
        placeholder,
        max,
        customEnter: submitsOnEnter ? () => onEnterRef.current?.() : undefined,
        enableMention,
        mentionUsersRef,
      }),
    [submitsOnEnter, enableMention, placeholder, max],
  );

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable,
    onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
  });

  useEffect(() => {
    if (!editor) return;
    const selection = editor.state.selection;
    editor.commands.setContent(content, { parseOptions: { preserveWhitespace: "full" } });
    editor.commands.setTextSelection(selection);
  }, [content, editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  return editor;
}
