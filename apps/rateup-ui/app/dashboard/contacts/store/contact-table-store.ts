import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type ContactTableFilter = {
  searchTerm: string;
  lifecycleId: string;
  source: string;
};
export const useContactTableStore = create<{
  filter: ContactTableFilter;
  setFilter: (value: ContactTableFilter) => void;
  selectedContact: ContactsData;
  setSelectedContact: (contact: ContactsData) => void;
}>()(
  immer((set, get) => ({
    filter: {
      searchTerm: "",
      lifecycleId: "all",
      source: "all",
    },
    selectedContact: null,
    setFilter: (filter: ContactTableFilter) => {
      set({ filter });
    },
    setSelectedContact: (contact) => set({ selectedContact: contact }),
  })),
);
