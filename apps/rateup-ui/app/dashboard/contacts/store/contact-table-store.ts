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
}>()(
  immer((set, get) => ({
    filter: {
      searchTerm: "",
      lifecycleId: "all",
      source: "all",
    },
    setFilter: (filter: ContactTableFilter) => {
      set({ filter });
    },
  })),
);
