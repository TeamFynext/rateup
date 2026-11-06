/**
 * Meta's prefix, short for "WhatsApp Message ID". Only ids that came from — or stand in for —
 * a WhatsApp message may wear it.
 */
const WHATSAPP_ID_PREFIX = "wamid";

/**
 * The embedded support widget's equivalent, "web chat message id". Deliberately not `wamid`:
 * these messages never touch WhatsApp, and an id claiming otherwise is a lie told to every
 * log line, database row and webhook payload that carries it.
 */
export const WEBCHAT_ID_PREFIX = "wcmid";

/**
 * `<prefix>.<base36 timestamp>-<32 hex>`, the shape Meta's own ids take.
 *
 * Channels that go through the Graph API get their id back from Meta. Internal notes and
 * webchat have no such call to make, so they mint one here — and it has to be unique per
 * message, because the inbox identifies a message by it.
 */
function generateMessageId(prefix: string) {
  return (
    prefix +
    "." +
    Date.now().toString(36) +
    "-" +
    crypto
      .getRandomValues(new Uint8Array(16))
      .reduce((a, b) => a + b.toString(16).padStart(2, "0"), "")
  );
}

/** For a message standing in for a WhatsApp one — an internal note on a WhatsApp thread. */
export function generateLocalMessageId() {
  return generateMessageId(WHATSAPP_ID_PREFIX);
}

/** For a message from the embedded support widget. */
export function generateWebchatMessageId() {
  return generateMessageId(WEBCHAT_ID_PREFIX);
}

/** Whether an id was minted for the support widget rather than received from WhatsApp. */
export function isWebchatMessageId(messageId: string | null | undefined) {
  return !!messageId?.startsWith(`${WEBCHAT_ID_PREFIX}.`);
}
