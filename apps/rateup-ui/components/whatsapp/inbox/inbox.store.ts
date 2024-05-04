import { create } from "zustand";
import { WaGetMessagesBody } from "../../../backend/whatsapp/inbox/message/wamessage.api";

type InboxPaginationState = {
  page: number;
  messages: WaGetMessagesBody[];
  messageLoading: {
    loading: boolean;
    process: "append" | "prepend" | "set";
  };
  currentMessageCount: number;
};

type InboxPaginationAction = {
  setPage: (page: number) => void;
  increasePageCount: () => void;
  setCurrentMessageCount: (count: number) => void;
  setMessages: (messages: WaGetMessagesBody[]) => void;
  prependMessages: (messages: WaGetMessagesBody[]) => void;
  appendMessages: (messages: WaGetMessagesBody[]) => void;
  setMessageLoading: (
    loading: boolean,
    process: "append" | "prepend" | "set",
  ) => void;
};

export const useInboxPaginationStore = create<
  InboxPaginationState & InboxPaginationAction
>((set) => ({
  page: 1,
  messages: [],
  messageLoading: {
    loading: false,
    process: "set",
  },
  currentMessageCount: 0,
  setPage: (page) => set({ page }),
  increasePageCount: () => set((state) => ({ page: state.page + 1 })),
  setMessages: (messages) => set({ messages }),
  prependMessages: (messages) =>
    set((state) => ({ messages: [...messages, ...state.messages] })),
  appendMessages: (messages) =>
    set((state) => ({ messages: [...state.messages, ...messages] })),
  setMessageLoading: (loading, process) =>
    set({ messageLoading: { loading, process } }),
  setCurrentMessageCount: (count) => set({ currentMessageCount: count }),
}));
