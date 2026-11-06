import type { IdentityFieldValue } from "./contact-form-schema.ts";

/** A phone or email the contact is known by, as the identity overview returns it. */
export interface SavedIdentity {
  id: string;
  value: string;
  isPrimary?: boolean;
}

export interface IdentityChangePlan {
  /** New values to add, in form order. */
  add: string[];
  /** Saved identities whose value was edited. */
  update: { id: string; value: string }[];
  /** Saved identities taken off the list. */
  remove: string[];
  /** The row that should end up the main one: a saved id, or a value being added. */
  main: { id: string } | { value: string } | null;
}

/** What the API stores: phone digits without the "+", email lower-cased. */
export function normalizeIdentity(kind: "PHONE" | "EMAIL", value: string): string {
  const trimmed = value.trim();
  return kind === "PHONE" ? trimmed.replace(/\D/g, "") : trimmed.toLowerCase();
}

/**
 * Turns the edited phone or email list (main first) into the identity calls that make the
 * contact match it. Empty rows are ignored; a row the user did not touch costs nothing.
 */
export function planIdentityChanges(
  kind: "PHONE" | "EMAIL",
  saved: SavedIdentity[],
  rows: IdentityFieldValue[],
): IdentityChangePlan {
  const filled = rows
    .map((row) => ({ id: row.id, value: normalizeIdentity(kind, row.value) }))
    .filter((row) => row.value);
  const savedById = new Map(saved.map((identity) => [identity.id, identity]));
  const kept = new Set(filled.flatMap((row) => (row.id ? [row.id] : [])));

  const add = filled.filter((row) => !row.id || !savedById.has(row.id)).map((row) => row.value);
  const update = filled.flatMap((row) => {
    const before = row.id ? savedById.get(row.id) : undefined;
    return before && before.value !== row.value ? [{ id: before.id, value: row.value }] : [];
  });
  const remove = saved.filter((identity) => !kept.has(identity.id)).map((identity) => identity.id);

  const first = filled[0];
  let main: IdentityChangePlan["main"] = null;
  if (first) {
    const before = first.id ? savedById.get(first.id) : undefined;
    if (!before) main = { value: first.value };
    else if (!before.isPrimary) main = { id: before.id };
  }
  return { add, update, remove, main };
}
