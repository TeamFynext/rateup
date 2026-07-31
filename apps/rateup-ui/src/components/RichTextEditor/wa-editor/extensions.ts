import type { AnyExtension } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { CharacterCount } from "@tiptap/extensions";
import { Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { MutableRefObject } from "react";

import type { MentionUser } from "../mention/MentionList.tsx";
import { createMentionSuggestion } from "../mention/suggestion.ts";

/** Submits on Enter instead of inserting a newline (inbox composer). */
export const CustomEnter = Extension.create({
  name: "customEnter",

  addOptions() {
    return {
      onEnter: () => {},
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        this.options.onEnter();
        return true;
      },
    };
  },
});

export interface WaExtensionOptions {
  placeholder?: string;
  /** Character limit enforced by CharacterCount. */
  max?: number;
  /** When provided, Enter runs this instead of inserting a newline. */
  customEnter?: () => void;
  /** Enable @-mentions of teammates (private-note composer). */
  enableMention?: boolean;
  /**
   * Ref holding the current mention candidates. A ref (not a plain array) so the
   * suggestion list stays current without rebuilding the extension list.
   */
  mentionUsersRef?: MutableRefObject<MentionUser[]>;
}

/**
 * The shared extension list for every WhatsApp-style editor in the app.
 * Build it inside a `useMemo` and hand the result straight to `useEditor`.
 */
export function createWaExtensions({
  placeholder = "Enter your text",
  max = 1024,
  customEnter,
  enableMention = false,
  mentionUsersRef,
}: WaExtensionOptions = {}) {
  const ext: AnyExtension[] = [
    StarterKit.configure({ link: false }),
    Placeholder.configure({ placeholder }),
    CharacterCount.configure({ limit: max }),
  ];

  if (customEnter) {
    ext.push(CustomEnter.configure({ onEnter: customEnter }));
  }

  if (enableMention && mentionUsersRef) {
    ext.push(
      Mention.configure({
        HTMLAttributes: {
          class: "rounded bg-primary/10 px-1 font-medium text-primary",
        },
        suggestion: createMentionSuggestion(() => mentionUsersRef.current),
      }),
    );
  }

  return ext;
}
