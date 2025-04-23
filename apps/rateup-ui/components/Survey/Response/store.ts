import { create, createStore } from "zustand";

interface ResponseFilter {
  enableServerFilter: boolean;
  setServerFilters: (value) => void;
  serverFilters: object;
  setEnableServerFilter: (value) => void;
}
export const useResponseFilterStore = create<ResponseFilter>((set) => ({
  enableServerFilter: true,
  serverFilters: null,
  setServerFilters: (value) => set({ serverFilters: value }),
  setEnableServerFilter: (value) => set({ enableServerFilter: value }),
}));
