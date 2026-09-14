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

/**
 * How long each status waits behind the one before it.
 *
 * `sent` is not zero on purpose. The send has been answered by the time the
 * progression starts, but the caller is still writing the row that records the
 * message id — and a status for a message id the app has never stored is a
 * status it can only drop. Real Graph takes at least the network back and forth
 * to say `sent`; firing it in the same tick as the response is a race no real
 * integration has to win, and it makes the mock's own statuses the ones most
 * likely to go missing.
 */
const DEFAULT_DELAYS = { sent: 750, delivered: 1500, read: 2500 };

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
 *
 * `jitter` (ms) adds a random `0..jitter` to every status's wait, and each
 * status runs on its own timer rather than behind the one before it. With no
 * jitter every message progresses in lockstep — the `sent` for contact A, then
 * for B, then for C, then the `delivered`s — which is not what Meta does: real
 * receipts interleave across contacts and, because each is its own webhook
 * handled concurrently, the same message's `sent` can reach the app after its
 * `read`. Set the jitter wider than the gaps between statuses to get that.
 */
export function runStatusProgression({
  messageId,
  recipientId,
  target,
  identity,
  delays = {},
  jitter = 0,
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

  const plan = planStatuses({ schedule, jitter, failureRate, random });
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  return (async () => {
    await Promise.all(
      plan.map(async ({ status, at, errors }) => {
        await wait(at);
        await deliver(status, errors);
      }),
    );
    return plan.some((step) => step.status === "failed") ? "failed" : "read";
  })();
}

/**
 * The statuses a send owes and when each fires, as offsets from now.
 *
 * Pure, so the interleaving can be tested without timers: the base offsets are
 * cumulative (`sent`, then `delivered` after it, then `read` after that) and
 * each gets its own `0..jitter` on top.
 */
export function planStatuses({ schedule, jitter = 0, failureRate = 0, random = Math.random }) {
  const spread = () => (jitter > 0 ? Math.floor(random() * jitter) : 0);
  const sentAt = schedule.sent;
  const secondAt = sentAt + schedule.delivered;

  const plan = [{ status: "sent", at: sentAt + spread() }];
  if (failureRate > 0 && random() < failureRate) {
    plan.push({ status: "failed", at: secondAt + spread(), errors: [UNDELIVERABLE] });
    return plan;
  }
  plan.push({ status: "delivered", at: secondAt + spread() });
  plan.push({ status: "read", at: secondAt + schedule.read + spread() });
  return plan;
}
