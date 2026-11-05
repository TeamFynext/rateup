import { create } from "zustand";

/** The message an agent chose to quote in their next reply (Instagram inline reply). */
export type ReplyTarget = {
  /** Meta's id for the quoted message (`WaMessage.messageId`). */
  mid: string;
  /** Short text shown in the composer's quote strip. */
  preview: string;
  /** Who wrote the quoted message, for the strip's label. */
  author?: string | null;
};

type ReplyTargetState = {
  target: ReplyTarget | null;
  setTarget: (target: ReplyTarget) => void;
  clear: () => void;
};

/**
 * Set by a bubble's "Reply" action, read by the composer, cleared after a send or
 * when the agent switches ticket. Outside the footer for the same reason as
 * `useComposerTabStore`: the bubble and the composer are far apart in the tree.
 */
export const useReplyTargetStore = create<ReplyTargetState>((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
  clear: () => set({ target: null }),
}));
