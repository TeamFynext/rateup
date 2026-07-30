import { create } from "zustand";

import type { ColumnFilterState } from "@/types/api.ts";

interface ResponseFilter {
  enableServerFilter: boolean;
  setServerFilters: (value: ColumnFilterState[]) => void;
  serverFilters: object;
  setEnableServerFilter: (value: boolean) => void;
}
export const useResponseFilterStore = create<ResponseFilter>((set) => ({
  enableServerFilter: true,
  serverFilters: null,
  setServerFilters: (value) => set({ serverFilters: value }),
  setEnableServerFilter: (value) => set({ enableServerFilter: value }),
}));
