import { enableMapSet, produce } from "immer";
import lodash from "lodash";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { WaMessageAssignStatus, WaMessageAssignStatusTab } from "@/types/enums";
import {
  ContactsWithLastMessage,
  markWaMessagesAsRead,
  WaGetMessagesBody,
} from "@/backend/whatsapp/inbox/message/wamessage.api";
import { ChatFilter } from "@/components/whatsapp/inbox/chatselect/chatFilter";
import { User } from "@/context/UserContext";
import { isInboxSessionExpired } from "@/utils/whatsapp/inbox";

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
  currentUser: User;

  // Actions
  setFilter: (filter: ChatFilter) => void;
  loadContactsFromDB: (filter: ChatFilter, user) => Promise<void>;
  addContactsForFilter: (
    filterKey: string,
    contacts: Array<ContactsWithLastMessage & { updatedAt: string }>,
    updateOtherTabs?: boolean,
  ) => Promise<void>;
  updateContactById: (
    contactId: string,
    updater: (c: ContactWithUpdatedAt) => ContactWithUpdatedAt,
    markUnread?: boolean,
  ) => void;
  resetUnreadForContact: (
    contactId: string,
    contact?: ContactWithUpdatedAt,
  ) => void;
  setSelectedContact: (contact) => void;
  getContactsByIds: (ids: string[]) => Promise<ContactWithUpdatedAt[]>;
  clearAllContacts: () => Promise<void>;
  deleteContactsByIds: (contactIds: string[]) => Promise<void>;
  clearContactsForFilter: (filter: ChatFilter) => void;
  updateContactList: (tab, contactId, isMessageUpdated: boolean) => void;
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
      currentUser: null,

      setFilter: (filter) => {
        set({ currentFilterKey: makeFilterKey(filter) });
      },

      loadContactsFromDB: async (filter, user) => {
        if (!filter) return;
        const loadToken = ++currentLoadToken;
        const filterKey = makeFilterKey(filter);
        set(
          produce((state) => {
            state.currentFilterKey = filterKey;
            if (!state.currentUser) state.currentUser = user;
          }),
        );
        if (get().contactsByFilter[filterKey]?.length) return;
        const ids = await loadContactIdsForFilter(filterKey);
        if (!ids.length || loadToken !== currentLoadToken) return;

        const contacts = await loadContactsFromDB(ids);
        if (!contacts.length || loadToken !== currentLoadToken) return;
        set(
          produce((state: ContactsStoreState) => {
            if (loadToken !== currentLoadToken) return;
            const contactsByIdMap = new Map(state.contactsById);
            contacts.forEach((c) => {
              const existing = contactsByIdMap.get(c.id);
              if (
                !existing ||
                new Date(c.updatedAt) > new Date(existing.updatedAt)
              ) {
                contactsByIdMap.set(c.id, c);
              }
            });
            state.contactsById = contactsByIdMap;

            const existingIds = new Set(
              state.contactsByFilter[filterKey] || [],
            );
            ids.forEach((id) => existingIds.add(id));
            state.contactsByFilter[filterKey] = Array.from(existingIds);
          }),
        );
      },

      addContactsForFilter: async (
        filterKey,
        contacts,
        updateOtherTabs = false,
      ) => {
        const { currentFilterKey } = get();
        if (!filterKey || currentFilterKey !== filterKey) return;
        let sortedList = [];
        set(
          produce((state: ContactsStoreState) => {
            state.isLoading = true;
            const existingIds = state.contactsByFilter[filterKey] || [];
            const contactIdsSet = new Set(existingIds);
            const contactsByIdMap = new Map(state.contactsById);
            contacts.forEach((c) => {
              const { messages, ...rest } = c;
              const existing = contactsByIdMap.get(c.id);
              if (
                !existing ||
                new Date(c.updatedAt) > new Date(existing.updatedAt)
              ) {
                contactsByIdMap.set(c.id, {
                  ...rest,
                  unReadMessageCount:
                    state.selectedContact?.id === c.id
                      ? 0
                      : c.unReadMessageCount,
                });
              }
              const updatedContact = contactsByIdMap.get(c.id);

              const isUnAssigned =
                updatedContact.waMessageAssignStatus ===
                WaMessageAssignStatus.UNASSIGNED;
              const isAssigned =
                updatedContact.waMessageAssignStatus ===
                WaMessageAssignStatus.ASSIGNED;
              if (
                !isUnAssigned &&
                (currentFilterKey?.includes(
                  "waMessageAssignStatus:UnAssigned",
                ) ||
                  currentFilterKey?.includes("waMessageAssignStatus:New"))
              )
                return false;
              if (
                !isAssigned &&
                currentFilterKey?.includes("waMessageAssignStatus:mine")
              )
                return false;
              contactIdsSet.add(c.id);
            });
            state.contactsById = contactsByIdMap;

            let allIds = Array.from(contactIdsSet);

            sortedList = allIds
              .map((id) => {
                const c = state.contactsById.get(id);
                const sortByWaCreated =
                  currentFilterKey.includes("sortBy:newest_wa_created") ||
                  currentFilterKey.includes("sortBy:oldest_wa_created");
                const createdAt = sortByWaCreated
                  ? (c?.lastMessage?.waCreatedAt ?? 0)
                  : (c?.lastReceivedMessageTimeStamp ?? 0);
                return { id, createdAt };
              })
              .sort((a, b) => {
                const oldestSort =
                  currentFilterKey.includes("sortBy:oldest") ||
                  currentFilterKey.includes("sortBy:oldest_wa_created");
                const timeA = new Date(a.createdAt).getTime();
                const timeB = new Date(b.createdAt).getTime();

                return oldestSort ? timeA - timeB : timeB - timeA;
              })
              .map((c) => c.id);
            state.contactsByFilter[currentFilterKey] = sortedList;
            state.isLoading = false;
          }),
        );
        Promise.all([
          saveContactsToDB(contacts),
          saveContactIdsForFilter(filterKey, sortedList),
        ]);
        const state = get();
        if (updateOtherTabs && contacts.length === 1) {
          const contactId = contacts[0].id;
          if (!state.currentFilterKey?.includes("waMessageAssignStatus:New")) {
            state.updateContactList("New", contactId, true);
          }
          if (
            !state.currentFilterKey?.includes(
              "waMessageAssignStatus:UnAssigned",
            )
          ) {
            state.updateContactList("UnAssigned", contactId, true);
          }
          if (!state.currentFilterKey?.includes("waMessageAssignStatus:mine")) {
            state.updateContactList("mine", contactId, true);
          }
          if (!state.currentFilterKey?.includes("messageType:all")) {
            state.updateContactList("All", contactId, true);
          }
        }
      },

      updateContactById(contactId, updater, markUnread) {
        const state = get();
        const contact = state.contactsById.get(contactId);
        if (!contact) return;
        const updateIdb = [];
        const updatedContact = {
          ...updater(contact),
          updatedAt: new Date().toISOString(),
        };
        let messageUpdated = false;
        let assignStatusChanged = false;
        set(
          produce((draft) => {
            const { currentFilterKey, contactsByFilter, contactsById } = draft;
            const newContactsById = new Map(contactsById);
            newContactsById.set(contactId, updatedContact);
            draft.contactsById = newContactsById;

            if (contactId === state.selectedContact?.id) {
              draft.selectedContact = updatedContact;
            }

            const currentList = contactsByFilter[currentFilterKey] || [];
            let contactIncluded = currentList.includes(contactId);
            const isUnassigned =
              updatedContact.waMessageAssignStatus ===
              WaMessageAssignStatus.UNASSIGNED;
            assignStatusChanged =
              updatedContact.waMessageAssignStatus !==
              contact.waMessageAssignStatus;
            const status = currentFilterKey?.match(/status:[^|]*\|/) || [];
            const filterExcludesAll =
              (!currentFilterKey?.includes("messageType:all") ||
                (currentFilterKey?.includes("messageType:all") &&
                  status.length &&
                  !status[0].includes(updatedContact.waMessageAssignStatus))) &&
              (!currentFilterKey?.includes("waMessageAssignStatus:New") ||
                (currentFilterKey?.includes("waMessageAssignStatus:New") &&
                  !isUnassigned));
            const shouldFilterOut = assignStatusChanged && filterExcludesAll;

            messageUpdated =
              updatedContact.lastMessage &&
              updatedContact.lastMessage.waCreatedAt >
                contact.lastMessage.waCreatedAt;
            if (!contactIncluded) {
              const isNewFilter = currentFilterKey?.includes(
                "waMessageAssignStatus:New",
              );

              if (isNewFilter && isUnassigned) {
                currentList.push(contactId);
                contactIncluded = true;
              }

              if (!contactIncluded) return;
            }
            if (messageUpdated || shouldFilterOut) {
              draft.isLoading = true;

              const baseList = shouldFilterOut
                ? currentList.filter((id) => id !== contactId)
                : currentList;
              const sortedList = baseList
                .map((id) => {
                  const c = draft.contactsById.get(id);
                  const sortByWaCreated =
                    currentFilterKey.includes("sortBy:newest_wa_created") ||
                    currentFilterKey.includes("sortBy:oldest_wa_created");
                  const createdAt = sortByWaCreated
                    ? (c?.lastMessage?.waCreatedAt ?? 0)
                    : (c?.lastReceivedMessageTimeStamp ?? 0);

                  return { id, createdAt };
                })
                .sort((a, b) => {
                  const oldestSort =
                    currentFilterKey.includes("sortBy:oldest") ||
                    currentFilterKey.includes("sortBy:oldest_wa_created");
                  const timeA = new Date(a.createdAt).getTime();
                  const timeB = new Date(b.createdAt).getTime();

                  return oldestSort ? timeA - timeB : timeB - timeA;
                })
                .map((c) => c.id);
              draft.contactsByFilter[currentFilterKey] = sortedList;
              updateIdb.push({ key: currentFilterKey, contactIds: sortedList });
              draft.isLoading = false;
            }
          }),
        );

        if (
          !state.currentFilterKey?.includes("waMessageAssignStatus:New") &&
          (messageUpdated || assignStatusChanged)
        ) {
          state.updateContactList("New", contactId, messageUpdated);
        }
        if (
          !state.currentFilterKey?.includes(
            "waMessageAssignStatus:UnAssigned",
          ) &&
          (messageUpdated || assignStatusChanged)
        ) {
          state.updateContactList("UnAssigned", contactId, messageUpdated);
        }
        if (
          !state.currentFilterKey?.includes("waMessageAssignStatus:mine") &&
          (messageUpdated || assignStatusChanged)
        ) {
          state.updateContactList("mine", contactId, messageUpdated);
        }
        if (
          !state.currentFilterKey?.includes("messageType:all") &&
          (assignStatusChanged || messageUpdated)
        ) {
          state.updateContactList("All", contactId, messageUpdated);
        }

        try {
          Promise.all(
            updateIdb.map(async (i) => {
              saveContactIdsForFilter(i.key, i.contatIds);
            }),
          );
          if (contactId === get().selectedContact?.id && markUnread) {
            markWaMessagesAsRead(contactId);
          }
          saveContactToDB(updatedContact);
        } catch (e) {
          console.error(e);
        }
      },

      updateContactList: (tab, contactId, isMessageUpdated) => {
        const updateIdb = [];
        switch (tab) {
          case "All":
            set(
              produce((draft) => {
                const state = get();
                const contact = state.contactsById.get(contactId);

                const isNew = !isInboxSessionExpired(
                  contact.lastReceivedMessageTimeStamp,
                );
                const filterList = Object.keys(draft.contactsByFilter).filter(
                  (key) => key.includes("messageType:all"),
                );
                filterList.forEach((filterKey) => {
                  const contactIds = draft.contactsByFilter[filterKey] || [];
                  const isInFilter = contactIds.includes(contactId);
                  let newList = [...contactIds];
                  let changed = false;
                  const status = filterKey?.match(/status:[^|]*\|/) || [];
                  if (isNew) {
                    if (
                      !isInFilter &&
                      (!status.length ||
                        status[0].includes(contact.waMessageAssignStatus))
                    ) {
                      newList.push(contactId);
                      changed = true;
                    }
                  }
                  if (
                    isInFilter &&
                    status.length &&
                    !status[0].includes(contact.waMessageAssignStatus)
                  ) {
                    newList = contactIds.filter((id) => id !== contactId);
                    changed = true;
                  }
                  if (!changed && !isMessageUpdated) return;
                  const sortedList = newList
                    .map((id) => {
                      const c = draft.contactsById.get(id);
                      const sortByWaCreated =
                        filterKey.includes("sortBy:newest_wa_created") ||
                        filterKey.includes("sortBy:oldest_wa_created");
                      const createdAt = sortByWaCreated
                        ? (c?.lastMessage?.waCreatedAt ?? 0)
                        : (c?.lastReceivedMessageTimeStamp ?? 0);

                      return { id, createdAt };
                    })
                    .sort((a, b) => {
                      const oldestSort =
                        filterKey.includes("sortBy:oldest") ||
                        filterKey.includes("sortBy:oldest_wa_created");
                      const timeA = new Date(a.createdAt).getTime();
                      const timeB = new Date(b.createdAt).getTime();

                      return oldestSort ? timeA - timeB : timeB - timeA;
                    })
                    .map((c) => c.id);
                  draft.contactsByFilter[filterKey] = sortedList;
                  updateIdb.push({ key: filterKey, contactIds: sortedList });
                });
              }),
            );
            break;
          case "UnAssigned":
            set(
              produce((draft) => {
                const state = get();
                const contact = state.contactsById.get(contactId);
                const isUnassigned =
                  contact.waMessageAssignStatus ===
                  WaMessageAssignStatus.UNASSIGNED;

                const filterList = Object.keys(draft.contactsByFilter).filter(
                  (key) => key.includes("waMessageAssignStatus:UnAssigned"),
                );
                filterList.forEach((filterKey) => {
                  const contactIds = draft.contactsByFilter[filterKey] || [];
                  const isInFilter = contactIds.includes(contactId);
                  let newList = [...contactIds];
                  let changed = false;
                  if (isUnassigned) {
                    if (!isInFilter) {
                      newList.push(contactId);
                      changed = true;
                    }
                  } else {
                    if (isInFilter && !isUnassigned) {
                      newList = contactIds.filter((id) => id !== contactId);
                      changed = true;
                    }
                  }
                  if (!changed && !isMessageUpdated) return;
                  const sortedList = newList
                    .map((id) => {
                      const c = draft.contactsById.get(id);
                      const sortByWaCreated =
                        filterKey.includes("sortBy:newest_wa_created") ||
                        filterKey.includes("sortBy:oldest_wa_created");
                      const createdAt = sortByWaCreated
                        ? (c?.lastMessage?.waCreatedAt ?? 0)
                        : (c?.lastReceivedMessageTimeStamp ?? 0);

                      return { id, createdAt };
                    })
                    .sort((a, b) => {
                      const oldestSort =
                        filterKey.includes("sortBy:oldest") ||
                        filterKey.includes("sortBy:oldest_wa_created");
                      const timeA = new Date(a.createdAt).getTime();
                      const timeB = new Date(b.createdAt).getTime();

                      return oldestSort ? timeA - timeB : timeB - timeA;
                    })
                    .map((c) => c.id);
                  draft.contactsByFilter[filterKey] = sortedList;
                  updateIdb.push({ key: filterKey, contactIds: sortedList });
                });
              }),
            );
            break;
          case "mine":
            set(
              produce((draft) => {
                const state = get();

                const contact = state.contactsById.get(contactId);

                const isAssigned =
                  contact.waMessageAssignStatus ===
                  WaMessageAssignStatus.ASSIGNED;
                const filterList = Object.keys(draft.contactsByFilter).filter(
                  (key) => key.includes("waMessageAssignStatus:mine"),
                );
                filterList.forEach((filterKey) => {
                  const contactIds = draft.contactsByFilter[filterKey] || [];
                  const isInFilter = contactIds.includes(contactId);
                  let newList = [...contactIds];
                  let changed = false;
                  if (
                    isAssigned &&
                    contact.assignedUsers.some(
                      (a) => a.id === state.currentUser.userId,
                    )
                  ) {
                    if (!isInFilter) {
                      newList.push(contactId);
                      changed = true;
                    }
                  } else {
                    if (isInFilter) {
                      newList = contactIds.filter((id) => id !== contactId);
                      changed = true;
                    }
                  }

                  if (!changed && !isMessageUpdated) return;
                  const sortedList = newList
                    .map((id) => {
                      const c = draft.contactsById.get(id);
                      const sortByWaCreated =
                        filterKey.includes("sortBy:newest_wa_created") ||
                        filterKey.includes("sortBy:oldest_wa_created");
                      const createdAt = sortByWaCreated
                        ? (c?.lastMessage?.waCreatedAt ?? 0)
                        : (c?.lastReceivedMessageTimeStamp ?? 0);

                      return { id, createdAt };
                    })
                    .sort((a, b) => {
                      const oldestSort =
                        filterKey.includes("sortBy:oldest") ||
                        filterKey.includes("sortBy:oldest_wa_created");
                      const timeA = new Date(a.createdAt).getTime();
                      const timeB = new Date(b.createdAt).getTime();

                      return oldestSort ? timeA - timeB : timeB - timeA;
                    })
                    .map((c) => c.id);
                  draft.contactsByFilter[filterKey] = sortedList;
                  updateIdb.push({ key: filterKey, contactIds: sortedList });
                });
              }),
            );
            break;
          case "New":
            set(
              produce((draft) => {
                const state = get();
                const contact = state.contactsById.get(contactId);
                const isUnassigned =
                  contact.waMessageAssignStatus ===
                  WaMessageAssignStatus.UNASSIGNED;
                const isNew = isInboxSessionExpired(
                  contact.lastReceivedMessageTimeStamp,
                );
                const filterList = Object.keys(draft.contactsByFilter).filter(
                  (key) => key.includes("waMessageAssignStatus:New"),
                );
                filterList.forEach((filterKey) => {
                  const contactIds = draft.contactsByFilter[filterKey] || [];
                  const isInFilter = contactIds.includes(contactId);
                  let newList = [...contactIds];
                  let changed = false;
                  if (isUnassigned && isNew) {
                    if (!isInFilter) {
                      newList.push(contactId);
                      changed = true;
                    }
                  } else {
                    if (isInFilter) {
                      newList = contactIds.filter((id) => id !== contactId);
                      changed = true;
                    }
                  }
                  if (!changed && !isMessageUpdated) return;
                  const sortedList = newList
                    .map((id) => {
                      const c = draft.contactsById.get(id);
                      const sortByWaCreated =
                        filterKey.includes("sortBy:newest_wa_created") ||
                        filterKey.includes("sortBy:oldest_wa_created");
                      const createdAt = sortByWaCreated
                        ? (c?.lastMessage?.waCreatedAt ?? 0)
                        : (c?.lastReceivedMessageTimeStamp ?? 0);

                      return { id, createdAt };
                    })
                    .sort((a, b) => {
                      const oldestSort =
                        filterKey.includes("sortBy:oldest") ||
                        filterKey.includes("sortBy:oldest_wa_created");
                      const timeA = new Date(a.createdAt).getTime();
                      const timeB = new Date(b.createdAt).getTime();

                      return oldestSort ? timeA - timeB : timeB - timeA;
                    })
                    .map((c) => c.id);
                  draft.contactsByFilter[filterKey] = sortedList;
                  updateIdb.push({ key: filterKey, contactIds: sortedList });
                });
              }),
            );
            break;
        }
        Promise.all(
          updateIdb.map(async (i) => {
            saveContactIdsForFilter(i.key, i.contatIds);
          }),
        );
      },

      clearContactsForFilter: (filter) => {
        if (!filter) return;
        const filterKey = makeFilterKey(filter);
        if (!filterKey || get().currentFilterKey !== filterKey) return;
        if (!get().contactsByFilter[filterKey]?.length) return;
        set(
          produce((draft) => {
            draft.contactsByFilter[filterKey] = [];
          }),
        );
        saveContactIdsForFilter(filterKey, []);
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
