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
    return { processed: 1, failed: 0 };
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

  // Processing happens BEFORE the acknowledgement now, so a failure can be reported to
  // Meta and retried. Meta allows ~20s for a webhook response.
  test("processes before it acknowledges, so a failure can still be reported", async () => {
    await facebookWebhookEventHandler(makeRequest(PAGE_EVENT), makeReply());

    expect(trace).toEqual(["process", "send"]);
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

  test("answers a single 500 when processing throws outright", async () => {
    handleWebhookMock.mockRejectedValue(new Error("processing blew up"));
    const reply = makeReply();

    await facebookWebhookEventHandler(makeRequest(PAGE_EVENT), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledTimes(1);
  });

  // Meta only retries on a non-2xx, so a processing failure must NOT be acknowledged —
  // otherwise the event is dropped for good with one log line to show for it.
  test("answers non-2xx when processing the event failed, so Meta retries", async () => {
    handleWebhookMock.mockRejectedValue(new Error("processing blew up"));
    const reply = makeReply();

    await facebookWebhookEventHandler(makeRequest(PAGE_EVENT), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.code).not.toHaveBeenCalledWith(200);
  });

  // A batch can partly succeed. Any failure still asks Meta to retry the batch;
  // handleFacebookMessages guards on the Meta message id so the events that already
  // succeeded are not stored twice.
  test("answers non-2xx when only some events in the batch failed", async () => {
    handleWebhookMock.mockResolvedValue({ processed: 2, failed: 1 });
    const reply = makeReply();

    await facebookWebhookEventHandler(makeRequest(PAGE_EVENT), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });

  test("acknowledges when every event in the batch succeeded", async () => {
    handleWebhookMock.mockResolvedValue({ processed: 3, failed: 0 });
    const reply = makeReply();

    await facebookWebhookEventHandler(makeRequest(PAGE_EVENT), reply);

    expect(reply.code).toHaveBeenCalledWith(200);
  });
});

describe("facebookWebhookEventHandler - who is allowed to post here", () => {
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
