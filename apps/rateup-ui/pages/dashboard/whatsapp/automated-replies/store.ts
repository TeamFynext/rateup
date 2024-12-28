import { create } from "zustand";

export enum ReplyType {
  Template = "template",
  Editor = "editor",
  Text = "text",
}

interface StoreState {
  id: string;
  type: ReplyType;
  setId: (id: string) => void;
  opened: boolean;
  open: () => void;
  close: () => void;
  setType: (type: ReplyType) => void;
}

const useReplyStore = create<StoreState>((set) => ({
  id: "",
  type: ReplyType.Editor,
  setId: (id: string) => set({ id }),
  opened: false,
  open: () => set(() => ({ opened: true })),
  close: () => set(() => ({ opened: false, id: "" })),
  setType: (type: ReplyType) => set({ type }),
}));

export default useReplyStore;
