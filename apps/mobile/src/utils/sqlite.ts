import * as SQLite from "expo-sqlite";
import { isEqual } from "lodash";
import { getRowKey } from "./inboxRowKey";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("chat_contacts_db");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS contacts_global (
          id TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS contacts_by_filter (
          filter_key TEXT PRIMARY KEY NOT NULL,
          contact_ids TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY NOT NULL,
          key TEXT NOT NULL,
          data TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS index_messages_key ON messages (key);
      `);
      return db;
    })();
  }
  return dbPromise;
}

/**
 * `contacts_global` holds inbox rows, one per ticket, under the row's key
 * (`getRowKey`: its conversation id, else the contact id). A cache written before
 * rows were keyed by ticket has them under the contact id; `key` lets a caller
 * that holds such a row rewrite it in place.
 */
export async function saveContactToDB(contact: any, key: string = getRowKey(contact)) {
  if (!contact) return;
  const db = await getDB();
  await db.runAsync(
    "INSERT OR REPLACE INTO contacts_global (id, data) VALUES (?, ?)",
    key,
    JSON.stringify(contact),
  );
}

export async function saveContactsToDB(contacts: any[]) {
  if (!contacts.length) return;
  const db = await getDB();
  for (const c of contacts) {
    await db.runAsync(
      "INSERT OR REPLACE INTO contacts_global (id, data) VALUES (?, ?)",
      getRowKey(c),
      JSON.stringify(c),
    );
  }
}

/** One cached row for a contact: the row stored under `id`, else its most recently updated ticket. */
export async function loadContactFromDB(id: string): Promise<any | undefined> {
  const db = await getDB();
  const result = await db.getFirstAsync<{ data: string }>(
    `SELECT data FROM contacts_global
       WHERE id = ? OR json_extract(data, '$.id') = ?
       ORDER BY (id = ?) DESC, json_extract(data, '$.updatedAt') DESC
       LIMIT 1`,
    id,
    id,
    id,
  );
  if (result) {
    return JSON.parse(result.data);
  }
  return undefined;
}

export async function loadContactsFromDB(ids: string[]): Promise<any[]> {
  if (!ids.length) return [];
  const db = await getDB();

  // Create placeholders for IN clause
  const placeholders = ids.map(() => "?").join(",");
  const results = await db.getAllAsync<{ data: string }>(
    `SELECT data FROM contacts_global WHERE id IN (${placeholders})`,
    ...ids,
  );

  return results.map((row) => JSON.parse(row.data));
}

/** Cached rows by the key each is stored under, which is the key the cached filter lists name. */
export async function loadRowsFromDB(keys: string[]): Promise<Map<string, any>> {
  const rows = new Map<string, any>();
  if (!keys.length) return rows;
  const db = await getDB();
  const placeholders = keys.map(() => "?").join(",");
  const results = await db.getAllAsync<{ id: string; data: string }>(
    `SELECT id, data FROM contacts_global WHERE id IN (${placeholders})`,
    ...keys,
  );
  for (const row of results) rows.set(row.id, JSON.parse(row.data));
  return rows;
}

export async function clearAllContactsFromDB() {
  const db = await getDB();
  await db.execAsync(`
    DELETE FROM contacts_global;
    DELETE FROM contacts_by_filter;
    DELETE FROM messages;
  `);
}

export async function saveContactIdsForFilter(filterKey: string, contactIds: string[]) {
  const db = await getDB();
  await db.runAsync(
    "INSERT OR REPLACE INTO contacts_by_filter (filter_key, contact_ids) VALUES (?, ?)",
    filterKey,
    JSON.stringify(contactIds),
  );
}

export async function loadContactIdsForFilter(filterKey: string): Promise<string[]> {
  const db = await getDB();
  const result = await db.getFirstAsync<{ contact_ids: string }>(
    "SELECT contact_ids FROM contacts_by_filter WHERE filter_key = ?",
    filterKey,
  );
  if (result) {
    return JSON.parse(result.contact_ids);
  }
  return [];
}

export async function saveMessagesToIDB(key: string, messages: any[]) {
  if (!messages.length) return;
  const db = await getDB();

  const existingEntries = await db.getAllAsync<{ id: string; data: string }>(
    "SELECT id, data FROM messages WHERE key = ?",
    key,
  );
  const existingMap = new Map(existingEntries.map((e) => [e.id, JSON.parse(e.data)]));

  const toUpdate: any[] = [];
  for (const m of messages) {
    const existing = existingMap.get(`${key}_${m.id}`);
    if (!existing || !isEqual(existing, m)) {
      toUpdate.push({ id: `${key}_${m.id}`, key, message: m });
    }
  }

  if (toUpdate.length) {
    for (const item of toUpdate) {
      await db.runAsync(
        "INSERT OR REPLACE INTO messages (id, key, data) VALUES (?, ?, ?)",
        item.id,
        item.key,
        JSON.stringify(item.message),
      );
    }
  }
}

export async function getMessagesFromIDB(key: string) {
  const db = await getDB();
  const res = await db.getAllAsync<{ data: string }>(
    "SELECT data FROM messages WHERE key = ?",
    key,
  );
  const messages = res.map((row) => JSON.parse(row.data));
  return messages;
}

export async function deleteMessageFromIDB(key: string, messageId: string) {
  const db = await getDB();
  await db.runAsync("DELETE FROM messages WHERE id = ?", `${key}_${messageId}`);
}

export async function _removeMessagesFromIDB(key: string) {
  const db = await getDB();
  await db.runAsync("DELETE FROM messages WHERE key = ?", key);
}

export async function _removeContactFromDB(id: string) {
  const db = await getDB();
  await db.runAsync("DELETE FROM contacts_global WHERE id = ?", id);
}

/** Removes every cached row of these contacts: one per ticket, plus any stored under the contact id. */
export async function removeContactsFromDB(contactIds: string[]) {
  if (!contactIds.length) return;
  const db = await getDB();
  const placeholders = contactIds.map(() => "?").join(",");
  await db.runAsync(
    `DELETE FROM contacts_global
       WHERE id IN (${placeholders}) OR json_extract(data, '$.id') IN (${placeholders})`,
    ...contactIds,
    ...contactIds,
  );
}
