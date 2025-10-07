import { JsonInput } from "@mantine/core";
import { enableMapSet, produce } from "immer";
import stringify from "json-stable-stringify";
import { Key } from "lucide-react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  ContactsWithLastMessage,
  markWaMessagesAsRead,
  WaGetMessagesBody,
} from "@/backend/whatsapp/inbox/message/wamessage.api";
import { ChatFilter } from "@/components/whatsapp/inbox/chatselect/chatFilter";
import { useUser } from "@/context/UserContext";

import {
  clearAllContactsFromDB,
  clearAllMessagesFromIDB,
  loadContactIdsForFilter,
  loadContactsFromDB,
  saveContactIdsForFilter,
  saveContactsToDB,
  saveContactToDB,
} from "./idb";

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
  openedContactIds: string[];
  addOpenedContactIds: (id: string) => void;
  setOpenedContactIds: (value: string[]) => void;
}

interface ChatContactCountStore {
  totalCount: {
    new: number;
    closed: number;
    assigned: number;
    assignedToMe: number;
    blocked: number;
    newAssigned: number;
    newUnassigned: number;
    newAssignedTome: number;
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
  openedContactIds: [],
  addOpenedContactIds: (id) =>
    set((state) => ({
      openedContactIds: Array.from(new Set([...state.openedContactIds, id])),
    })),
  setOpenedContactIds: (value) => set({ openedContactIds: value }),
}));

export const useChatContactCountStore = create<ChatContactCountStore>(
  (set) => ({
    totalCount: {
      new: 0,
      closed: 0,
      assigned: 0,
      assignedToMe: 0,
      blocked: 0,
      newAssigned: 0,
      newUnassigned: 0,
      newAssignedTome: 0,
    },
    setTotalCount: (value) => set({ totalCount: value }),
  }),
);

export default useContactStore;

export function makeFilterKey(filter) {
  return Object.entries(filter || {})
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
}
type ContactsByFilter = Record<string, string[]>;

export type ContactWithUpdatedAt = ContactsWithLastMessage & {
  updatedAt: string;
};
interface ContactsStoreState {
  contactsById: Map<string, ContactWithUpdatedAt>;
  contactsByFilter: ContactsByFilter;
  selectedContact: ContactWithUpdatedAt | null;
  currentFilterKey: string;

  // Actions
  setFilter: (filter: ChatFilter) => void;
  loadContactsFromDB: (filter: ChatFilter) => Promise<void>;
  addContactsForFilter: (
    filterKey: string,
    contacts: ContactWithUpdatedAt[],
  ) => Promise<void>;
  updateContactById: (
    contactId: string,
    updater: (c: ContactWithUpdatedAt) => ContactWithUpdatedAt,
  ) => void;
  resetUnreadForContact: (contactId: string) => void;
  setSelectedContact: (contact) => void;
  getContactsByIds: (ids: string[]) => Promise<ContactWithUpdatedAt[]>;
  clearAllContacts: () => Promise<void>;
}

enableMapSet();

export const useContactsStore = create<ContactsStoreState>()(
  persist(
    (set, get) => ({
      contactsById: new Map(),
      contactsByFilter: {},
      selectedContact: null,
      currentFilterKey: null,

      setFilter: (filter) => {
        set({ currentFilterKey: makeFilterKey(filter) });
      },

      /* ---------- Load contacts by filter from DB ---------- */
      loadContactsFromDB: async (filter) => {
        const filterKey = makeFilterKey(filter);
        const ids = await loadContactIdsForFilter(filterKey);
        if (!ids.length) return;

        const contacts = await loadContactsFromDB(ids);
        if (!contacts.length) return;

        set(
          produce((state: ContactsStoreState) => {
            contacts.forEach((c) => state.contactsById.set(c.id, c));
            state.contactsByFilter[filterKey] = ids;
          }),
        );
      },

      /* ---------- Append contacts for pagination ---------- */
      addContactsForFilter: async (filterKey, contacts) => {
        set(
          produce((state: ContactsStoreState) => {
            const existingIds = state.contactsByFilter[filterKey] || [];
            const contactIdsSet = new Set(existingIds);
            contacts.forEach((c) => {
              const existing = state.contactsById.get(c.id);
              // Only update if incoming contact is newer
              if (
                !existing ||
                new Date(c.updatedAt) > new Date(existing.updatedAt)
              ) {
                state.contactsById.set(c.id, c);
              }
              contactIdsSet.add(c.id);
            });
            state.contactsByFilter[filterKey] = Array.from(contactIdsSet);
          }),
        );

        await Promise.all([
          saveContactsToDB(contacts),
          saveContactIdsForFilter(
            filterKey,
            contacts.map((c) => c.id),
          ),
        ]);
      },

      /* ---------- Update one contact globally ---------- */
      updateContactById(contactId, updater) {
        const contact = get().contactsById.get(contactId);
        if (!contact) return;
        const updated = {
          ...updater(contact),
          updatedAt: new Date().toISOString(),
        };
        set(
          produce((state) => {
            state.contactsById.set(contactId, updated);
          }),
        );
        saveContactToDB(updated);
      },

      resetUnreadForContact(contactId) {
        const contact = get().contactsById.get(contactId);
        if (contact && contact.unReadMessageCount !== 0) {
          get().updateContactById(contactId, (c) => ({
            ...c,
            unReadMessageCount: 0,
          }));
        }
        try {
          markWaMessagesAsRead(contactId);
        } catch (e) {
          console.error(e);
        }
      },

      setSelectedContact(contact) {
        if (contact && contact.unReadMessageCount !== 0) {
          get().resetUnreadForContact(contact.id);
        }
        set({ selectedContact: contact });
      },

      /* ---------- Get multiple contacts by IDs (IN query) ---------- */
      async getContactsByIds(ids: string[]): Promise<ContactWithUpdatedAt[]> {
        const { contactsById } = get();
        const result: ContactWithUpdatedAt[] = [];
        const missingIds: string[] = [];

        ids.forEach((id) => {
          const contact = contactsById.get(id);
          if (contact) result.push(contact);
          else missingIds.push(id);
        });

        if (missingIds.length) {
          // Load missing contacts from IndexedDB
          const fromDB = await loadContactsFromDB(missingIds);
          fromDB.forEach((c) => {
            contactsById.set(c.id, c);
            result.push(c);
          });
          set({ contactsById });
        }

        return result;
      },

      async clearAllContacts() {
        await clearAllContactsFromDB();
        set({
          contactsById: new Map(),
          contactsByFilter: {},
          selectedContact: null,
          currentFilterKey: null,
        });
      },
    }),
    {
      name: "inbox-selected-contact",
      partialize: (state) => ({
        selectedContact: state.selectedContact,
      }),
    },
  ),
);

interface MessagesStore {
  messagesByKey: Map<string, { messages: WaGetMessagesBody[] }>;
  selectedKey: string | null;
  setSelected: (contactId: string, account: string) => void;
  mergeMessages: (key: string, messages: WaGetMessagesBody[]) => void;
  getMessages: (key: string) => WaGetMessagesBody[];
  isLoading: boolean;
  setIsLoading: (valu: boolean) => void;
  clearMessages: () => Promise<void>;
}

export const useMessagesStore = create<MessagesStore>()(
  persist(
    (set, get) => ({
      messagesByKey: new Map(),
      selectedKey: null,
      isLoading: false,
      setIsLoading: (value) => set({ isLoading: value }),
      setSelected: (contactId, source) => {
        const key = `${contactId}_${source}`;
        if (!get().messagesByKey.has(key))
          set((s) => ({
            messagesByKey: new Map(s.messagesByKey.set(key, { messages: [] })),
          }));
        set({ selectedKey: key, isLoading: true });
      },

      mergeMessages: (key, messages) =>
        set((state) => {
          const m = new Map(state.messagesByKey);
          const entry = m.get(key) ?? { messages: [] };
          const existing = new Map(
            entry.messages.map((x) => [x.messageId ?? x.id, x]),
          );
          for (const msg of messages)
            existing.set(msg.messageId ?? msg.id, msg);
          entry.messages = Array.from(existing.values()).sort(
            (a, b) =>
              new Date(a.waCreatedAt).getTime() -
              new Date(b.waCreatedAt).getTime(),
          );

          m.set(key, entry);
          return { messagesByKey: m, isLoading: false };
        }),

      getMessages: (key) => get().messagesByKey.get(key)?.messages ?? [],
      clearMessages: async () => {
        await clearAllMessagesFromIDB();
        set({
          messagesByKey: new Map(),
          selectedKey: null,
          isLoading: false,
        });
      },
    }),
    {
      name: "selected-contact-message-key",
      partialize: (state) => ({
        selectedKey: state.selectedKey,
      }),
    },
  ),
);
