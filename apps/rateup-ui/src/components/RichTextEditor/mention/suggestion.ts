import type { MentionOptions } from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";

import { MentionList, type MentionListRef, type MentionUser } from "./MentionList.tsx";

const MAX_SUGGESTIONS = 8;

/**
 * Suggestion config for the @-mention extension. `getUsers` is read lazily (from a
 * ref) so the list stays current even though the editor — and this config — are
 * created once. The popup is a fixed-position element parked below the caret; no
 * external positioning lib needed.
 */
export function createMentionSuggestion(
  getUsers: () => MentionUser[],
): MentionOptions<MentionUser>["suggestion"] {
  return {
    char: "@",
    items: ({ query }) => {
      const q = query.trim().toLowerCase();
      return getUsers()
        .filter((u) => u?.name && (!q || u.name.toLowerCase().includes(q)))
        .slice(0, MAX_SUGGESTIONS);
    },
    render: () => {
      let component: ReactRenderer<MentionListRef> | null = null;
      let el: HTMLDivElement | null = null;

      const place = (clientRect?: (() => DOMRect | null) | null) => {
        const rect = clientRect?.();
        if (!el || !rect) return;
        el.style.position = "fixed";
        el.style.left = `${rect.left}px`;
        el.style.top = `${rect.bottom + 6}px`;
        el.style.zIndex = "9999";
      };

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, { props, editor: props.editor });
          el = document.createElement("div");
          el.appendChild(component.element);
          document.body.appendChild(el);
          place(props.clientRect);
        },
        onUpdate: (props) => {
          component?.updateProps(props);
          place(props.clientRect);
        },
        onKeyDown: (props) => {
          // Escape isn't handled here — let the suggestion utility close the popup.
          if (props.event.key === "Escape") return false;
          return component?.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => {
          el?.remove();
          component?.destroy();
          el = null;
          component = null;
        },
      };
    },
  };
}
