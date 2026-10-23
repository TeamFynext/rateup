/**
 * `WaMessage.messageId` is unique (a partial index, `WaMessage_messageId_key`),
 * so writing a platform message that is already stored fails with Prisma's
 * P2002 instead of producing a second row. Meta redelivers webhooks, and with
 * several replicas two deliveries of one message can both get past any
 * "already stored?" read — the index is what decides, and this is how a writer
 * recognises its answer.
 */

/** Prisma's code for a unique-constraint violation, partial indexes included. */
const UNIQUE_VIOLATION = "P2002";

export const WA_MESSAGE_ID_INDEX = "WaMessage_messageId_key";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * The violated constraint, as far as the error says: an index name, a field
 * list, or undefined when it names neither.
 *
 * Through the pg driver adapter (Prisma 7) it sits on
 * `meta.driverAdapterError.cause.constraint` as `{ index }` or `{ fields }`;
 * the classic engine put it on `meta.target`.
 */
function conflictTarget(error: Record<string, unknown>): string | unknown[] | undefined {
  const meta = isRecord(error.meta) ? error.meta : undefined;
  if (!meta) return undefined;

  const target = meta.target;
  if (typeof target === "string" || Array.isArray(target)) return target;

  const adapterError = isRecord(meta.driverAdapterError) ? meta.driverAdapterError : undefined;
  const cause = adapterError && isRecord(adapterError.cause) ? adapterError.cause : undefined;
  const constraint = cause && isRecord(cause.constraint) ? cause.constraint : undefined;
  if (typeof constraint?.index === "string") return constraint.index;
  if (Array.isArray(constraint?.fields)) return constraint.fields;
  return undefined;
}

/**
 * True when `error` is a write refused because a `WaMessage` with the same
 * `messageId` already exists.
 *
 * A P2002 that names some other constraint is not this. One that names none is
 * taken to be: every other unique key a `WaMessage` insert touches is a freshly
 * generated uuid.
 */
export function isWaMessageIdConflict(error: unknown): boolean {
  if (!isRecord(error) || error.code !== UNIQUE_VIOLATION) return false;
  const target = conflictTarget(error);
  if (target === undefined) return true;
  if (typeof target === "string") return target === WA_MESSAGE_ID_INDEX;
  return target.length === 1 && target[0] === "messageId";
}
