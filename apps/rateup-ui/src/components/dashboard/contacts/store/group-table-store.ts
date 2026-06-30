import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface GroupTableFilter {
  searchTerm: string;
}
export const useGroupTableStore = create<{
  filter: GroupTableFilter;
  setFilter: (value: GroupTableFilter) => void;
  groupDetails: any;
  setGroupDetails: (value) => void;
}>()(
  immer((set, _get) => ({
    filter: {
      searchTerm: "",
    },
    groupDetails: null,
    setFilter: (filter: GroupTableFilter) => {
      set({ filter });
    },
    setGroupDetails: (value) => {
      set({ groupDetails: value });
    },
  })),
);
