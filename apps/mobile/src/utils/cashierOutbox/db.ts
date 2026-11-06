import * as SQLite from "expo-sqlite";

import type {
  OutboxContext,
  OutboxItem,
  OutboxKind,
  OutboxStatus,
} from "@/components/loyalty/cashier/logic/outbox";

/**
 * The counter's outbox, and the cached customer lookups it is read alongside.
 *
 * **This is a database of its own, not a table in `chat_contacts_db`.** Two reasons, both
 * load-bearing: `clearAllContactsFromDB()` is a blunt three-table `DELETE` that sign-out
 * calls (`utils/clearLocalData.ts`), and the chat schema has no migration mechanism to hang
 * a new table off safely. A queued purchase must not be collateral damage of clearing a
 * chat cache.
 *
 * `PRAGMA user_version` carries the schema version, since the repo has no migration
 * framework of its own.
 */

const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getOutboxDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("cashier_outbox.db");
      const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
      if ((row?.user_version ?? 0) < SCHEMA_VERSION) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS outbox (
            id              TEXT PRIMARY KEY NOT NULL,
            org_id          TEXT NOT NULL,
            kind            TEXT NOT NULL,
            status          TEXT NOT NULL,
            payload         TEXT NOT NULL,
            context         TEXT NOT NULL,
            attempts        INTEGER NOT NULL DEFAULT 0,
            next_attempt_at INTEGER,
            created_at      INTEGER NOT NULL,
            settled_at      INTEGER,
            last_error      TEXT,
            result          TEXT
          );
          CREATE INDEX IF NOT EXISTS outbox_drain ON outbox (status, created_at);
          CREATE TABLE IF NOT EXISTS customer_cache (
            phone      TEXT PRIMARY KEY NOT NULL,
            org_id     TEXT NOT NULL,
            data       TEXT NOT NULL,
            fetched_at INTEGER NOT NULL
          );
          PRAGMA user_version = ${SCHEMA_VERSION};
        `);
      }
      return db;
    })();
  }
  return dbPromise;
}

/* ── the outbox ─────────────────────────────────────────────────────────────── */

interface OutboxRow {
  id: string;
  org_id: string;
  kind: string;
  status: string;
  payload: string;
  context: string;
  attempts: number;
  next_attempt_at: number | null;
  created_at: number;
  last_error: string | null;
}

function toItem(row: OutboxRow): OutboxItem {
  return {
    id: row.id,
    orgId: row.org_id,
    kind: row.kind as OutboxKind,
    status: row.status as OutboxStatus,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    context: JSON.parse(row.context) as OutboxContext,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    createdAt: row.created_at,
    lastError: row.last_error,
  };
}

export async function enqueue(item: OutboxItem): Promise<void> {
  const db = await getOutboxDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO outbox
       (id, org_id, kind, status, payload, context, attempts, next_attempt_at, created_at, last_error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.id,
    item.orgId,
    item.kind,
    item.status,
    JSON.stringify(item.payload),
    JSON.stringify(item.context),
    item.attempts,
    item.nextAttemptAt,
    item.createdAt,
    item.lastError,
  );
}

/**
 * The queue for one org, oldest first.
 *
 * Ordering is global FIFO and the drain is single-flight. Awards are commutative so the
 * arithmetic does not need it — but single-flight means there is never more than one
 * request with an unknown outcome, which is the entire basis of the probe discipline.
 */
export async function listOutbox(orgId: string): Promise<OutboxItem[]> {
  const db = await getOutboxDB();
  const rows = await db.getAllAsync<OutboxRow>(
    `SELECT * FROM outbox
      WHERE org_id = ? AND status != 'done'
      ORDER BY created_at ASC, rowid ASC`,
    orgId,
  );
  return rows.map(toItem);
}

export async function updateOutbox(
  id: string,
  patch: {
    status?: OutboxStatus;
    attempts?: number;
    nextAttemptAt?: number | null;
    lastError?: string | null;
    result?: unknown;
    settledAt?: number | null;
  },
): Promise<void> {
  const db = await getOutboxDB();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  if (patch.status !== undefined) {
    sets.push("status = ?");
    args.push(patch.status);
  }
  if (patch.attempts !== undefined) {
    sets.push("attempts = ?");
    args.push(patch.attempts);
  }
  if (patch.nextAttemptAt !== undefined) {
    sets.push("next_attempt_at = ?");
    args.push(patch.nextAttemptAt);
  }
  if (patch.lastError !== undefined) {
    sets.push("last_error = ?");
    args.push(patch.lastError);
  }
  if (patch.result !== undefined) {
    sets.push("result = ?");
    args.push(JSON.stringify(patch.result));
  }
  if (patch.settledAt !== undefined) {
    sets.push("settled_at = ?");
    args.push(patch.settledAt);
  }
  if (sets.length === 0) return;
  args.push(id);
  await db.runAsync(`UPDATE outbox SET ${sets.join(", ")} WHERE id = ?`, ...args);
}

/**
 * Removes a row outright — an Undo of a purchase that has not been sent.
 *
 * For a queued award this is a *true* undo, and a better one than the web's: the web has no
 * endpoint that reverses a purchase, so its Undo files an adjustment for approval. Here
 * there is nothing to reverse yet.
 */
export async function discardOutbox(id: string): Promise<void> {
  const db = await getOutboxDB();
  await db.runAsync("DELETE FROM outbox WHERE id = ?", id);
}

/** Settled rows, swept so the table does not grow without bound. Keeps a shift's history. */
export async function pruneOutbox(olderThanMs = 12 * 60 * 60 * 1000): Promise<void> {
  const db = await getOutboxDB();
  await db.runAsync(
    "DELETE FROM outbox WHERE status = 'done' AND settled_at IS NOT NULL AND settled_at < ?",
    Date.now() - olderThanMs,
  );
}

/* ── cached lookups ─────────────────────────────────────────────────────────── */

/**
 * The last server answer for a phone number, so the customer view paints before the network
 * does — the same thing `chat/[id].tsx` already does for a conversation.
 *
 * Typed, unlike `utils/sqlite.ts`, which is `any` throughout: this repo is `strict: true`
 * with oxlint's correctness rules at error, and a cached balance is a number staff read out.
 */
export async function cacheCustomer(orgId: string, phone: string, data: unknown): Promise<void> {
  const db = await getOutboxDB();
  await db.runAsync(
    "INSERT OR REPLACE INTO customer_cache (phone, org_id, data, fetched_at) VALUES (?, ?, ?, ?)",
    phone,
    orgId,
    JSON.stringify(data),
    Date.now(),
  );
}

export async function readCachedCustomer<T>(
  orgId: string,
  phone: string,
): Promise<{ data: T; fetchedAt: number } | null> {
  const db = await getOutboxDB();
  const row = await db.getFirstAsync<{ data: string; fetched_at: number }>(
    "SELECT data, fetched_at FROM customer_cache WHERE phone = ? AND org_id = ?",
    phone,
    orgId,
  );
  if (!row) return null;
  try {
    return { data: JSON.parse(row.data) as T, fetchedAt: row.fetched_at };
  } catch {
    return null;
  }
}

/**
 * Clears the cached lookups for an org, leaving the outbox alone.
 *
 * This is what sign-out should call. The queue is deliberately not touched: a pending
 * purchase is a customer who paid, and discarding it silently — which is what
 * `clearLocalUserData()` does to every other cache — would lose it.
 */
export async function clearCustomerCache(orgId: string): Promise<void> {
  const db = await getOutboxDB();
  await db.runAsync("DELETE FROM customer_cache WHERE org_id = ?", orgId);
}
