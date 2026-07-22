import { create } from "zustand";

export type ComposerTab = "message" | "private";

type ComposerTabState = {
  activeTab: ComposerTab;
  setActiveTab: (tab: ComposerTab) => void;
};

/**
 * The composer tab doubles as the thread's view mode: switching to "Private
 * Note" also switches the thread above it to the internal-notes-only view, so
 * writing a note and reading the note history are the same place.
 *
 * It lives outside the footer because the thread body reads it too, and the
 * footer unmounts (blocked contact, expired session, closed ticket).
 */
export const useComposerTabStore = create<ComposerTabState>((set) => ({
  activeTab: "message",
  setActiveTab: (activeTab) => set({ activeTab }),
}));
