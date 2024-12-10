import { create } from "zustand";

interface StoreState {
  id: string;
  setId: (id: string) => void;
  opened: boolean;
  toggle: () => void;
  close: () => void;
}

const useReplyStore = create<StoreState>((set) => ({
  id: "",
  setId: (id: string) => set({ id }),
  opened: false,
  toggle: () => set((state) => ({ opened: !state.opened })),
  close: () => set({ opened: false }),
}));

export default useReplyStore;
