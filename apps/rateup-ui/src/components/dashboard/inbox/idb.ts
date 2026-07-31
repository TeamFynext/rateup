import { openDB } from "idb";
import { isEqual } from "lodash";

import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";

import type { ContactWithUpdatedAt } from "./store.ts";

const DB_NAME = "chat_contacts_db";
const STORE_GLOBAL = "contacts_global";
const STORE_FILTERS = "contacts_by_filter";
const STORE_MESSAGES = "messages";

async function getDB() {
  // v5: Inbox Tickets v2 re-keyed the cached rows from contact id to ticket
  // (conversation) id. Entries written by v4 are keyed by contact and would
  // collapse a contact's tickets into one row, so that store is dropped on upgrade.
  return openDB(DB_NAME, 5, {
    upgrade(db, oldVersion) {
      if (oldVersion < 5 && db.objectStoreNames.contains(STORE_GLOBAL)) {
        db.deleteObjectStore(STORE_GLOBAL);
      }
      if (oldVersion < 5 && db.objectStoreNames.contains(STORE_FILTERS)) {
        db.deleteObjectStore(STORE_FILTERS);
      }
      if (!db.objectStoreNames.contains(STORE_GLOBAL)) {
        db.createObjectStore(STORE_GLOBAL); // key = getRowKey(row) — the ticket id
      }
      if (!db.objectStoreNames.contains(STORE_FILTERS)) {
        db.createObjectStore(STORE_FILTERS); // key = filterKey, value = rowKeys[]
      }
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const store = db.createObjectStore(STORE_MESSAGES, { keyPath: "id" });
        if (!store.indexNames.contains("key")) store.createIndex("key", "key", { unique: false });
      }
    },
  });
}

export async function saveContactToDB(contact: ContactWithUpdatedAt) {
  if (!contact) return;
  const db = await getDB();
  await db.put(STORE_GLOBAL, contact, getRowKey(contact));
}

export async function saveContactsToDB(contacts: ContactWithUpdatedAt[]) {
  if (!contacts.length) return;
  const db = await getDB();
  const tx = db.transaction(STORE_GLOBAL, "readwrite");
  for (const c of contacts) {
    tx.store.put(c, getRowKey(c));
  }
  await tx.done;
}

export async function _loadContactFromDB(id: string): Promise<ContactWithUpdatedAt | undefined> {
  const db = await getDB();
  return db.get(STORE_GLOBAL, id);
}

export async function loadContactsFromDB(ids: string[]): Promise<ContactWithUpdatedAt[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_GLOBAL, "readonly");
  const results: ContactWithUpdatedAt[] = [];
  for (const id of ids) {
    const contact = await tx.store.get(id);
    if (contact) results.push(contact);
  }
  await tx.done;
  return results;
}

export async function clearAllContactsFromDB() {
  const db = await getDB();
  await db.clear(STORE_GLOBAL);
  await db.clear(STORE_FILTERS);
  await db.clear(STORE_MESSAGES);
}

export async function saveContactIdsForFilter(filterKey: string, contactIds: string[]) {
  const db = await getDB();
  await db.put(STORE_FILTERS, contactIds, filterKey);
}

export async function loadContactIdsForFilter(filterKey: string): Promise<string[]> {
  const db = await getDB();
  return (await db.get(STORE_FILTERS, filterKey)) || [];
}

export async function saveMessagesToIDB(key: string, messages: unknown[]) {
  const db = await getDB();
  const tx = db.transaction(STORE_MESSAGES, "readwrite");
  const store = tx.objectStore(STORE_MESSAGES);
  const index = store.index("key");
  const range = IDBKeyRange.only(key);
  const existingEntries = await index.getAll(range);

  const existingMap = new Map(existingEntries.map((e) => [e.message.id, e.message]));

  const toUpdate: unknown[] = [];
  for (const m of messages) {
    const existing = existingMap.get(m.id);
    if (!existing || !isEqual(existing, m)) {
      toUpdate.push({ id: `${key}_${m.id}`, key, message: m });
    }
  }

  if (toUpdate.length) {
    const writeTx = db.transaction(STORE_MESSAGES, "readwrite");
    const writeStore = writeTx.objectStore(STORE_MESSAGES);
    for (const item of toUpdate) {
      writeStore.put(item);
    }
    await writeTx.done;
  }
  await tx.done;
}

export async function getMessagesFromIDB(key: string) {
  const db = await getDB();
  const tx = db.transaction(STORE_MESSAGES, "readonly");
  const store = tx.objectStore(STORE_MESSAGES);
  const index = store.index("key");
  const range = IDBKeyRange.only(key);
  const res = await index.getAll(range);
  const messages = res.map((m) => m.message);
  return messages;
}

/**
 * Patch one message wherever it is cached, without knowing which thread bucket
 * holds it. The cache outlives the session — a message revoked while an agent
 * had the tab closed, or while they were reading another ticket, would otherwise
 * keep rendering its original text until the server happened to re-send that row
 * in a fetched page. The scan is over a rare event, so a full cursor walk is fine.
 *
 * Matches on the WhatsApp id (`messageId`) and on the row id, because outbound
 * rows are cached under whichever of the two they have.
 */
export async function patchMessageInIDB(messageId: string, data: Record<string, any>) {
  if (!messageId) return;
  const db = await getDB();
  const tx = db.transaction(STORE_MESSAGES, "readwrite");
  const store = tx.objectStore(STORE_MESSAGES);

  let cursor = await store.openCursor();
  while (cursor) {
    const cached = cursor.value?.message;
    if (cached && (cached.messageId === messageId || cached.id === messageId)) {
      await cursor.update({ ...cursor.value, message: { ...cached, ...data } });
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function clearAllMessagesFromIDB() {
  const db = await getDB();
  await db.clear(STORE_MESSAGES);
}

export async function _removeMessagesFromIDB(key: string) {
  const db = await getDB();
  const tx = db.transaction(STORE_MESSAGES, "readwrite");
  const store = tx.objectStore(STORE_MESSAGES);

  let cursor = await store.openCursor();
  while (cursor) {
    if (cursor.value.key === key) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function _removeContactFromDB(id: string) {
  const db = await getDB();
  await db.delete(STORE_GLOBAL, id);
}

export async function removeContactsFromDB(ids: string[]) {
  const db = await getDB();
  const tx = db.transaction(STORE_GLOBAL, "readwrite");
  for (const id of ids) {
    await tx.store.delete(id);
  }
  await tx.done;
}
