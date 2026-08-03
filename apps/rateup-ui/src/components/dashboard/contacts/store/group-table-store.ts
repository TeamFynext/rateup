import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface GroupTableFilter {
  searchTerm: string;
}
export const useGroupTableStore = create<{
  filter: GroupTableFilter;
  setFilter: (value: GroupTableFilter) => void;
  groupDetails: ContactGroupwithContacts | null;
  setGroupDetails: (value: ContactGroupwithContacts | null) => void;
}>()(
  immer((set, _get) => ({
    filter: {
      searchTerm: "",
    },
    groupDetails: null as ContactGroupwithContacts | null,
    setFilter: (filter: GroupTableFilter) => {
      set({ filter });
    },
    setGroupDetails: (value) => {
      set({ groupDetails: value });
    },
  })),
);
