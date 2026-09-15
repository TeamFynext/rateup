import assert from "node:assert/strict";
import test from "node:test";

import { startMetaMock } from "../index.mjs";

/** Port 0 takes any free port, so these run in parallel with anything else. */
const withMock = async (run, options = {}) => {
  const mock = await startMetaMock({ port: 0, ...options });
  try {
    await run(mock);
  } finally {
    await mock.close();
  }
};

test("serves Meta's own example response for a fixture route", async () => {
  await withMock(async (mock) => {
    const response = await fetch(`${mock.url}/v25.0/1234/phone_numbers`);
    const body = await response.json();

    assert.equal(response.status, 200);
    // Straight out of the published collection.
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data[0].verified_name);
    assert.equal(mock.calls().at(-1).source, "fixture");
  });
});

test("flows behave: created, listed, published, deleted", async () => {
  await withMock(async (mock) => {
    const created = await fetch(`${mock.url}/v25.0/1234/flows`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "onboarding", categories: ["SIGN_UP"] }),
    }).then((r) => r.json());

    assert.ok(created.id);

    const listed = await fetch(`${mock.url}/v25.0/1234/flows`).then((r) => r.json());
    assert.equal(listed.data.length, 1);
    assert.equal(listed.data[0].name, "onboarding");
    assert.equal(listed.data[0].status, "DRAFT");

    await fetch(`${mock.url}/v25.0/${created.id}/publish`, { method: "POST" });
    const published = await fetch(`${mock.url}/v25.0/${created.id}`).then((r) => r.json());
    assert.equal(published.status, "PUBLISHED");

    await fetch(`${mock.url}/v25.0/${created.id}`, { method: "DELETE" });
    const empty = await fetch(`${mock.url}/v25.0/1234/flows`).then((r) => r.json());
    assert.equal(empty.data.length, 0);
  });
});

test("records what would have been sent to Meta", async () => {
  await withMock(async (mock) => {
    await fetch(`${mock.url}/v25.0/5678/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: "919999999999" }),
    });

    const [sent] = mock.calls({ path: "/messages", method: "POST" });
    assert.equal(sent.body.to, "919999999999");
    assert.equal(sent.source, "handler");
  });
});

test("an unmapped route is answered but marked unmatched", async () => {
  await withMock(async (mock) => {
    await fetch(`${mock.url}/v25.0/1/no_such_edge`);
    assert.equal(mock.calls().at(-1).matched, false);
  });
});

test("webhook payloads are retargeted at the account under test", async () => {
  // A one-request server standing in for the app receiving the notification.
  const received = [];
  const { createServer } = await import("node:http");
  const sink = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      received.push(JSON.parse(raw));
      res.writeHead(200).end("{}");
    });
  });
  await new Promise((resolve) => sink.listen(0, "127.0.0.1", resolve));
  const sinkUrl = `http://127.0.0.1:${sink.address().port}/webhook`;

  try {
    await withMock(
      async (mock) => {
        const result = await mock.replayWebhook({
          name: "Received Text Message",
          wabaId: "111",
          phoneNumberId: "222",
          from: "919876500001",
        });

        assert.equal(result.ok, true);
        assert.equal(received.length, 1);

        const value = received[0].entry[0].changes[0].value;
        assert.equal(received[0].entry[0].id, "111");
        assert.equal(value.metadata.phone_number_id, "222");
        assert.equal(value.contacts[0].wa_id, "919876500001");
        assert.equal(value.messages[0].from, "919876500001");
        // A message id is not an account id and must survive untouched.
        assert.ok(value.messages[0].id.startsWith("wamid."));
      },
      { webhookUrl: sinkUrl },
    );
  } finally {
    await new Promise((resolve) => sink.close(resolve));
  }
});

/* ------------------------------------------------------------------ *
 * Instagram
 *
 * WhatsApp and Instagram share four endpoints, and `POST /{id}/messages` is
 * the one that matters: both APIs use it and they answer with completely
 * different bodies. Getting that wrong is silent — the caller gets a
 * well-formed response from the wrong API.
 * ------------------------------------------------------------------ */

test("mints a unique message id per send, carrying the recipient", async () => {
  const WAMID = /^wamid\.Test(\d+)FQIAER[0-9A-F]{26}==$/;
  const send = (mock, to) =>
    fetch(`${mock.url}/v25.0/1234/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to }),
    }).then((r) => r.json());

  const ids = [];
  // Two instances, because the id used to come from a per-process counter: it
  // repeated after every restart, and the app that stores these keys its
  // messages on them — so a status callback resolved to a message from an
  // earlier run and updated that row instead of the one just sent.
  for (const _run of [1, 2]) {
    await withMock(async (mock) => {
      for (const to of ["919747053900", "919447587162"]) {
        const sent = await send(mock, to);
        const id = sent.messages[0].id;
        assert.match(id, WAMID, `unexpected message id shape: ${id}`);
        assert.equal(id.match(WAMID)[1], to, "the id must carry the recipient");
        ids.push(id);
      }
    });
  }

  assert.equal(new Set(ids).size, ids.length, "message ids must never repeat, restart or not");
});

test("tells WhatsApp and Instagram sends apart on the shared /messages route", async () => {
  await withMock(async (mock) => {
    // A Cloud API send always declares messaging_product.
    const whatsapp = await fetch(`${mock.url}/v25.0/1234/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: "919999999999" }),
    }).then((r) => r.json());

    assert.equal(whatsapp.messaging_product, "whatsapp");
    assert.ok(whatsapp.messages[0].id.startsWith("wamid."));

    // An Instagram send is a recipient and a message, and comes back with a
    // completely different envelope.
    const instagram = await fetch(`${mock.url}/v23.0/me/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipient: { id: "48102409688037" }, message: { text: "hi" } }),
    }).then((r) => r.json());

    assert.ok(instagram.recipient_id, "an Instagram send answers with recipient_id");
    assert.ok(instagram.message_id, "an Instagram send answers with message_id");
    assert.equal(instagram.messaging_product, undefined);

    const [, igCall] = mock.calls({ path: "/messages", method: "POST" });
    assert.equal(igCall.api, "instagram");
  });
});

test("serves Instagram's messenger profile endpoints", async () => {
  await withMock(async (mock) => {
    // The collection saves a response for the persistent-menu read; the
    // ice-breakers read has none, so there is no fixture to serve for it.
    const response = await fetch(
      `${mock.url}/v23.0/17841400000000000/messenger_profile?fields=persistent_menu`,
    );
    assert.equal(response.status, 200);
    assert.equal(mock.calls().at(-1).api, "instagram");

    // Setting a profile is a POST with no selector.
    await fetch(`${mock.url}/v23.0/17841400000000000/messenger_profile`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ice_breakers: [{ question: "Hours?", payload: "HOURS" }] }),
    });
    assert.equal(mock.calls().at(-1).api, "instagram");
  });
});

test("replays an Instagram DM, retargeted at the account under test", async () => {
  const received = [];
  const { createServer } = await import("node:http");
  const sink = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      received.push(JSON.parse(raw));
      res.writeHead(200).end("{}");
    });
  });
  await new Promise((resolve) => sink.listen(0, "127.0.0.1", resolve));
  const sinkUrl = `http://127.0.0.1:${sink.address().port}/webhook`;

  try {
    await withMock(
      async (mock) => {
        const result = await mock.replayWebhook({
          name: "Messaging webhook",
          wabaId: "17841400000000000",
          from: "9876543210",
        });

        assert.equal(result.ok, true);
        assert.equal(received[0].object, "instagram");

        const messaging = received[0].entry[0].messaging[0];
        assert.equal(received[0].entry[0].id, "17841400000000000");
        // Instagram nests both ends as objects, so the parent key is what
        // separates the customer from the business.
        assert.equal(messaging.sender.id, "9876543210");
        assert.equal(messaging.recipient.id, "17841400000000000");
        assert.equal(messaging.message.text, "Hello");
      },
      { webhookUrl: sinkUrl },
    );
  } finally {
    await new Promise((resolve) => sink.close(resolve));
  }
});

/* ------------------------------------------------------------------ *
 * Status progression
 *
 * Carried over from the whatsapp-mock-api server this replaces. A real send
 * is answered immediately and then produces sent → delivered → read as
 * separate webhooks; an app that only handles the acknowledgement looks fine
 * until it meets a real conversation.
 * ------------------------------------------------------------------ */

/** A stand-in for the app receiving the callbacks. */
async function withSink(run) {
  const received = [];
  const { createServer } = await import("node:http");
  const sink = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      received.push(JSON.parse(raw));
      res.writeHead(200).end("{}");
    });
  });
  await new Promise((resolve) => sink.listen(0, "127.0.0.1", resolve));
  try {
    await run(`http://127.0.0.1:${sink.address().port}/webhook`, received);
  } finally {
    await new Promise((resolve) => sink.close(resolve));
  }
}

const statusesOf = (received) =>
  received.flatMap((payload) =>
    (payload.entry?.[0]?.changes?.[0]?.value?.statuses ?? []).map((s) => s.status),
  );

test("a send produces sent, delivered and read callbacks", async () => {
  await withSink(async (sinkUrl, received) => {
    await withMock(
      async (mock) => {
        const sent = await fetch(`${mock.url}/v25.0/12345/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: "919999999999" }),
        }).then((r) => r.json());

        const messageId = sent.messages[0].id;

        // close() waits for the progression to finish, so by then all three
        // callbacks have landed.
        await mock.close();

        assert.deepEqual(statusesOf(received), ["sent", "delivered", "read"]);
        for (const payload of received) {
          const status = payload.entry[0].changes[0].value.statuses[0];
          assert.equal(status.id, messageId);
          assert.equal(status.recipient_id, "919999999999");
        }
        assert.equal(payload_waba(received), "111");
      },
      {
        webhookUrl: sinkUrl,
        statusProgression: true,
        statusDelays: { sent: 0, delivered: 0, read: 0 },
        wabaId: "111",
        phoneNumberId: "222",
      },
    );
  });
});

const payload_waba = (received) => received[0].entry[0].id;

test("failures stop the progression, and are opt-in", async () => {
  await withSink(async (sinkUrl, received) => {
    await withMock(
      async (mock) => {
        await fetch(`${mock.url}/v25.0/12345/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: "919999999999" }),
        });
        await mock.close();

        // A failed message never reaches delivered or read.
        assert.deepEqual(statusesOf(received), ["sent", "failed"]);
        const failed = received[1].entry[0].changes[0].value.statuses[0];
        assert.equal(failed.errors[0].code, 131026);
      },
      {
        webhookUrl: sinkUrl,
        statusProgression: true,
        statusDelays: { sent: 0, delivered: 0, read: 0 },
        failureRate: 1,
        wabaId: "111",
      },
    );
  });
});

test("a read receipt is not a send, so nothing follows it", async () => {
  await withSink(async (sinkUrl, received) => {
    await withMock(
      async (mock) => {
        const body = await fetch(`${mock.url}/v25.0/12345/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            status: "read",
            message_id: "wamid.INBOUND",
          }),
        }).then((r) => r.json());

        await mock.close();

        assert.deepEqual(body, { success: true });
        // Not `["sent", "delivered", "read"]` against an empty recipient — and
        // with a failure rate set, not a phantom `failed` either.
        assert.deepEqual(statusesOf(received), []);
      },
      {
        webhookUrl: sinkUrl,
        statusProgression: true,
        statusDelays: { sent: 0, delivered: 0, read: 0 },
        failureRate: 1,
        wabaId: "111",
      },
    );
  });
});

test("status progression is off unless asked for", async () => {
  await withSink(async (sinkUrl, received) => {
    await withMock(
      async (mock) => {
        await fetch(`${mock.url}/v25.0/12345/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: "919999999999" }),
        });
        await mock.close();
        assert.deepEqual(received, []);
      },
      { webhookUrl: sinkUrl },
    );
  });
});

test("a single status can be fired by hand", async () => {
  await withSink(async (sinkUrl, received) => {
    await withMock(
      async (mock) => {
        const response = await fetch(`${mock.url}/__stub/status`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messageId: "wamid.ABC",
            recipientId: "919999999999",
            status: "read",
          }),
        });

        assert.equal(response.status, 200);
        assert.deepEqual(statusesOf(received), ["read"]);
      },
      { webhookUrl: sinkUrl, wabaId: "111", phoneNumberId: "222" },
    );
  });
});

test("a replayed inbound message can carry the text a test chose", async () => {
  await withSink(async (sinkUrl, received) => {
    await withMock(
      async (mock) => {
        await mock.replayWebhook({
          name: "Received Text Message",
          from: "919876500001",
          text: "order status please",
          profileName: "Priya",
        });

        const value = received[0].entry[0].changes[0].value;
        assert.equal(value.messages[0].text.body, "order status please");
        assert.equal(value.contacts[0].profile.name, "Priya");
      },
      { webhookUrl: sinkUrl },
    );
  });
});

/**
 * Every sample payload carries one fixed `wamid`, so without this an inbound
 * message is replayable exactly once against a given database — a correct app
 * dedupes the second as the same message arriving twice.
 */
test("a replayed inbound message can carry a message id a test chose", async () => {
  await withSink(async (sinkUrl, received) => {
    await withMock(
      async (mock) => {
        await mock.replayWebhook({ name: "Received Text Message", messageId: "wamid.FIRST" });
        await mock.replayWebhook({ name: "Received Text Message", messageId: "wamid.SECOND" });

        const ids = received.map((body) => body.entry[0].changes[0].value.messages[0].id);
        assert.deepEqual(ids, ["wamid.FIRST", "wamid.SECOND"]);
      },
      { webhookUrl: sinkUrl },
    );
  });
});

test("a replay that names no message id keeps the sample's own", async () => {
  await withSink(async (sinkUrl, received) => {
    await withMock(
      async (mock) => {
        await mock.replayWebhook({ name: "Received Text Message", from: "919876500001" });

        const message = received[0].entry[0].changes[0].value.messages[0];
        // Rewriting the customer must not disturb the message id, which is not
        // an account identifier.
        assert.match(message.id, /^wamid\./);
        assert.notEqual(message.id, "919876500001");
      },
      { webhookUrl: sinkUrl },
    );
  });
});

test("marketing sends behave exactly like ordinary ones", async () => {
  await withSink(async (sinkUrl, received) => {
    await withMock(
      async (mock) => {
        // message-dispatcher posts here instead of /messages when the
        // template's category is MARKETING.
        const sent = await fetch(`${mock.url}/v25.0/259643180556398/marketing_messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: "919876500001" }),
        }).then((r) => r.json());

        // The caller reads res.data.messages[0].id and stores it; without a
        // real envelope it stores undefined and no status can ever match.
        assert.ok(sent.messages?.[0]?.id, "a marketing send must return a message id");
        assert.equal(sent.messaging_product, "whatsapp");

        await mock.close();

        assert.deepEqual(statusesOf(received), ["sent", "delivered", "read"]);
        assert.equal(
          received[0].entry[0].changes[0].value.statuses[0].id,
          sent.messages[0].id,
          "the callbacks must carry the id the send handed back",
        );
      },
      {
        webhookUrl: sinkUrl,
        statusProgression: true,
        statusDelays: { sent: 0, delivered: 0, read: 0 },
        wabaId: "111",
        phoneNumberId: "259643180556398",
      },
    );
  });
});

const sendMessage = (mock) =>
  fetch(`${mock.url}/v25.0/1234/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: "919999999999", type: "template" }),
  });

test("sendError refuses every send with Meta's error shape", async () => {
  await withMock(
    async (mock) => {
      const response = await sendMessage(mock);
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.error.code, 131042);
      assert.equal(body.error.message, "(#131042) Business eligibility payment issue");
      assert.equal(body.error.error_data.details, "There was an error related to your payment method.");
      assert.equal(body.messages, undefined);
      assert.equal(mock.calls().at(-1).status, 400);
    },
    { sendError: 131042 },
  );
});

test("sendError can be cleared at runtime, and sends go through again", async () => {
  await withMock(
    async (mock) => {
      assert.equal((await sendMessage(mock)).status, 400);

      const cleared = await fetch(`${mock.url}/__stub/send-error`, { method: "DELETE" });
      assert.deepEqual((await cleared.json()).sendError, null);

      const response = await sendMessage(mock);
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.ok(body.messages[0].id);

      const set = await fetch(`${mock.url}/__stub/send-error`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: 131042 }),
      });
      assert.equal((await set.json()).sendError, 131042);
      assert.equal((await sendMessage(mock)).status, 400);
    },
    { sendError: "131042" },
  );
});

test("sendError leaves read receipts alone and treats a blank value as off", async () => {
  await withMock(
    async (mock) => {
      const receipt = await fetch(`${mock.url}/v25.0/1234/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: "x" }),
      });
      assert.equal(receipt.status, 200);
    },
    { sendError: 131042 },
  );
  await withMock(async (mock) => assert.equal((await sendMessage(mock)).status, 200), {
    sendError: "",
  });
});

test("sendErrorRate refuses sends with random errors from the spec, never 131042", async () => {
  const { RANDOM_SEND_ERROR_CODES } = await import("../src/graph-errors.mjs");
  assert.ok(!RANDOM_SEND_ERROR_CODES.includes(131042));
  // Management-only codes are not something a send returns.
  assert.ok(!RANDOM_SEND_ERROR_CODES.includes(2388103));
  assert.ok(RANDOM_SEND_ERROR_CODES.includes(131026));

  await withMock(
    async (mock) => {
      const seen = new Set();
      for (let i = 0; i < 200; i++) {
        const response = await sendMessage(mock);
        assert.notEqual(response.status, 200);
        const { error } = await response.json();
        assert.ok(RANDOM_SEND_ERROR_CODES.includes(error.code));
        assert.equal(error.error_data.messaging_product, "whatsapp");
        assert.match(error.message, new RegExp(`^\\(#${error.code}\\) `));
        seen.add(error.code);
      }
      assert.ok(!seen.has(131042));
      assert.ok(seen.size > 20, `expected a spread of codes, saw ${seen.size}`);
    },
    { sendErrorRate: 1 },
  );
});

test("sendErrorRate honours the rate and a narrowed code list", async () => {
  // random() alternates: first call decides fail/pass, second picks the code.
  const values = [0.05, 0.99, 0.5, 0.0];
  let i = 0;
  await withMock(
    async (mock) => {
      const first = await sendMessage(mock);
      assert.equal(first.status, 400);
      assert.equal((await first.json()).error.code, 130429);

      const second = await sendMessage(mock);
      assert.equal(second.status, 200);
    },
    {
      sendErrorRate: 0.1,
      sendErrorCodes: "131026,130429",
      random: () => values[i++ % values.length],
    },
  );
});

test("DELETE /__stub/send-error turns off random errors too", async () => {
  await withMock(
    async (mock) => {
      assert.notEqual((await sendMessage(mock)).status, 200);
      const cleared = await fetch(`${mock.url}/__stub/send-error`, { method: "DELETE" });
      assert.equal((await cleared.json()).sendErrorRate, 0);
      assert.equal((await sendMessage(mock)).status, 200);
    },
    { sendErrorRate: 1 },
  );
});

test("every catalogued code produces Meta's error shape", async () => {
  const { KNOWN_ERROR_CODES, graphError } = await import("../src/graph-errors.mjs");
  assert.equal(KNOWN_ERROR_CODES.length, 82);
  for (const code of KNOWN_ERROR_CODES) {
    const { error } = graphError(code);
    assert.equal(error.code, code);
    assert.ok(error.message.startsWith(`(#${code}) `));
    assert.ok(error.error_data.details.length > 0);
  }
});
