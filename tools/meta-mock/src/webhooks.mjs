import { fixtures } from "./fixtures.mjs";

/**
 * The inbound half of WhatsApp.
 *
 * Graph is only what you call. When a customer messages the business number,
 * Meta POSTs a notification to your webhook — and nothing in a test can make a
 * real phone send one. So this sends it instead, replaying the payloads Meta
 * publishes in the "Webhook Payload Reference" folder of its Cloud API
 * collection.
 */

/** Keys naming the customer on the other end, across message and status payloads. */
const CUSTOMER_KEYS = new Set(["wa_id", "from", "recipient_id"]);

/** Every notification payload available to replay. */
export function listWebhooks() {
  return fixtures.webhooks.map((entry) => ({
    name: entry.qualifiedName ?? entry.name,
    api: entry.api,
    folder: entry.folder,
  }));
}

/**
 * Look a payload up by name.
 *
 * Accepts either the bare name or an `api:name` form, which is how the
 * generator disambiguates a name both collections happen to use.
 */
function findWebhook(name) {
  const wanted = String(name).toLowerCase();
  return (
    fixtures.webhooks.find(
      (candidate) => (candidate.qualifiedName ?? candidate.name).toLowerCase() === wanted,
    ) ?? fixtures.webhooks.find((candidate) => candidate.name.toLowerCase() === wanted)
  );
}

/**
 * Point a sample notification at the account under test.
 *
 * Meta's payloads carry sample identifiers written inconsistently —
 * `phone_number_id` appears as `PHONE_NUMBER_ID`, `<PHONE_NUMBER_ID>`,
 * `phone-number-id` and as three different literal numbers across the thirteen
 * payloads. Matching those as strings is a losing game, so this rewrites **by
 * key**: wherever a payload says `phone_number_id`, it gets the phone number id
 * of the account under test, whatever the sample happened to say.
 *
 * The receiving app resolves the tenant from exactly these fields, so getting
 * them right is the difference between a notification it processes and one it
 * drops on the floor.
 */
export function retarget(
  payload,
  { wabaId, phoneNumberId, displayPhoneNumber, from, text, profileName } = {},
) {
  const walk = (value, key, parentKey) => {
    if (Array.isArray(value)) return value.map((item) => walk(item, key, parentKey));

    if (value && typeof value === "object") {
      const out = {};
      for (const [childKey, childValue] of Object.entries(value)) {
        out[childKey] = walk(childValue, childKey, key);
      }
      return out;
    }

    if (typeof value !== "string") return value;

    // `entry[].id` is the business account — the WABA on WhatsApp, the
    // Instagram user id on Instagram. An `id` anywhere else is a message or
    // media id and must be left alone.
    if (key === "id" && parentKey === "entry" && wabaId) return String(wabaId);
    if (key === "phone_number_id" && phoneNumberId) return String(phoneNumberId);
    if (key === "display_phone_number" && displayPhoneNumber) return String(displayPhoneNumber);
    if (CUSTOMER_KEYS.has(key) && from) return String(from);

    // Instagram names the two ends as nested objects rather than flat fields:
    // `messaging[].sender.id` is the customer, `messaging[].recipient.id` is
    // the business. Both are just `id`, so the parent is what tells them apart.
    if (key === "id" && parentKey === "sender" && from) return String(from);
    if (key === "id" && parentKey === "recipient" && wabaId) return String(wabaId);

    // The sample payloads carry fixed copy ("Hello this is an answer"), which is
    // no use when a test wants to assert on the message it just sent.
    if (key === "body" && parentKey === "text" && text !== undefined) return String(text);
    if (key === "name" && parentKey === "profile" && profileName !== undefined) {
      return String(profileName);
    }

    return value;
  };

  const cloned = { ...payload };
  if (Array.isArray(cloned.entry)) {
    cloned.entry = cloned.entry.map((item) => walk(item, "entry", "root"));
  }
  return cloned;
}

/**
 * Rewrite placeholder strings anywhere in a payload.
 *
 * A free-form escape hatch for the fields `retarget` does not know about.
 * Substitution is on whole string values and on `{{name}}`/`<name>` holes
 * inside them, which is how the collection writes its placeholders.
 */
export function substitute(value, vars) {
  if (Array.isArray(value)) return value.map((item) => substitute(item, vars));

  if (value && typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) out[key] = substitute(nested, vars);
    return out;
  }

  if (typeof value !== "string") return value;

  let result = value;
  for (const [key, replacement] of Object.entries(vars)) {
    if (replacement === undefined || replacement === null) continue;
    const text = String(replacement);
    if (result === key || result === `<${key}>` || result === `{{${key}}}`) return text;
    result = result.split(`{{${key}}}`).join(text).split(`<${key}>`).join(text);
  }
  return result;
}

/** Build a notification without sending it — useful for asserting on the shape. */
export function buildWebhook({ name, vars = {}, ...target }) {
  const entry = findWebhook(name);
  if (!entry) return null;
  return substitute(retarget(structuredClone(entry.payload), target), vars);
}

/**
 * Replay a notification at the app under test.
 *
 * > Only do this against an app configured to talk to this mock. Processing an
 * > inbound message can trigger an automated reply, which is an outbound
 * > WhatsApp send — pointed at the real Graph host, that reaches a real phone.
 */
export async function replayWebhook({ name, vars = {}, target, ...ids }) {
  const payload = buildWebhook({ name, vars, ...ids });
  if (!payload) {
    return {
      ok: false,
      error: `no webhook payload named "${name}"`,
      available: listWebhooks().map((candidate) => candidate.name),
    };
  }

  try {
    const response = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await response.text().catch(() => "");
    return {
      ok: response.ok,
      status: response.status,
      target,
      body: text.slice(0, 500),
      payload,
    };
  } catch (error) {
    return { ok: false, error: `could not reach ${target}: ${error.message}`, payload };
  }
}
