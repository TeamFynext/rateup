import { create } from "zustand";

/** The message an agent chose to quote in their next reply (Instagram inline reply). */
export type ReplyTarget = {
  /** The chat it was picked in, so another chat's composer never sends it. */
  contactId: string;
  /** Meta's id for the quoted message (`WaMessage.messageId`). */
  mid: string;
  /** Short text shown in the composer's quote strip. */
  preview: string;
  author?: string | null;
};

type ReplyTargetState = {
  target: ReplyTarget | null;
  setTarget: (target: ReplyTarget) => void;
  clear: () => void;
};

/** Set by a bubble's long-press "Reply", read by the composer, cleared after a send. */
export const useReplyTargetStore = create<ReplyTargetState>((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
  clear: () => set({ target: null }),
}));
