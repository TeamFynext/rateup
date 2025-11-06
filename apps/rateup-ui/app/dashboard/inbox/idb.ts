import { openDB } from "idb";
import lodash from "lodash";

import { ContactWithUpdatedAt } from "./store";

const DB_NAME = "chat_contacts_db";
const STORE_GLOBAL = "contacts_global";
const STORE_FILTERS = "contacts_by_filter";
const STORE_MESSAGES = "messages";

export async function getDB() {
  return openDB(DB_NAME, 4, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_GLOBAL)) {
        db.createObjectStore(STORE_GLOBAL); // key = contact.id
      }
      if (!db.objectStoreNames.contains(STORE_FILTERS)) {
        db.createObjectStore(STORE_FILTERS); // key = filterKey, value = contactIds[]
      }
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const store = db.createObjectStore(STORE_MESSAGES, { keyPath: "id" });
        if (!store.indexNames.contains("key"))
          store.createIndex("key", "key", { unique: false });
      }
    },
  });
}

export async function saveContactToDB(contact: ContactWithUpdatedAt) {
  if (!contact) return;
  const db = await getDB();
  await db.put(STORE_GLOBAL, contact, contact.id);
}

export async function saveContactsToDB(contacts: ContactWithUpdatedAt[]) {
  if (!contacts.length) return;
  const db = await getDB();
  const tx = db.transaction(STORE_GLOBAL, "readwrite");
  for (const c of contacts) {
    tx.store.put(c, c.id);
  }
  await tx.done;
}

export async function loadContactFromDB(
  id: string,
): Promise<ContactWithUpdatedAt | undefined> {
  const db = await getDB();
  return db.get(STORE_GLOBAL, id);
}

export async function loadContactsFromDB(
  ids: string[],
): Promise<ContactWithUpdatedAt[]> {
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

export async function saveContactIdsForFilter(
  filterKey: string,
  contactIds: string[],
) {
  const db = await getDB();
  await db.put(STORE_FILTERS, contactIds, filterKey);
}

export async function loadContactIdsForFilter(
  filterKey: string,
): Promise<string[]> {
  const db = await getDB();
  return (await db.get(STORE_FILTERS, filterKey)) || [];
}

export async function saveMessagesToIDB(key: string, messages: any[]) {
  const db = await getDB();
  const tx = db.transaction(STORE_MESSAGES, "readwrite");
  const store = tx.objectStore(STORE_MESSAGES);
  const index = store.index("key");
  const range = IDBKeyRange.only(key);
  const existingEntries = await index.getAll(range);

  const existingMap = new Map(
    existingEntries.map((e) => [e.message.id, e.message]),
  );

  const toUpdate: any[] = [];
  for (const m of messages) {
    const existing = existingMap.get(m.id);
    if (!existing || !lodash.isEqual(existing, m)) {
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

export async function clearAllMessagesFromIDB() {
  const db = await getDB();
  await db.clear(STORE_MESSAGES);
}

export async function removeMessagesFromIDB(key: string) {
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

export async function removeContactFromDB(id: string) {
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
