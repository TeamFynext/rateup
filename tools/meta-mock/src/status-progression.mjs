/**
 * The statuses that follow a send.
 *
 * A real send is not one event. Meta acknowledges the request, then delivers
 * `sent`, `delivered` and `read` as separate webhook notifications minutes
 * apart — and an app that only handles the acknowledgement looks fine until it
 * meets a real conversation. message-dispatcher's whole job is on the far side
 * of those callbacks, so a mock that answers the POST and goes quiet leaves
 * that code unexercised.
 *
 * Carried over from the `whatsapp-mock-api` server this replaces, with two
 * changes:
 *
 *   - **It is opt-in.** Firing webhooks at an external URL as a side effect of
 *     a request is a surprise; suites that only assert on the outbound payload
 *     do not want it.
 *   - **It is deterministic by default.** The original failed 20% of sends at
 *     random, which is realistic and untestable — a test could not say whether
 *     a missing `read` was the app's bug or the mock's dice. Failures are now a
 *     rate you set, defaulting to none.
 */

const DEFAULT_DELAYS = { sent: 0, delivered: 300, read: 600 };

/** Meta's undeliverable error, as it appears on a failed status. */
const UNDELIVERABLE = {
  code: 131026,
  title: "Message undeliverable",
  message: "Message undeliverable",
  error_data: { details: "Message Undeliverable." },
};

export function statusPayload({
  messageId,
  recipientId,
  status,
  wabaId,
  phoneNumberId,
  displayPhoneNumber,
  conversationId,
  timestamp,
  errors,
}) {
  const statusEntry = {
    id: messageId,
    status,
    timestamp: String(timestamp ?? Math.floor(Date.now() / 1000)),
    recipient_id: recipientId,
    conversation: {
      id: conversationId,
      origin: { type: "marketing" },
    },
    pricing: { billable: true, pricing_model: "CBP", category: "marketing" },
  };
  if (errors) statusEntry.errors = errors;

  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wabaId,
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: displayPhoneNumber,
                phone_number_id: phoneNumberId,
              },
              statuses: [statusEntry],
            },
            field: "messages",
          },
        ],
      },
    ],
  };
}

/**
 * Walk a message through its statuses, delivering each to the webhook.
 *
 * Runs detached — the send has already been answered by the time the first
 * status goes out, which is the ordering a real integration sees. Errors are
 * swallowed and logged: a webhook endpoint that is down should not take the
 * mock with it.
 */
export function runStatusProgression({
  messageId,
  recipientId,
  target,
  identity,
  delays = {},
  failureRate = 0,
  random = Math.random,
  log = () => {},
}) {
  const schedule = { ...DEFAULT_DELAYS, ...delays };
  const conversationId = `${Date.now()}${Math.floor((random() * 1e6) % 1e6)}`;

  const deliver = async (status, errors) => {
    const payload = statusPayload({
      messageId,
      recipientId,
      status,
      conversationId,
      errors,
      ...identity,
    });

    try {
      const response = await fetch(target, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      log(`status ${status} -> ${target} (${response.status})`);
    } catch (error) {
      log(`status ${status} could not reach ${target}: ${error.message}`);
    }
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  return (async () => {
    await wait(schedule.sent);
    await deliver("sent");

    if (failureRate > 0 && random() < failureRate) {
      await wait(schedule.delivered);
      await deliver("failed", [UNDELIVERABLE]);
      return "failed";
    }

    await wait(schedule.delivered);
    await deliver("delivered");

    await wait(schedule.read);
    await deliver("read");
    return "read";
  })();
}
