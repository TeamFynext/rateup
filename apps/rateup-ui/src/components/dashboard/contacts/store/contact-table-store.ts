import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface ContactTableFilter {
  searchTerm: string;
  /** Kept for orgs with no board, where the lifecycle filter still shows. */
  lifecycleId: string;
  /** The board column a contact's lead sits in — the pipeline counterpart. */
  stageId: string;
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
      stageId: "all",
      source: "all",
      labelId: "all",
    },
    selectedContact: null as unknown as ContactsData,
    setFilter: (filter: ContactTableFilter) => {
      set({ filter });
    },
    setSelectedContact: (contact) => set({ selectedContact: contact }),
  })),
);
