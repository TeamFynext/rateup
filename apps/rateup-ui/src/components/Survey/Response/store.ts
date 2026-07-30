import { create } from "zustand";

interface ResponseFilter {
  enableServerFilter: boolean;
  setServerFilters: (value: Record<string, unknown>) => void;
  serverFilters: Record<string, unknown> | null;
  setEnableServerFilter: (value: boolean) => void;
}
export const useResponseFilterStore = create<ResponseFilter>((set) => ({
  enableServerFilter: true,
  serverFilters: null,
  setServerFilters: (value) => set({ serverFilters: value }),
  setEnableServerFilter: (value) => set({ enableServerFilter: value }),
}));
