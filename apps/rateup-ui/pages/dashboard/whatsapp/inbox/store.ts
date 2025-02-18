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
}));

export default useContactStore;
