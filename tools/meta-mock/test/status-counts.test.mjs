import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { startMetaMock } from "../index.mjs";
import { runStatusProgression } from "../src/status-progression.mjs";

/**
 * How many statuses a campaign is owed.
 *
 * A send is one request and up to three callbacks, so a bug in the progression
 * does not show up as an error — it shows up as a campaign that is missing a
 * few hundred `delivered`s and nobody can say whether the app dropped them or
 * the mock never sent them. These pin the arithmetic:
 *
 *   sent                = participants   (every send is acknowledged)
 *   delivered + failed  = participants   (a send goes one way or the other)
 *   read      + failed  = participants   (delivered is always followed by read)
 *
 * The failure branch is the one worth guarding: it has to come *after* `sent`
 * and *instead of* delivered/read, never alongside them.
 */

/** Count statuses out of the payloads a webhook target receives. */
function tally(payloads) {
  const counts = { sent: 0, delivered: 0, read: 0, failed: 0 };
  const byMessage = new Map();

  for (const payload of payloads) {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const status of change.value?.statuses ?? []) {
          counts[status.status] = (counts[status.status] ?? 0) + 1;
          if (!byMessage.has(status.id)) byMessage.set(status.id, []);
          byMessage.get(status.id).push(status.status);
        }
      }
    }
  }

  return { counts, byMessage };
}

test("a run at a fixed failure rate sends exactly the statuses it owes", async () => {
  const PARTICIPANTS = 8485;
  const FAILURE_RATE = 0.2;
  const EXPECTED_FAILED = PARTICIPANTS * FAILURE_RATE; // 1697

  // The progression posts each status with `fetch`; standing in for it keeps
  // 25k callbacks out of the loopback and lets the run be counted directly.
  const realFetch = globalThis.fetch;
  const payloads = [];
  globalThis.fetch = async (_url, init) => {
    payloads.push(JSON.parse(init.body));
    return { ok: true, status: 200 };
  };

  try {
    const runs = [];
    for (let index = 0; index < PARTICIPANTS; index++) {
      // Two draws per run: the conversation id, then the failure decision.
      // Failing every fifth send is exactly the 20% the rate promises — a real
      // Math.random would land near it and never on it, and a test that can
      // only assert "about 1697" cannot tell a miscount from the dice.
      const draws = [0.5, index % 5 === 0 ? FAILURE_RATE / 2 : 0.99];
      let draw = 0;

      runs.push(
        runStatusProgression({
          messageId: `wamid.Test${index}`,
          recipientId: `9190000${String(index).padStart(5, "0")}`,
          target: "http://webhook.invalid/hook",
          identity: { wabaId: "111", phoneNumberId: "222", displayPhoneNumber: "15550001111" },
          delays: { sent: 0, delivered: 0, read: 0 },
          failureRate: FAILURE_RATE,
          random: () => draws[draw++],
        }),
      );
    }

    await Promise.all(runs);
  } finally {
    globalThis.fetch = realFetch;
  }

  const { counts, byMessage } = tally(payloads);

  assert.deepEqual(counts, {
    sent: PARTICIPANTS,
    delivered: PARTICIPANTS - EXPECTED_FAILED,
    read: PARTICIPANTS - EXPECTED_FAILED,
    failed: EXPECTED_FAILED,
  });

  assert.equal(counts.sent, PARTICIPANTS, "every participant is sent to");
  assert.equal(counts.delivered + counts.failed, PARTICIPANTS);
  assert.equal(counts.read + counts.failed, PARTICIPANTS);

  assert.equal(byMessage.size, PARTICIPANTS, "one message id per participant");
  for (const [id, statuses] of byMessage) {
    const expected = statuses.includes("failed")
      ? ["sent", "failed"]
      : ["sent", "delivered", "read"];
    assert.deepEqual(statuses, expected, `wrong status sequence for ${id}`);
  }
});

test("the mock's own sends add up over a campaign", async () => {
  const PARTICIPANTS = 8485;
  const FAILURE_RATE = 0.2;

  const payloads = [];
  const sink = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      payloads.push(JSON.parse(raw));
      res.writeHead(200).end("{}");
    });
  });
  await new Promise((resolve) => sink.listen(0, "127.0.0.1", resolve));

  const mock = await startMetaMock({
    port: 0,
    statusProgression: true,
    failureRate: FAILURE_RATE,
    webhookUrl: `http://127.0.0.1:${sink.address().port}/webhook`,
    statusDelays: { sent: 0, delivered: 0, read: 0 },
    wabaId: "111",
    phoneNumberId: "222",
    displayPhoneNumber: "15550001111",
  });

  try {
    const messageIds = new Set();

    // In batches. Firing thousands of sends at once is more sockets than the
    // listen backlog holds, and the ones not accepted in time fail with a
    // connect timeout — the test's own load flaking, not the mock.
    const BATCH = 25;
    for (let start = 0; start < PARTICIPANTS; start += BATCH) {
      const batch = [];
      for (let index = start; index < Math.min(start + BATCH, PARTICIPANTS); index++) {
        batch.push(
          fetch(`${mock.url}/v25.0/222/messages`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: `9190000${String(index).padStart(5, "0")}`,
            }),
          }).then((response) => response.json()),
        );
      }
      for (const accepted of await Promise.all(batch)) messageIds.add(accepted.messages[0].id);
    }

    assert.equal(messageIds.size, PARTICIPANTS, "one message id per participant");
  } finally {
    // `close` waits on the progressions in flight, so every status a campaign
    // was owed has been delivered by the time this returns.
    await mock.close();
    await new Promise((resolve) => sink.close(resolve));
  }

  const { counts, byMessage } = tally(payloads);

  assert.equal(counts.sent, PARTICIPANTS, "participants === sent");
  assert.equal(counts.delivered + counts.failed, PARTICIPANTS, "delivered + failed === sent");
  assert.equal(counts.read + counts.failed, PARTICIPANTS, "read + failed === sent");
  assert.equal(counts.delivered, counts.read, "a delivered message is always read");
  assert.equal(byMessage.size, PARTICIPANTS);

  // Real dice here, so the rate is a band, not a number: five standard
  // deviations wide, which a correct mock clears and a mock that ignores the
  // rate (0 failures, or all of them) does not.
  const spread = 5 * Math.sqrt(PARTICIPANTS * FAILURE_RATE * (1 - FAILURE_RATE));
  const observed = counts.failed;
  assert.ok(
    Math.abs(observed - PARTICIPANTS * FAILURE_RATE) <= spread,
    `failed=${observed} is not within ${spread.toFixed(1)} of ${PARTICIPANTS * FAILURE_RATE}`,
  );
});
