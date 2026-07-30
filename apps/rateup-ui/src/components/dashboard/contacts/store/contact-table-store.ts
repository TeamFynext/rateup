import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface ContactTableFilter {
  searchTerm: string;
  lifecycleId: string;
  source: string;
  labelId: string;
}
export const useContactTableStore = create<{
  filter: ContactTableFilter;
  setFilter: (value: ContactTableFilter) => void;
  selectedContact: ContactsData;
  setSelectedContact: (contact: ContactsData) => void;
}>()(
  immer((set, _get) => ({
    filter: {
      searchTerm: "",
      lifecycleId: "all",
      source: "all",
      labelId: "all",
    },
    selectedContact: null,
    setFilter: (filter: ContactTableFilter) => {
      set({ filter });
    },
    setSelectedContact: (contact) => set({ selectedContact: contact }),
  })),
);
