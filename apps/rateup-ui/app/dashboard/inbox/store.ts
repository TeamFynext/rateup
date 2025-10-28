import { enableMapSet, produce } from "immer";
import lodash from "lodash";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  ContactsWithLastMessage,
  markWaMessagesAsRead,
  WaGetMessagesBody,
} from "@/backend/whatsapp/inbox/message/wamessage.api";
import { ChatFilter } from "@/components/whatsapp/inbox/chatselect/chatFilter";

import {
  clearAllContactsFromDB,
  clearAllMessagesFromIDB,
  loadContactIdsForFilter,
  loadContactsFromDB,
  removeContactsFromDB,
  saveContactIdsForFilter,
  saveContactsToDB,
  saveContactToDB,
  saveMessagesToIDB,
} from "./idb";

interface ContactStore {
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

export type ContactWithUpdatedAt = Omit<ContactsWithLastMessage, "messages"> & {
  updatedAt: string;
};
interface ContactsStoreState {
  contactsById: Map<string, ContactWithUpdatedAt>;
  contactsByFilter: ContactsByFilter;
  selectedContact: ContactWithUpdatedAt | null;
  currentFilterKey: string;
  isLoading: boolean;

  // Actions
  setFilter: (filter: ChatFilter) => void;
  loadContactsFromDB: (filter: ChatFilter) => Promise<void>;
  addContactsForFilter: (
    filterKey: string,
    contacts: Array<ContactsWithLastMessage & { updatedAt: string }>,
    tab: string,
  ) => Promise<void>;
  updateContactById: (
    contactId: string,
    updater: (c: ContactWithUpdatedAt) => ContactWithUpdatedAt,
  ) => void;
  resetUnreadForContact: (
    contactId: string,
    contact?: ContactWithUpdatedAt,
  ) => void;
  setSelectedContact: (contact) => void;
  getContactsByIds: (ids: string[]) => Promise<ContactWithUpdatedAt[]>;
  clearAllContacts: () => Promise<void>;
  deleteContactsByIds: (contactIds: string[]) => Promise<void>;
}

enableMapSet();
//for messages
const MAX_CONTACTS_IN_MEMORY = 30;
let currentLoadToken = 0;
export const useContactsStore = create<ContactsStoreState>()(
  persist(
    (set, get) => ({
      contactsById: new Map(),
      contactsByFilter: {},
      selectedContact: null,
      currentFilterKey: null,
      isLoading: false,

      setFilter: (filter) => {
        set({ currentFilterKey: makeFilterKey(filter) });
      },

      loadContactsFromDB: async (filter) => {
        const loadToken = ++currentLoadToken;
        const filterKey = makeFilterKey(filter);
        set(
          produce((state) => {
            state.currentFilterKey = filterKey;
          }),
        );
        if (get().currentFilterKey[filterKey]?.length) return;
        const ids = await loadContactIdsForFilter(filterKey);
        if (!ids.length || loadToken !== currentLoadToken) return;

        const contacts = await loadContactsFromDB(ids);
        if (!contacts.length || loadToken !== currentLoadToken) return;

        set(
          produce((state: ContactsStoreState) => {
            if (loadToken !== currentLoadToken) return;
            contacts.forEach((c) => {
              const existing = state.contactsById.get(c.id);
              if (
                !existing ||
                new Date(c.updatedAt) > new Date(existing.updatedAt)
              ) {
                state.contactsById.set(c.id, c);
              }
            });

            const existingIds = new Set(
              state.contactsByFilter[filterKey] || [],
            );
            ids.forEach((id) => existingIds.add(id));
            state.contactsByFilter[filterKey] = Array.from(existingIds);
          }),
        );
      },

      addContactsForFilter: async (filterKey, contacts, tab) => {
        const { currentFilterKey } = get();
        if (currentFilterKey !== filterKey) return;
        set(
          produce((state: ContactsStoreState) => {
            state.isLoading = true;
            const existingIds = state.contactsByFilter[filterKey] || [];
            const contactIdsSet = new Set(existingIds);
            contacts.forEach((c) => {
              const { messages, ...rest } = c;
              const existing = state.contactsById.get(c.id);
              if (
                !existing ||
                new Date(c.updatedAt) > new Date(existing.updatedAt)
              ) {
                state.contactsById.set(c.id, {
                  ...rest,
                  unReadMessageCount:
                    state.selectedContact?.id === c.id
                      ? 0
                      : c.unReadMessageCount,
                });
              }
              contactIdsSet.add(c.id);
            });

            let allIds = Array.from(contactIdsSet);
            const newList = allIds
              .map((id) => ({
                id,
                createdAt:
                  tab === "All"
                    ? (state.contactsById.get(id)?.lastMessage?.waCreatedAt ??
                      0)
                    : (state.contactsById.get(id)
                        ?.lastReceivedMessageTimeStamp ?? 0),
              }))
              .sort(
                (a, b) =>
                  (filterKey.includes("sortBy:oldest")
                    ? new Date(a.createdAt).getTime()
                    : new Date(b.createdAt).getTime()) -
                  (filterKey.includes("sortBy:oldest")
                    ? new Date(b.createdAt).getTime()
                    : new Date(a.createdAt).getTime()),
              )
              .map((c) => c.id);
            state.contactsByFilter[filterKey] = newList;
            state.isLoading = false;
          }),
        );

        Promise.all([
          saveContactsToDB(contacts),
          saveContactIdsForFilter(
            filterKey,
            contacts.map((c) => c.id),
          ),
        ]);
      },

      updateContactById(contactId, updater) {
        const contact = get().contactsById.get(contactId);
        if (!contact) return;
        const updated = {
          ...updater(contact),
          updatedAt: new Date().toISOString(),
        };
        set(
          produce((state) => {
            const newMap = new Map(state.contactsById);
            newMap.set(contactId, updated);
            state.contactsById = newMap;
            if (contactId === get().selectedContact?.id) {
              state.selectedContact = updated;
            }
            let filter = false;
            if (
              updated.waMessageAssignStatus !== contact.waMessageAssignStatus &&
              !state.currentFilterKey?.includes("messageType:all")
            ) {
              filter = true;
            }
            if (
              updated.lastMessage.waCreatedAt >
                contact.lastMessage.waCreatedAt ||
              filter
            ) {
              state.isLoading = true;
              const list = filter
                ? state.contactsByFilter[state.currentFilterKey].filter(
                    (id) => id !== contactId,
                  )
                : state.contactsByFilter[state.currentFilterKey];
              const newList = list
                .map((id) => ({
                  id,
                  createdAt: state.currentFilterKey?.includes("messageType:all")
                    ? (state.contactsById.get(id)?.lastMessage?.waCreatedAt ??
                      0)
                    : (state.contactsById.get(id)
                        ?.lastReceivedMessageTimeStamp ?? 0),
                }))
                .sort(
                  (a, b) =>
                    (state.currentFilterKey.includes("sortBy:oldest")
                      ? new Date(a.createdAt).getTime()
                      : new Date(b.createdAt).getTime()) -
                    (state.currentFilterKey.includes("sortBy:oldest")
                      ? new Date(b.createdAt).getTime()
                      : new Date(a.createdAt).getTime()),
                )
                .map((c) => c.id);

              state.contactsByFilter[state.currentFilterKey] = newList;
              state.isLoading = false;
            }
          }),
        );
        saveContactToDB(updated);
      },

      resetUnreadForContact(contactId, contact) {
        if (!contact) contact = get().contactsById.get(contactId);
        if (contact && contact.unReadMessageCount !== 0) {
          get().updateContactById(contactId, (c) => ({
            ...contact,
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
          get().resetUnreadForContact(contact.id, contact);
        }
        set({ selectedContact: contact });
      },

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
          const fromDB = await loadContactsFromDB(missingIds);
          fromDB.forEach((c) => {
            contactsById.set(c.id, c);
            result.push(c);
          });
          set({ contactsById });
        }

        return result;
      },

      deleteContactsByIds: async (contactIds: string[]) => {
        set(
          produce((state) => {
            contactIds.forEach((id) => {
              state.contactsById.delete(id);
              Object.keys(state.contactsByFilter).forEach((filterKey) => {
                const contacts = state.contactsByFilter[filterKey];
                if (contacts) {
                  state.contactsByFilter[filterKey] = contacts.filter(
                    (contactId) => !contactIds.includes(contactId),
                  );
                }
              });
              if (state.selectedContact?.id === id) {
                state.selectedContact = null;
              }
            });
          }),
        );

        await removeContactsFromDB(contactIds);
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
  accessTimestamps: Map<string, number>;
  setSelected: (contactId: string, account: string) => void;
  mergeMessages: (
    key: string,
    messages: WaGetMessagesBody[],
    evictInactive?: boolean,
  ) => void;
  getMessages: (key: string) => WaGetMessagesBody[];
  isLoading: boolean;
  setIsLoading: (valu: boolean) => void;
  clearMessages: () => Promise<void>;
  updateMessageByMessageId: (
    key: string,
    messageId: string,
    updatedData: Partial<WaGetMessagesBody>,
  ) => void;
}

export const useMessagesStore = create<MessagesStore>()(
  persist(
    (set, get) => ({
      messagesByKey: new Map(),
      selectedKey: null,
      isLoading: false,
      accessTimestamps: new Map(),
      setIsLoading: (value) => set({ isLoading: value }),
      setSelected: (contactId, source) => {
        const key = `${contactId}_${source}`;
        if (!get().messagesByKey.has(key))
          set((s) => ({
            messagesByKey: new Map(s.messagesByKey.set(key, { messages: [] })),
          }));
        set({ selectedKey: key });
      },

      mergeMessages: (key, messages, evictInactive = true) => {
        const state = get();
        const m = new Map(state.messagesByKey);
        const entry = m.get(key) ?? { messages: [] };

        const existing = new Map(
          entry.messages.map((x) => [x.messageId ?? x.id, x]),
        );

        const changedOrNew: any[] = [];

        for (const msg of messages) {
          const id = msg.messageId ?? msg.id;
          const existingMsg = existing.get(id);

          if (existingMsg) {
            const merged = {
              ...existingMsg,
              ...msg,
              stats: {
                read: msg.stats.read.length
                  ? msg.stats.read
                  : existingMsg.stats.read,
                sent: msg.stats.sent.length
                  ? msg.stats.sent
                  : existingMsg.stats.sent,
                delivered: msg.stats.delivered.length
                  ? msg.stats.delivered
                  : existingMsg.stats.delivered,
                failed: msg.stats.failed.length
                  ? msg.stats.failed
                  : existingMsg.stats.failed,
              },
            };

            if (!lodash.isEqual(existingMsg, merged)) {
              existing.set(id, merged);
              changedOrNew.push(merged);
            }
          } else {
            existing.set(id, msg);
            changedOrNew.push(msg);
          }
        }

        const sortedMessages = Array.from(existing.values()).sort(
          (a, b) =>
            new Date(b.waCreatedAt).getTime() -
            new Date(a.waCreatedAt).getTime(),
        );

        entry.messages = sortedMessages;
        m.set(key, entry);
        set({ messagesByKey: m });

        if (changedOrNew.length) {
          saveMessagesToIDB(key, changedOrNew);
        }
      },

      updateMessageByMessageId: (key, messageId, data) =>
        set((state) => {
          const entry = state.messagesByKey.get(key);
          if (!entry?.messages?.length) return state;

          const idx = entry.messages.findIndex(
            (m) => (m.messageId ?? m.id) === messageId,
          );
          if (idx === -1) return state;

          const updatedMessages = [...entry.messages];
          const updatedMessage = { ...updatedMessages[idx], ...data };
          updatedMessages[idx] = updatedMessage;
          const sorted = data.waCreatedAt
            ? updatedMessages.sort(
                (a, b) =>
                  new Date(b.waCreatedAt).getTime() -
                  new Date(a.waCreatedAt).getTime(),
              )
            : updatedMessages;
          const newMap = new Map(state.messagesByKey);
          newMap.set(key, { messages: sorted });
          saveMessagesToIDB(key, [updatedMessage]);
          return { messagesByKey: newMap };
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
