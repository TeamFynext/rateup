import { create } from "zustand";

import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";

interface ContactStore {
  selectedContact: ContactsWithLastMessage | null;
  setSelectedContact: (contact: ContactsWithLastMessage) => void;
  opened: boolean;
  open: () => void;
  close: () => void;
  selectedTicket: any;
  setSelectedTicket: (ticket: any) => void;
  setTicketAndOpen: (ticket: any) => void;
  filterData: string;
  setFilterData: (value: string) => void;
}

interface ChatContactCountStore {
  totalCount: {
    new: number;
    all: number;
    closed: number;
    assigned: number;
    assignedToMe: number;
    unassigned: number;
    sent: number;
  };
  setTotalCount: (value) => void;
}

const useContactStore = create<ContactStore>((set) => ({
  opened: false,
  open: () => set((state) => ({ opened: true })),
  close: () => set((state) => ({ opened: false })),
  selectedContact: null,
  setSelectedContact: (contact) => set({ selectedContact: contact }),
  selectedTicket: null,
  setSelectedTicket: (ticket) => set({ selectedTicket: ticket }),
  setTicketAndOpen: (ticket) => set({ selectedTicket: ticket, opened: true }),
  filterData: null,
  setFilterData: (value) => set({ filterData: value }),
}));

export const useChatContactCountStore = create<ChatContactCountStore>(
  (set) => ({
    totalCount: {
      new: 0,
      closed: 0,
      all: 0,
      assigned: 0,
      assignedToMe: 0,
      unassigned: 0,
      sent: 0,
    },
    setTotalCount: (value) => set({ totalCount: value }),
  }),
);

export default useContactStore;
