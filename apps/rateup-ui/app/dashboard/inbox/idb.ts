import { openDB } from "idb";

import {
  ContactsWithLastMessage,
  WaGetMessagesBody,
} from "@/backend/whatsapp/inbox/message/wamessage.api";

import { ContactWithUpdatedAt } from "./store";

const DB_NAME = "chat_contacts_db";
const STORE_GLOBAL = "contacts_global";
const STORE_FILTERS = "contacts_by_filter";
const STORE_MESSAGES = "messages";

export async function getDB() {
  return openDB(DB_NAME, 3, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_GLOBAL)) {
        db.createObjectStore(STORE_GLOBAL); // key = contact.id
      }
      if (!db.objectStoreNames.contains(STORE_FILTERS)) {
        db.createObjectStore(STORE_FILTERS); // key = filterKey, value = contactIds[]
      }
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        db.createObjectStore(STORE_MESSAGES, { keyPath: "id" });
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
}

/* ---------- Filter Contact IDs ---------- */
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

/*-------------Messages by contact and account------------------*/
export async function saveMessagesToIDB(key: string, messages: any[]) {
  const db = await getDB();
  const tx = db.transaction(STORE_MESSAGES, "readwrite");
  const store = tx.objectStore(STORE_MESSAGES);
  for (const m of messages)
    store.put({ id: `${key}_${m.id}`, key, message: m });
  await tx.done;
}

export async function getMessagesFromIDB(key: string) {
  const db = await getDB();
  const tx = db.transaction(STORE_MESSAGES, "readonly");
  const store = tx.objectStore(STORE_MESSAGES);
  const res: any[] = [];
  let cursor = await store.openCursor();
  while (cursor) {
    if (cursor.value.key === key) res.push(cursor.value.message);
    cursor = await cursor.continue(); // move to next
  }

  return res;
}

export async function clearAllMessagesFromIDB() {
  const db = await getDB();
  await db.clear(STORE_MESSAGES);
}
