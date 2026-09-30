import { create } from "zustand";

export type ComposerTab = "message" | "private";

type ComposerTabState = {
  activeTab: ComposerTab;
  setActiveTab: (tab: ComposerTab) => void;
};

/**
 * Whether the composer writes a message or a private note. Lives outside the footer
 * so the thread can reset it per ticket; the footer unmounts (blocked contact,
 * closed ticket).
 */
export const useComposerTabStore = create<ComposerTabState>((set) => ({
  activeTab: "message",
  setActiveTab: (activeTab) => set({ activeTab }),
}));
