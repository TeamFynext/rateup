import { create } from "zustand";

import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";

interface ContactStore {
  selectedContact: ContactsWithLastMessage | null;
  setSelectedContact: (contact: ContactsWithLastMessage) => void;
}

const useContactStore = create<ContactStore>((set) => ({
  selectedContact: null,
  setSelectedContact: (contact) => set({ selectedContact: contact }),
}));

export default useContactStore;
