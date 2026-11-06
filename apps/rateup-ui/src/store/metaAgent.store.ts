import { create } from "zustand";

/**
 * Which WhatsApp channel the Meta AI Agent pages are configuring.
 *
 * A store rather than state on the agent's layout because two trees read it: the
 * pages, and the sidebar's step rail, whose done ticks and progress meter belong
 * to the same channel the page is showing. `null` means "not picked yet" — both
 * fall back to the first connected channel.
 */
export const useMetaAgentChannelStore = create<{
  waSettingsId: string | null;
  setWaSettingsId: (id: string) => void;
}>((set) => ({
  waSettingsId: null,
  setWaSettingsId: (waSettingsId) => set({ waSettingsId }),
}));
