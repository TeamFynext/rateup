import { enableMapSet, produce } from "immer";
import { markMessageAsRead } from "@/api/inbox/contacts/contacts.api";
import { isEqual } from "lodash";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { WaMessageAssignStatus } from "../api/inbox/types";
import { isInboxSessionExpired } from "../utils/chatbox_utils";
import { useOpenChatStore } from "../utils/store";

import {
  deleteMessageFromIDB,
  loadContactIdsForFilter,
  loadContactsFromDB,
  removeContactsFromDB,
  saveContactIdsForFilter,
  saveContactsToDB,
  saveContactToDB,
  saveMessagesToIDB,
} from "../utils/sqlite";

export function makeFilterKey(filter: any) {
  return Object.entries(filter || {})
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
}

/**
 * Fold a `message_status_update`'s stats onto the ones already cached.
 *
 * The server sends every timestamp it knows on each frame and an empty string
 * for the ones it doesn't, so an empty field means "no news" — never "cleared".
 * Frames can also arrive out of order (a retried webhook can land `sent` after
 * `delivered`), which is why this is a per-field merge and not a replacement.
 */
export function mergeStats(existing: any, incoming: any) {
  const merged = { ...existing };
  for (const [field, value] of Object.entries(incoming ?? {})) {
    if (value) merged[field] = value;
  }
  return merged;
}

/** When a message was created, as epoch ms; 0 for no message or an unparseable date. */
export function messageTime(message: any): number {
  const time = new Date(message?.waCreatedAt ?? message?.createdAt ?? 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/**
 * The list endpoint is ticket-grained — one row per conversation — but this
 * store is keyed by contact. A contact with several tickets on the page used to
 * collapse into whichever row came last, often an old closed ticket quoting an
 * old message. Keep the row whose last message is newest.
 */
function latestRowPerContact(rows: any[]): any[] {
  const byId = new Map<string, any>();
  for (const row of rows) {
    const seen = byId.get(row.id);
    if (!seen || messageTime(row.lastMessage) > messageTime(seen.lastMessage)) {
      byId.set(row.id, row);
    }
  }
  return Array.from(byId.values());
}

/**
 * The cached ids worth keeping when the caller hands over the complete set of
 * rows the server has for a filter.
 *
 * The id list is cached in SQLite and used to be only ever unioned with the
 * fresh page, so a chat that left the tab stayed in it forever — a closed
 * ticket sat in Open until the app's storage was cleared.
 *
 * Dropping every unlisted id outright would lose the one kind of row the
 * response legitimately lacks: a chat the socket added after the request was
 * built. Those are exactly the rows whose newest message is newer than
 * anything the server returned, which is the test applied here.
 */
function retainedStaleIds(
  state: ContactsStoreState,
  existingIds: string[],
  serverRows: any[],
): string[] {
  const serverIds = new Set(serverRows.map((row) => row.id));
  const newestServerRow = serverRows.reduce(
    (newest, row) => Math.max(newest, messageTime(row.lastMessage)),
    0,
  );
  return existingIds.filter((id) => {
    if (serverIds.has(id)) return true;
    return messageTime(state.contactsById.get(id)?.lastMessage) > newestServerRow;
  });
}

/**
 * Fold a server row onto the cached contact.
 *
 * The server is the source of truth, so its row wins — this used to be gated on
 * `updatedAt`, but every local patch stamps that with the device clock, so a
 * cached row almost always looked newer and the fresh one was thrown away,
 * leaving the preview stuck on whatever the socket last delivered. The one
 * exception is a socket frame that landed while the request was in flight: the
 * cache then knows a newer message than the response, and keeps it along with
 * the unread count that came with it.
 */
function mergeServerRow(existing: any, incoming: any, isOpen: boolean) {
  const keepLocalMessage =
    !!existing && messageTime(existing.lastMessage) > messageTime(incoming.lastMessage);
  const merged = { ...existing, ...incoming };
  if (keepLocalMessage) {
    merged.lastMessage = existing.lastMessage;
    merged.unReadMessageCount = existing.unReadMessageCount;
    // The preview being kept is newer than the response's, so the ticket clock
    // the list sorts by has to be kept with it — taking the response's would
    // sort the row below chats it is in fact newer than.
    merged.conversationLastMessageAt =
      existing.conversationLastMessageAt ?? incoming.conversationLastMessageAt;
    if (
      messageTime({ waCreatedAt: existing.lastReceivedMessageTimeStamp }) >
      messageTime({ waCreatedAt: incoming.lastReceivedMessageTimeStamp })
    ) {
      merged.lastReceivedMessageTimeStamp = existing.lastReceivedMessageTimeStamp;
    }
  }
  if (isOpen) merged.unReadMessageCount = 0;
  merged.updatedAt = new Date().toISOString();
  return merged;
}

/**
 * Placeholder bubbles for a send in flight are keyed by `Date.now()` — all
 * digits. Real ids never are: `wamid.…`, Messenger/Instagram mids, `wcmid.…`.
 */
export function isOptimisticId(id: unknown): boolean {
  return typeof id === "string" && /^\d{10,}$/.test(id);
}

/** The text an outgoing message carries — WhatsApp `send.text.body`, IG/FB `send.message.text`. */
function outgoingText(message: any): string | undefined {
  const send = message?.messageBody?.send;
  const text = send?.text?.body ?? send?.message?.text;
  return typeof text === "string" ? text : undefined;
}

/**
 * The placeholder a just-arrived outgoing message replaces, matched on its text.
 * The send request carries no client id the server could echo back, so the text
 * is the only link. Media and other text-less sends match nothing here and are
 * retired by the send itself (`MessageSendPanel`) once it succeeds.
 */
function findPlaceholderFor(thread: Map<string, any>, incoming: any): string | undefined {
  if (incoming?.messageBody?.exchangeProcess !== "send") return undefined;
  const text = outgoingText(incoming);
  if (!text) return undefined;
  const sentAt = messageTime(incoming);
  for (const [id, message] of thread) {
    if (!isOptimisticId(id) || outgoingText(message) !== text) continue;
    // A refetch also brings back older sends; an earlier "ok" must not retire
    // the placeholder for the "ok" typed just now. The stored copy is written
    // after the placeholder, so only a message no older than it — less a minute
    // for the phone's clock disagreeing with the server's — can be its copy.
    if (sentAt >= messageTime(message) - PLACEHOLDER_CLOCK_SKEW_MS) return id;
  }
  return undefined;
}

const PLACEHOLDER_CLOCK_SKEW_MS = 60_000;

type ContactsByFilter = Record<string, string[]>;

export type ContactWithUpdatedAt = any; // We'll use any to prevent missing type errors

interface ContactsStoreState {
  contactsById: Map<string, ContactWithUpdatedAt>;
  contactsByFilter: ContactsByFilter;
  selectedContact: ContactWithUpdatedAt | null;
  currentFilterKey: string | null;
  isLoading: boolean;
  currentUser: any;

  // Actions
  setFilter: (filter: any) => void;
  loadContactsFromDB: (filter: any, user: any) => Promise<void>;
  addContactsForFilter: (
    filterKey: string,
    contacts: Array<any>,
    updateOtherTabs?: boolean,
    isFullServerSet?: boolean,
  ) => Promise<void>;
  updateContactById: (
    contactId: string,
    updater: (c: ContactWithUpdatedAt) => ContactWithUpdatedAt,
    markUnread?: boolean,
  ) => void;
  setContactFavorite: (contactId: string, isFavorite: boolean) => void;
  resetUnreadForContact: (contactId: string, contact?: ContactWithUpdatedAt) => void;
  setSelectedContact: (contact: any) => void;
  getContactsByIds: (ids: string[]) => Promise<ContactWithUpdatedAt[]>;
  deleteContactsByIds: (contactIds: string[]) => Promise<void>;
  clearContactsForFilter: (filter: any) => void;
  updateContactList: (tab: string, contactId: string, isMessageUpdated: boolean) => void;
}

enableMapSet();

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
              if (!existing || new Date(c.updatedAt) > new Date(existing.updatedAt)) {
                contactsByIdMap.set(c.id, c);
              }
            });
            state.contactsById = contactsByIdMap;

            const existingIds = new Set(state.contactsByFilter[filterKey] || []);
            ids.forEach((id) => existingIds.add(id));
            state.contactsByFilter[filterKey] = Array.from(existingIds);
          }),
        );
      },

      addContactsForFilter: async (
        filterKey,
        contacts,
        updateOtherTabs = false,
        isFullServerSet = false,
      ) => {
        const { currentFilterKey } = get();
        if (!filterKey || currentFilterKey !== filterKey) return;
        let sortedList: string[] = [];
        // Merged outside `produce` so the rows can be written to SQLite afterwards
        // without touching revoked drafts. `openChatId`, not `selectedContact`:
        // the chat screen never sets this store's selection.
        const { contactsById } = get();
        const openChatId = useOpenChatStore.getState().openChatId;
        const mergedContacts = latestRowPerContact(contacts).map((c) =>
          mergeServerRow(contactsById.get(c.id), c, openChatId === c.id),
        );
        set(
          produce((state: ContactsStoreState) => {
            state.isLoading = true;
            const existingIds = state.contactsByFilter[filterKey] || [];
            const contactIdsSet = new Set(
              isFullServerSet ? retainedStaleIds(state, existingIds, mergedContacts) : existingIds,
            );
            const contactsByIdMap = new Map(state.contactsById);
            mergedContacts.forEach((updatedContact) => {
              contactsByIdMap.set(updatedContact.id, updatedContact);

              const isAssigned =
                updatedContact.waMessageAssignStatus === WaMessageAssignStatus.ASSIGNED;

              if (!isAssigned && currentFilterKey?.includes("waMessageAssignStatus:Assigned"))
                return false;
              if (!isAssigned && currentFilterKey?.includes("waMessageAssignStatus:mine"))
                return false;
              contactIdsSet.add(updatedContact.id);
            });
            state.contactsById = contactsByIdMap;

            const allIds = Array.from(contactIdsSet);

            sortedList = allIds
              .map((id) => {
                const c = state.contactsById.get(id);
                const sortByWaCreated =
                  currentFilterKey.includes("sortBy:newest_wa_created") ||
                  currentFilterKey.includes("sortBy:oldest_wa_created");
                const createdAt = sortByWaCreated
                  ? (c?.lastMessage?.waCreatedAt ?? 0)
                  : (c?.conversationLastMessageAt ?? c?.lastReceivedMessageTimeStamp ?? 0);
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
          saveContactsToDB(mergedContacts),
          saveContactIdsForFilter(filterKey, sortedList),
        ]);
        const state = get();
        if (updateOtherTabs && contacts.length === 1) {
          const contactId = contacts[0].id;
          if (!state.currentFilterKey?.includes("waMessageAssignStatus:Assigned")) {
            state.updateContactList("open", contactId, true);
          }
          if (!state.currentFilterKey?.includes("waMessageAssignStatus:mine")) {
            state.updateContactList("mine", contactId, true);
          }
          if (!state.currentFilterKey?.includes("messageType:all")) {
            state.updateContactList("all", contactId, true);
          }
        }
      },

      // `markUnread` is part of the interface and passed by callers, but the
      // unread bump is applied by the caller's updater, not here.
      updateContactById(contactId, updater, _markUnread) {
        const state = get();
        const contact = state.contactsById.get(contactId);
        if (!contact) return;
        const updateIdb: any[] = [];
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

            if (!currentFilterKey) return;
            const currentList = contactsByFilter[currentFilterKey] || [];
            let contactIncluded = currentList.includes(contactId);
            const isUnassigned =
              updatedContact.waMessageAssignStatus === WaMessageAssignStatus.UNASSIGNED;
            assignStatusChanged =
              updatedContact.waMessageAssignStatus !== contact.waMessageAssignStatus;
            const status = currentFilterKey?.match(/status:[^|]*\|/) || [];
            const filterExcludesAll =
              (!currentFilterKey?.includes("messageType:all") ||
                (currentFilterKey?.includes("messageType:all") &&
                  status.length &&
                  !status[0].includes(updatedContact.waMessageAssignStatus))) &&
              (!currentFilterKey?.includes("waMessageAssignStatus:New") ||
                (currentFilterKey?.includes("waMessageAssignStatus:New") && !isUnassigned));
            const shouldFilterOut = assignStatusChanged && filterExcludesAll;
            const prevWaCreated = contact.lastMessage?.waCreatedAt ?? 0;
            const newWaCreated = updatedContact.lastMessage?.waCreatedAt ?? 0;
            messageUpdated = newWaCreated > prevWaCreated;

            if (!contactIncluded) {
              const isNewFilter = currentFilterKey?.includes("waMessageAssignStatus:New");
              if (isNewFilter && isUnassigned) {
                currentList.push(contactId);
                contactIncluded = true;
              }
              if (!contactIncluded) return;
            }
            if (messageUpdated || shouldFilterOut) {
              draft.isLoading = true;
              const baseList = shouldFilterOut
                ? currentList.filter((id: string) => id !== contactId)
                : currentList;
              const sortedList = baseList
                .map((id: string) => {
                  const c = draft.contactsById.get(id);
                  const sortByWaCreated =
                    currentFilterKey.includes("sortBy:newest_wa_created") ||
                    currentFilterKey.includes("sortBy:oldest_wa_created");
                  const createdAt = sortByWaCreated
                    ? (c?.lastMessage?.waCreatedAt ?? 0)
                    : (c?.conversationLastMessageAt ?? c?.lastReceivedMessageTimeStamp ?? 0);
                  return { id, createdAt };
                })
                .sort((a: any, b: any) => {
                  const oldestSort =
                    currentFilterKey.includes("sortBy:oldest") ||
                    currentFilterKey.includes("sortBy:oldest_wa_created");
                  const timeA = new Date(a.createdAt).getTime();
                  const timeB = new Date(b.createdAt).getTime();
                  return oldestSort ? timeA - timeB : timeB - timeA;
                })
                .map((c: any) => c.id);
              draft.contactsByFilter[currentFilterKey] = sortedList;
              updateIdb.push({ key: currentFilterKey, contactIds: sortedList });
              draft.isLoading = false;
            }
          }),
        );

        if (
          !state.currentFilterKey?.includes("waMessageAssignStatus:Assigned") &&
          (messageUpdated || assignStatusChanged)
        ) {
          state.updateContactList("open", contactId, messageUpdated);
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
          state.updateContactList("all", contactId, messageUpdated);
        }

        try {
          Promise.all(
            updateIdb.map(async (i) => {
              saveContactIdsForFilter(i.key, i.contactIds);
            }),
          );
          // if (contactId === get().selectedContact?.id && markUnread) {
          //   markWaMessagesAsRead(contactId); // Add this API call if needed in RN
          // }
          saveContactToDB(updatedContact);
        } catch (e) {
          console.error(e);
        }
      },

      updateContactList: (tab, contactId, isMessageUpdated) => {
        const updateIdb: any[] = [];
        switch (tab) {
          case "all":
            set(
              produce((draft) => {
                const state = get();
                const contact = state.contactsById.get(contactId);
                const isNew = !isInboxSessionExpired(contact.lastReceivedMessageTimeStamp);
                const filterList = Object.keys(draft.contactsByFilter).filter((key) =>
                  key.includes("messageType:all"),
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
                      contact &&
                      (!status.length || status[0]?.includes(contact.waMessageAssignStatus || ""))
                    ) {
                      newList.push(contactId);
                      changed = true;
                    }
                  }
                  if (
                    isInFilter &&
                    contact &&
                    status.length &&
                    !status[0]?.includes(contact.waMessageAssignStatus || "")
                  ) {
                    newList = contactIds.filter((id: string) => id !== contactId);
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
                        : (c?.conversationLastMessageAt ?? c?.lastReceivedMessageTimeStamp ?? 0);
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
          case "open":
            set(
              produce((draft) => {
                const state = get();
                const contact = state.contactsById.get(contactId);
                const isAssigned = contact.waMessageAssignStatus === WaMessageAssignStatus.ASSIGNED;

                const filterList = Object.keys(draft.contactsByFilter).filter((key) =>
                  key.includes("waMessageAssignStatus:Assigned"),
                );
                filterList.forEach((filterKey) => {
                  const contactIds = draft.contactsByFilter[filterKey] || [];
                  const isInFilter = contactIds.includes(contactId);
                  let newList = [...contactIds];
                  let changed = false;
                  if (isAssigned) {
                    if (!isInFilter) {
                      newList.push(contactId);
                      changed = true;
                    }
                  } else {
                    if (isInFilter) {
                      newList = contactIds.filter((id: string) => id !== contactId);
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
                        : (c?.conversationLastMessageAt ?? c?.lastReceivedMessageTimeStamp ?? 0);
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
                  contact?.waMessageAssignStatus === WaMessageAssignStatus.ASSIGNED;
                const filterList = Object.keys(draft.contactsByFilter).filter((key) =>
                  key.includes("waMessageAssignStatus:mine"),
                );
                filterList.forEach((filterKey) => {
                  const contactIds = draft.contactsByFilter[filterKey] || [];
                  const isInFilter = contactIds.includes(contactId);
                  let newList = [...contactIds];
                  let changed = false;
                  if (
                    isAssigned &&
                    // Contacts hydrated from SQLite or patched by a websocket
                    // event can arrive without `assignedUsers`; assigning now
                    // reaches this branch, so it must not throw.
                    contact?.assignedUsers?.some((a: any) => a.id === state.currentUser?.userId)
                  ) {
                    if (!isInFilter) {
                      newList.push(contactId);
                      changed = true;
                    }
                  } else {
                    if (isInFilter) {
                      newList = contactIds.filter((id: string) => id !== contactId);
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
                        : (c?.conversationLastMessageAt ?? c?.lastReceivedMessageTimeStamp ?? 0);
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
            saveContactIdsForFilter(i.key, i.contactIds);
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

      /**
       * Star flag. `updateContactById` can't be reused here: it only rewrites a
       * filter list when the assign status or the last message changed, so
       * un-starring would leave the row sitting in the Favourites tab. This
       * patches the contact and fixes membership of every cached `favorite:true`
       * list, then mirrors both into SQLite.
       */
      setContactFavorite(contactId, isFavorite) {
        const contact = get().contactsById.get(contactId);
        if (!contact) return;
        const updatedContact = {
          ...contact,
          isFavorite,
          updatedAt: new Date().toISOString(),
        };
        const updateIdb: { key: string; contactIds: string[] }[] = [];

        set(
          produce((draft: any) => {
            const newContactsById = new Map(draft.contactsById);
            newContactsById.set(contactId, updatedContact);
            draft.contactsById = newContactsById;

            if (draft.selectedContact?.id === contactId) {
              draft.selectedContact = updatedContact;
            }

            Object.keys(draft.contactsByFilter)
              .filter((key) => key.includes("favorite:true"))
              .forEach((filterKey) => {
                const contactIds: string[] = draft.contactsByFilter[filterKey] || [];
                const isInFilter = contactIds.includes(contactId);
                if (isFavorite === isInFilter) return;
                const newList = isFavorite
                  ? [contactId, ...contactIds]
                  : contactIds.filter((id) => id !== contactId);
                draft.contactsByFilter[filterKey] = newList;
                updateIdb.push({ key: filterKey, contactIds: newList });
              });
          }),
        );

        try {
          saveContactToDB(updatedContact);
          updateIdb.forEach((i) => saveContactIdsForFilter(i.key, i.contactIds));
        } catch (e) {
          console.error(e);
        }
      },

      /**
       * Clear the badge for a contact and tell the server it was read.
       *
       * Mirrors `resetUnreadForContact` in rateup-ui's inbox store. The counter
       * is zeroed locally first: the inbox renders from this store, and the
       * read-receipt call returns nothing the list reads back, so waiting on it
       * would leave the badge up for the length of a round-trip.
       *
       * The receipt call itself was commented out here, which is why opening a
       * chat cleared nothing that survived a refresh — the badge came back from
       * the server on the next load because the server was never told.
       */
      resetUnreadForContact(contactId, contact) {
        if (!contact) contact = get().contactsById.get(contactId);
        if (contact && contact.unReadMessageCount !== 0) {
          // Patch the live row, not the `contact` snapshot a caller handed in: a
          // snapshot taken before a newer message arrived would put the old
          // preview back.
          get().updateContactById(contactId, (c: any) => ({
            ...c,
            unReadMessageCount: 0,
          }));
        }
        if (!contact) return;
        // Not awaited — nothing here needs the result — but the rejection is
        // handled, or a dropped connection would surface as an unhandled promise
        // rejection rather than a log line.
        markMessageAsRead(contact.id).catch((e) => console.error(e));
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
                    (cid: string) => !contactIds.includes(cid),
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
    }),
    {
      name: "inbox-selected-contact",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedContact: state.selectedContact,
      }),
    },
  ),
);

interface MessagesStore {
  messagesByKey: Map<string, { messages: any[] }>;
  selectedKey: string | null;
  accessTimestamps: Map<string, number>;
  setSelected: (contactId: string, account: string) => void;
  mergeMessages: (key: string, messages: any[], evictInactive?: boolean) => void;
  addMessage: (key: string, message: any) => void;
  removeMessage: (key: string, messageId: string) => void;
  getMessages: (key: string) => any[];
  isLoading: boolean;
  setIsLoading: (valu: boolean) => void;
  updateMessageByMessageId: (key: string, messageId: string, updatedData: Partial<any>) => void;
  applyMessageStatus: (contactId: string | null | undefined, messageId: string, stats: any) => void;
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
          set((s) => {
            const newMap = new Map(s.messagesByKey);
            newMap.set(key, { messages: [] });
            return { messagesByKey: newMap };
          });
        set({ selectedKey: key });
      },

      mergeMessages: (key, messages, _evictInactive = true) => {
        const state = get();
        const m = new Map(state.messagesByKey);
        const entry = m.get(key) ?? { messages: [] };

        const existing = new Map(entry.messages.map((x) => [x.messageId ?? x.id, x]));

        const changedOrNew: any[] = [];

        for (const msg of messages) {
          const id = msg.messageId ?? msg.id;
          // The stored copy of a message this device sent: retire the
          // placeholder it stands in for — that one only. This used to drop
          // *every* placeholder whenever any outgoing message arrived, so another
          // agent's reply, or a thread refetch, erased a send still in flight.
          const placeholderId =
            isOptimisticId(id) || existing.has(id) ? undefined : findPlaceholderFor(existing, msg);
          if (placeholderId) {
            existing.delete(placeholderId);
            deleteMessageFromIDB(key, placeholderId);
          }
          const existingMsg = existing.get(id);

          if (existingMsg) {
            const merged = {
              ...existingMsg,
              ...msg,
              stats: {
                read: msg.stats?.read?.length ? msg.stats.read : existingMsg.stats?.read,
                sent: msg.stats?.sent?.length ? msg.stats.sent : existingMsg.stats?.sent,
                delivered: msg.stats?.delivered?.length
                  ? msg.stats.delivered
                  : existingMsg.stats?.delivered,
                failed: msg.stats?.failed?.length ? msg.stats.failed : existingMsg.stats?.failed,
              },
            };

            if (!isEqual(existingMsg, merged)) {
              existing.set(id, merged);
              changedOrNew.push(merged);
            }
          } else {
            existing.set(id, msg);
            changedOrNew.push(msg);
          }
        }

        const sortedMessages = Array.from(existing.values()).sort((a, b) => {
          const timeA = new Date(a.waCreatedAt || a.createdAt || a.timestamp || 0).getTime();
          const timeB = new Date(b.waCreatedAt || b.createdAt || b.timestamp || 0).getTime();
          return timeB - timeA;
        });

        entry.messages = sortedMessages;
        m.set(key, entry);
        set({ messagesByKey: m });

        if (changedOrNew.length) {
          saveMessagesToIDB(key, changedOrNew);
        }
      },

      addMessage: (key, message) => {
        const state = get();
        const m = new Map(state.messagesByKey);
        const entry = m.get(key) ?? { messages: [] };

        const updatedMessages = [...entry.messages, message].sort(
          (a, b) => new Date(b.waCreatedAt).getTime() - new Date(a.waCreatedAt).getTime(),
        );

        entry.messages = updatedMessages;
        m.set(key, entry);
        set({ messagesByKey: m });

        saveMessagesToIDB(key, [message]);
      },

      removeMessage: (key, messageId) => {
        const state = get();
        const entry = state.messagesByKey.get(key);
        if (!entry?.messages?.length) return;

        const filteredMessages = entry.messages.filter(
          (msg) => (msg.messageId ?? msg.id) !== messageId,
        );

        const m = new Map(state.messagesByKey);
        m.set(key, { messages: filteredMessages });
        set({ messagesByKey: m });

        deleteMessageFromIDB(key, messageId);
      },

      updateMessageByMessageId: (key, messageId, data) =>
        set((state) => {
          const entry = state.messagesByKey.get(key);
          if (!entry?.messages?.length) return state;

          const idx = entry.messages.findIndex((m) => (m.messageId ?? m.id) === messageId);
          if (idx === -1) return state;

          const updatedMessages = [...entry.messages];
          const updatedMessage = { ...updatedMessages[idx], ...data };
          updatedMessages[idx] = updatedMessage;
          const sorted = data.waCreatedAt
            ? updatedMessages.sort(
                (a, b) => new Date(b.waCreatedAt).getTime() - new Date(a.waCreatedAt).getTime(),
              )
            : updatedMessages;
          const newMap = new Map(state.messagesByKey);
          newMap.set(key, { messages: sorted });
          saveMessagesToIDB(key, [updatedMessage]);
          return { messagesByKey: newMap };
        }),
      /**
       * A `message_status_update` frame names only the wamid, so the message has
       * to be found across every thread key the contact owns — `<id>_all` plus
       * one per source identifier — and patched in each.
       *
       * Nothing is inserted when the message isn't cached: a stub carrying only
       * `messageId` and `stats` would sort to the top of the thread and render as
       * an empty bubble. A status for an uncached message is simply dropped; the
       * next fetch brings the timestamps down with the message itself.
       */
      applyMessageStatus: (contactId, messageId, stats) => {
        if (!messageId) return;
        const m = new Map(get().messagesByKey);
        const changed: { key: string; message: any }[] = [];

        for (const [key, entry] of m) {
          if (contactId && !key.startsWith(`${contactId}_`)) continue;

          const idx = entry.messages.findIndex((msg) => (msg.messageId ?? msg.id) === messageId);
          if (idx === -1) continue;

          const existing = entry.messages[idx];
          const mergedStats = mergeStats(existing.stats, stats);
          // Three frames land per outgoing message; re-setting the map on a
          // no-op would re-render every open thread for nothing.
          if (isEqual(existing.stats, mergedStats)) continue;

          const updated = { ...existing, stats: mergedStats };
          const messages = [...entry.messages];
          messages[idx] = updated;
          m.set(key, { ...entry, messages });
          changed.push({ key, message: updated });
        }

        if (!changed.length) return;
        set({ messagesByKey: m });
        changed.forEach(({ key, message }) => saveMessagesToIDB(key, [message]));
      },

      getMessages: (key) => get().messagesByKey.get(key)?.messages ?? [],
    }),
    {
      name: "selected-contact-message-key",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedKey: state.selectedKey,
      }),
    },
  ),
);
