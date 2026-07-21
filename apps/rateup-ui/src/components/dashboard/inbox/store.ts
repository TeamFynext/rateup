import { enableMapSet, produce } from "immer";
import { isEqual } from "lodash";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  ContactsWithLastMessage,
  WaGetMessagesBody,
} from "@/backend/whatsapp/inbox/message/wamessage.api";
import { getRowKey, markWaMessagesAsRead } from "@/backend/whatsapp/inbox/message/wamessage.api";
import type { ChatFilter } from "@/components/whatsapp/inbox/chatselect/chatFilter/index.tsx";
import type { User } from "@/context/UserContext.tsx";
import { WaMessageAssignStatus } from "@/types/enums.ts";
import { isInboxSessionExpired } from "@/utils/whatsapp/inbox.ts";

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
} from "./idb.ts";

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
  /** Ticket counts, not contact counts — the inbox list is conversation-grained. */
  sectionCounts: {
    /** Assigned (not Unassigned) */
    openCount: number;
    /** Closed / Addressed */
    closedCount: number;
    /** All (new + assigned + closed) */
    allCount: number;
    /** Unassigned and active in the last 24h */
    newCount: number;
    /** Tickets with an unseen @mention for the current user */
    mentionsCount: number;
    /** Tickets whose contact is starred */
    favouriteCount: number;
    /** Assigned tickets the current user is on */
    mineCount: number;
    /** Tickets marked as spam */
    spamCount: number;
  };
  setSectionCounts: (value: ChatContactCountStore["sectionCounts"]) => void;
  /** Applies a local delta (e.g. from a socket event) without waiting for a backend refetch. */
  bumpSectionCounts: (delta: Partial<ChatContactCountStore["sectionCounts"]>) => void;
}

const useContactStore = create<ContactStore>((set) => ({
  opened: false,
  open: () => set((_state) => ({ opened: true })),
  close: () => set((_state) => ({ opened: false })),
  selectedTicket: null,
  setSelectedTicket: (ticket) => set({ selectedTicket: ticket }),
  setTicketAndOpen: (ticket) => set({ selectedTicket: ticket, opened: true }),
  filterData: null,
  setFilterData: (value) => set({ filterData: value }),
}));

export const useChatContactCountStore = create<ChatContactCountStore>((set) => ({
  sectionCounts: {
    openCount: 0,
    closedCount: 0,
    allCount: 0,
    newCount: 0,
    mentionsCount: 0,
    favouriteCount: 0,
    mineCount: 0,
    spamCount: 0,
  },
  setSectionCounts: (value) => set({ sectionCounts: value }),
  bumpSectionCounts: (delta) =>
    set((state) => ({
      sectionCounts: {
        openCount: state.sectionCounts.openCount + (delta.openCount ?? 0),
        closedCount: state.sectionCounts.closedCount + (delta.closedCount ?? 0),
        allCount: state.sectionCounts.allCount + (delta.allCount ?? 0),
        newCount: state.sectionCounts.newCount + (delta.newCount ?? 0),
        mentionsCount: state.sectionCounts.mentionsCount + (delta.mentionsCount ?? 0),
        favouriteCount: state.sectionCounts.favouriteCount + (delta.favouriteCount ?? 0),
        mineCount: state.sectionCounts.mineCount + (delta.mineCount ?? 0),
        spamCount: state.sectionCounts.spamCount + (delta.spamCount ?? 0),
      },
    })),
}));

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
  resetUnreadForContact: (contactId: string, contact?: ContactWithUpdatedAt) => void;
  setSelectedContact: (contact) => void;
  getContactsByIds: (ids: string[]) => Promise<ContactWithUpdatedAt[]>;
  clearAllContacts: () => Promise<void>;
  deleteContactsByIds: (contactIds: string[]) => Promise<void>;
  clearContactsForFilter: (filter: ChatFilter) => void;
  updateContactList: (tab, contactId, isMessageUpdated: boolean) => void;
}

enableMapSet();
// for messages

/**
 * Inbox Tickets v2 — `contactsById` is keyed by *ticket* (conversation id), so one
 * contact can own several rows. Realtime events arrive per contact, and an inbound
 * message belongs to that contact's **live** ticket only: applying it to every row
 * would light up unread badges on tickets that were closed months ago.
 *
 * Live ticket = most recently active row that is not in a terminal state; if every
 * ticket is closed, the most recent one (the next inbound message reopens it).
 */
const TERMINAL_TICKET_STATUSES = new Set([
  WaMessageAssignStatus.CLOSED,
  WaMessageAssignStatus.SPAM,
  WaMessageAssignStatus.RESOLVED,
  WaMessageAssignStatus.UNRESOLVED,
]);

function rowActivityAt(row: ContactWithUpdatedAt): number {
  const stamp =
    row?.conversationLastMessageAt ??
    row?.lastMessage?.waCreatedAt ??
    row?.lastReceivedMessageTimeStamp;
  return stamp ? new Date(stamp).getTime() : 0;
}

/**
 * Whether an incoming row should replace the copy already held. It does unless
 * the one in hand can be shown to be newer.
 *
 * The list rows carried no `updatedAt` at all, so the old `new Date(undefined) >
 * new Date(existing.updatedAt)` was always false and a cached row was *never*
 * refreshed from the API: a ticket that closed after it was first cached kept
 * its stale `conversationStatus` client-side, which is how a closed ticket ended
 * up rendering the message composer. Optimistic local edits stamp `updatedAt`
 * with the client clock, so they still outrank an older in-flight response.
 */
function isFresherRow(incoming: ContactWithUpdatedAt, existing: ContactWithUpdatedAt): boolean {
  const incomingAt = Date.parse(incoming?.updatedAt ?? "");
  const existingAt = Date.parse(existing?.updatedAt ?? "");
  if (Number.isNaN(incomingAt) || Number.isNaN(existingAt)) return true;
  return incomingAt >= existingAt;
}

function liveRowKeyForContact(
  contactsById: Map<string, ContactWithUpdatedAt>,
  contactId: string,
): string | null {
  let best: { key: string; open: boolean; at: number } | null = null;
  for (const [key, row] of contactsById) {
    if (row?.id !== contactId) continue;
    const status = (row.conversationStatus ?? row.waMessageAssignStatus) as WaMessageAssignStatus;
    const open = !TERMINAL_TICKET_STATUSES.has(status);
    const at = rowActivityAt(row);
    // Prefer an open ticket; among equals prefer the most recently active.
    if (!best || (open && !best.open) || (open === best.open && at > best.at)) {
      best = { key, open, at };
    }
  }
  return best?.key ?? null;
}

/**
 * Which ticket row a realtime event belongs to, or `null` when the store has no
 * row for it yet and the caller should insert one.
 *
 * Socket payloads are contact-grained — the contact record they carry has no
 * conversation id — while `contactsById` is keyed by ticket. Looking a row up by
 * contact id therefore missed every threaded row, and the handler inserted a
 * second row keyed by the contact id: a duplicate ticket next to the open one,
 * which a reload then cleared because the API rows are keyed properly.
 */
export function resolveIncomingRowKey(
  contactsById: Map<string, ContactWithUpdatedAt>,
  contactId: string,
  conversationId?: string | null,
): string | null {
  if (conversationId && contactsById.has(conversationId)) return conversationId;
  // Rows cached before threading are still keyed by contact id.
  if (contactsById.has(contactId)) return contactId;
  // A payload that names its ticket and matches nothing is a ticket the store has
  // not seen; without one, the contact's live ticket is the only sensible target.
  return conversationId ? null : liveRowKeyForContact(contactsById, contactId);
}

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
              const rowKey = getRowKey(c);
              const existing = contactsByIdMap.get(rowKey);
              if (!existing || isFresherRow(c, existing)) {
                contactsByIdMap.set(rowKey, c);
              }
            });
            state.contactsById = contactsByIdMap;

            const existingIds = new Set(state.contactsByFilter[filterKey] || []);
            ids.forEach((id) => existingIds.add(id));
            state.contactsByFilter[filterKey] = Array.from(existingIds);
          }),
        );
      },

      addContactsForFilter: async (filterKey, contacts, updateOtherTabs = false) => {
        const { currentFilterKey } = get();
        if (!filterKey || currentFilterKey !== filterKey) return;
        let sortedList = [];
        set(
          produce((state: ContactsStoreState) => {
            state.isLoading = true;
            const existingIds = state.contactsByFilter[filterKey] || [];
            const contactIdsSet = new Set(existingIds);
            const contactsByIdMap = new Map(state.contactsById);
            const selectedRowKey = state.selectedContact ? getRowKey(state.selectedContact) : null;
            contacts.forEach((c) => {
              const { ...rest } = c;
              // A contact-grained payload (realtime events carry a bare Contact,
              // with no ticket id) must never open a second row beside that
              // contact's real ticket rows — that duplicate is what a reload used
              // to clear. Fold it into the contact's live ticket instead.
              const rowKey = c.conversationId
                ? getRowKey(c)
                : (liveRowKeyForContact(contactsByIdMap, c.id) ?? getRowKey(c));
              const existing = contactsByIdMap.get(rowKey);
              if (!existing || isFresherRow(c, existing)) {
                contactsByIdMap.set(rowKey, {
                  ...existing,
                  ...rest,
                  // Ticket identity only ever comes off a real row; a partial
                  // payload must not blank it out and orphan the row's key.
                  conversationId: rest.conversationId ?? existing?.conversationId,
                  unReadMessageCount: selectedRowKey === rowKey ? 0 : c.unReadMessageCount,
                });
              }
              const updatedContact = contactsByIdMap.get(rowKey);

              // The ticket's own status is authoritative now; the contact-level one
              // is the fallback for rows that predate conversation threading.
              const isAssigned =
                (updatedContact.conversationStatus ?? updatedContact.waMessageAssignStatus) ===
                WaMessageAssignStatus.ASSIGNED;
              // Open tab only shows Assigned contacts
              if (!isAssigned && currentFilterKey?.includes("waMessageAssignStatus:Assigned"))
                return false;
              if (!isAssigned && currentFilterKey?.includes("waMessageAssignStatus:mine"))
                return false;
              contactIdsSet.add(rowKey);
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
        Promise.all([saveContactsToDB(contacts), saveContactIdsForFilter(filterKey, sortedList)]);
        const state = get();
        if (updateOtherTabs && contacts.length === 1) {
          const contactId = getRowKey(contacts[0]);
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

      updateContactById(contactId, updater, markUnread) {
        const state = get();
        // Realtime events are contact-grained; route them to that contact's live
        // ticket. Callers inside the store already pass a row key, so accept both.
        const rowKey = state.contactsById.has(contactId)
          ? contactId
          : liveRowKeyForContact(state.contactsById, contactId);
        const contact = rowKey ? state.contactsById.get(rowKey) : null;
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
            newContactsById.set(rowKey, updatedContact);
            draft.contactsById = newContactsById;

            if (state.selectedContact && rowKey === getRowKey(state.selectedContact)) {
              draft.selectedContact = updatedContact;
            }

            const currentList = contactsByFilter[currentFilterKey] || [];
            let contactIncluded = currentList.includes(rowKey);
            const isUnassigned =
              updatedContact.waMessageAssignStatus === WaMessageAssignStatus.UNASSIGNED;
            assignStatusChanged =
              updatedContact.waMessageAssignStatus !== contact.waMessageAssignStatus;
            const statusMatch = currentFilterKey?.match(/status:([^|]*)/);
            let statuses = statusMatch ? statusMatch[1].split(",").filter(Boolean) : [];
            // Closed/Addressed tab with no explicit status sub-filter means "any closed status"
            if (!statuses.length && currentFilterKey?.includes("waMessageAssignStatus:Addressed")) {
              statuses = [
                WaMessageAssignStatus.CLOSED,
                WaMessageAssignStatus.RESOLVED,
                WaMessageAssignStatus.UNRESOLVED,
                WaMessageAssignStatus.SPAM,
              ];
            }
            const belongsToCurrentFilter =
              (statuses.length === 0 || statuses.includes(updatedContact.waMessageAssignStatus)) &&
              (!currentFilterKey?.includes("waMessageAssignStatus:mine") ||
                (updatedContact.waMessageAssignStatus === WaMessageAssignStatus.ASSIGNED &&
                  updatedContact.assignedUsers?.some((u) => u.id === state.currentUser?.userId))) &&
              // Favourites tab: unstarring a ticket must drop it from the list, not
              // just clear the icon. (`favorite:true` is in the key on that tab.)
              (!currentFilterKey?.includes("favorite:true") || !!updatedContact.isFavorite) &&
              // @Mentions tab: clearing a mention drops the ticket from the list.
              (!currentFilterKey?.includes("mentions:true") ||
                (updatedContact.mentionCount ?? 0) > 0);

            const shouldFilterOut = contactIncluded && !belongsToCurrentFilter;
            const prevWaCreated = contact.lastMessage?.waCreatedAt ?? 0;
            const newWaCreated = updatedContact.lastMessage?.waCreatedAt ?? 0;
            messageUpdated = newWaCreated > prevWaCreated;
            if (!contactIncluded) {
              const isNewFilter = currentFilterKey?.includes("waMessageAssignStatus:New");

              if (isNewFilter && isUnassigned) {
                currentList.push(rowKey);
                contactIncluded = true;
              }

              if (!contactIncluded) return;
            }
            if (messageUpdated || shouldFilterOut) {
              draft.isLoading = true;

              const baseList = shouldFilterOut
                ? currentList.filter((id) => id !== rowKey)
                : currentList;
              const sortedList = baseList
                .map((id) => {
                  const c = draft.contactsById.get(id);
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
          state.updateContactList("open", rowKey, messageUpdated);
        }
        if (
          !state.currentFilterKey?.includes("waMessageAssignStatus:mine") &&
          (messageUpdated || assignStatusChanged)
        ) {
          state.updateContactList("mine", rowKey, messageUpdated);
        }
        if (
          !state.currentFilterKey?.includes("messageType:all") &&
          (assignStatusChanged || messageUpdated)
        ) {
          state.updateContactList("all", rowKey, messageUpdated);
        }

        try {
          Promise.all(
            updateIdb.map(async (i) => {
              saveContactIdsForFilter(i.key, i.contactIds);
            }),
          );
          // Read-receipts stay contact-grained — that is what the API accepts.
          if (contact.id === get().selectedContact?.id && markUnread) {
            markWaMessagesAsRead(contact.id);
          }
          saveContactToDB(updatedContact);
        } catch (e) {
          console.error(e);
        }
      },

      updateContactList: (tab, contactId, isMessageUpdated) => {
        const updateIdb = [];
        // Callers pass a ticket row key; tolerate a bare contact id too.
        if (!get().contactsById.has(contactId)) {
          const resolved = liveRowKeyForContact(get().contactsById, contactId);
          if (!resolved) return;
          contactId = resolved;
        }
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
                  const statusMatch = filterKey?.match(/status:([^|]*)/);
                  const statuses = statusMatch ? statusMatch[1].split(",").filter(Boolean) : [];
                  if (isNew) {
                    if (
                      !isInFilter &&
                      (!statuses.length || statuses.includes(contact.waMessageAssignStatus))
                    ) {
                      newList.push(contactId);
                      changed = true;
                    }
                  }
                  if (
                    isInFilter &&
                    statuses.length &&
                    !statuses.includes(contact.waMessageAssignStatus)
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
            // Open = Assigned and Unassigned contacts (not Closed/Addressed)
            set(
              produce((draft) => {
                const state = get();
                const contact = state.contactsById.get(contactId);

                const filterList = Object.keys(draft.contactsByFilter).filter(
                  (key) =>
                    key.includes("messageType:usermessages") &&
                    !key.includes("waMessageAssignStatus:mine") &&
                    (key.includes("waMessageAssignStatus:undefined") ||
                      key.includes("waMessageAssignStatus:null") ||
                      !key.includes("waMessageAssignStatus:")),
                );
                filterList.forEach((filterKey) => {
                  const contactIds = draft.contactsByFilter[filterKey] || [];
                  const isInFilter = contactIds.includes(contactId);
                  let newList = [...contactIds];
                  let changed = false;

                  const statusMatch = filterKey.match(/status:([^|]*)/);
                  const statuses = statusMatch ? statusMatch[1].split(",").filter(Boolean) : [];
                  const matchesStatus = statuses.length
                    ? statuses.includes(contact.waMessageAssignStatus)
                    : [WaMessageAssignStatus.ASSIGNED, WaMessageAssignStatus.UNASSIGNED].includes(
                        contact.waMessageAssignStatus as WaMessageAssignStatus,
                      );

                  if (matchesStatus) {
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

                const isAssigned = contact.waMessageAssignStatus === WaMessageAssignStatus.ASSIGNED;
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
                    contact.assignedUsers.some((a) => a.id === state.currentUser.userId)
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

      /** `rowKey` identifies the ticket; the read-receipt call stays contact-grained. */
      resetUnreadForContact(rowKey, contact) {
        if (!contact) contact = get().contactsById.get(rowKey);
        if (contact && contact.unReadMessageCount !== 0) {
          get().updateContactById(rowKey, (_c) => ({
            ...contact,
            unReadMessageCount: 0,
          }));
        }
        if (!contact) return;
        try {
          markWaMessagesAsRead(contact.id);
        } catch (e) {
          console.error(e);
        }
      },

      setSelectedContact(contact) {
        if (contact && contact.unReadMessageCount !== 0) {
          get().resetUnreadForContact(getRowKey(contact), contact);
        }
        // Register the selection in `contactsById` if it is not already there.
        // A ticket opened from the thread's history strip is synthesized rather
        // than paged in by the list, and anything keyed off the row map
        // (`updateContactById`, favourite toggles, ticket edits) would silently
        // no-op for it otherwise. This does NOT put it in the list: membership
        // comes from `contactsByFilter`, which is left untouched.
        if (contact) {
          const rowKey = getRowKey(contact);
          if (!get().contactsById.has(rowKey)) {
            set(
              produce((state: ContactsStoreState) => {
                const next = new Map(state.contactsById);
                next.set(rowKey, {
                  ...contact,
                  updatedAt: contact.updatedAt ?? new Date().toISOString(),
                });
                state.contactsById = next;
              }),
            );
          }
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
            contactsById.set(getRowKey(c), c);
            result.push(c);
          });
          set({ contactsById });
        }

        return result;
      },

      deleteContactsByIds: async (contactIds: string[]) => {
        // Deleting a contact removes every ticket it owns, so map the contact ids
        // onto their row keys first.
        const targets = new Set(contactIds);
        const rowKeys: string[] = [];
        for (const [key, row] of get().contactsById) {
          if (targets.has(row?.id) || targets.has(key)) rowKeys.push(key);
        }
        contactIds = rowKeys.length ? rowKeys : contactIds;
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
  mergeMessages: (key: string, messages: WaGetMessagesBody[], evictInactive?: boolean) => void;
  addMessage: (key: string, message: WaGetMessagesBody) => void;
  removeMessage: (key: string, messageId: string) => void;
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

      mergeMessages: (key, messages, _evictInactive = true) => {
        const state = get();
        const m = new Map(state.messagesByKey);
        const entry = m.get(key) ?? { messages: [] };

        const existing = new Map(entry.messages.map((x) => [x.messageId ?? x.id, x]));

        const changedOrNew: any[] = [];

        for (const msg of messages) {
          const id = msg.messageId ?? msg.id;
          const existingMsg = existing.get(id);

          if (existingMsg) {
            const merged = {
              ...existingMsg,
              ...msg,
              stats: {
                read: msg.stats.read.length ? msg.stats.read : existingMsg.stats.read,
                sent: msg.stats.sent.length ? msg.stats.sent : existingMsg.stats.sent,
                delivered: msg.stats.delivered.length
                  ? msg.stats.delivered
                  : existingMsg.stats.delivered,
                failed: msg.stats.failed.length ? msg.stats.failed : existingMsg.stats.failed,
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

        const sortedMessages = Array.from(existing.values()).sort(
          (a, b) => new Date(b.waCreatedAt).getTime() - new Date(a.waCreatedAt).getTime(),
        );

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

        // Add new message and sort
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

        saveMessagesToIDB(key, filteredMessages);
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
