import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./facebook.service.js", () => ({ handleFacebookWebhook: vi.fn() }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { handleFacebookWebhook } from "./facebook.service.js";
import { facebookWebhookEventHandler } from "./facebook.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const handleWebhookMock = handleFacebookWebhook as unknown as Mock;

/** The order in which the handler acknowledged and processed, for ordering checks. */
let trace: string[] = [];

/** A Fastify reply whose `sent` flips once something has been written, as the real one does. */
function makeReply() {
  let written = false;
  const reply: any = {
    code: vi.fn(() => reply),
    send: vi.fn(() => {
      written = true;
      trace.push("send");
      return reply;
    }),
    get sent() {
      return written;
    },
  };
  return reply;
}

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return { body, headers } as any;
}

const PAGE_EVENT = {
  object: "page",
  entry: [
    {
      id: "page-1",
      time: 1,
      messaging: [
        {
          sender: { id: "psid-1" },
          recipient: { id: "page-1" },
          timestamp: 1_700_000_000_000,
          message: { mid: "mid-1", text: "hi" },
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  trace = [];
  handleWebhookMock.mockImplementation(async () => {
    trace.push("process");
  });
});

describe("facebookWebhookEventHandler - the happy path", () => {
  test("acknowledges a page event with a 200", async () => {
    const reply = makeReply();

    await facebookWebhookEventHandler(makeRequest(PAGE_EVENT), reply);

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledTimes(1);
  });

  test("passes the body straight through to the webhook processor", async () => {
    await facebookWebhookEventHandler(makeRequest(PAGE_EVENT), makeReply());

    expect(handleWebhookMock).toHaveBeenCalledWith(PAGE_EVENT);
  });

  test("acknowledges before it starts processing, so Meta is not kept waiting", async () => {
    await facebookWebhookEventHandler(makeRequest(PAGE_EVENT), makeReply());

    expect(trace).toEqual(["send", "process"]);
  });
});

describe("facebookWebhookEventHandler - events it turns away", () => {
  test("acknowledges but does not process an object that is not a page", async () => {
    const reply = makeReply();

    await facebookWebhookEventHandler(makeRequest({ object: "instagram", entry: [] }), reply);

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(handleWebhookMock).not.toHaveBeenCalled();
  });

  test("acknowledges but does not process a body with no object at all", async () => {
    const reply = makeReply();

    await facebookWebhookEventHandler(makeRequest({ entry: [] }), reply);

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(handleWebhookMock).not.toHaveBeenCalled();
  });
});

describe("facebookWebhookEventHandler - failures", () => {
  test("replies 500 when it fails before it has acknowledged", async () => {
    const reply = makeReply();

    await facebookWebhookEventHandler(makeRequest(null), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(handleWebhookMock).not.toHaveBeenCalled();
  });

  test("does not attempt a second reply after it has already acknowledged", async () => {
    handleWebhookMock.mockRejectedValue(new Error("processing blew up"));
    const reply = makeReply();

    await facebookWebhookEventHandler(makeRequest(PAGE_EVENT), reply);

    expect(reply.code).not.toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledTimes(1);
  });

  // NOTE: pins current behaviour. The 200 goes out before processing, so a
  // processing failure leaves Meta believing the event was handled. Meta only
  // retries on a non-2xx, so the event is dropped for good with one log line to
  // show for it. See issues.txt 10.6.
  test("leaves Meta with a 200 even when processing the event failed", async () => {
    handleWebhookMock.mockRejectedValue(new Error("processing blew up"));
    const reply = makeReply();

    await expect(
      facebookWebhookEventHandler(makeRequest(PAGE_EVENT), reply),
    ).resolves.toBeUndefined();

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.code).toHaveBeenCalledTimes(1);
  });
});

describe("facebookWebhookEventHandler - who is allowed to post here", () => {
  // NOTE: pins current behaviour. The route is unauthenticated and the handler
  // never looks at x-hub-signature-256, so anyone who knows a connected page id
  // can post fabricated inbound messages into that org's inbox — and those
  // messages run the org's automated replies. isRequestSignatureValid exists in
  // wa_encryption.utils.ts but is stubbed to `return true` and is not called from
  // here anyway. See issues.txt 10.8.
  test("processes an event that carries no signature header", async () => {
    await facebookWebhookEventHandler(makeRequest(PAGE_EVENT, {}), makeReply());

    expect(handleWebhookMock).toHaveBeenCalledWith(PAGE_EVENT);
  });

  test("processes an event whose signature header is plainly wrong", async () => {
    await facebookWebhookEventHandler(
      makeRequest(PAGE_EVENT, { "x-hub-signature-256": "sha256=deadbeef" }),
      makeReply(),
    );

    expect(handleWebhookMock).toHaveBeenCalledWith(PAGE_EVENT);
  });
});
