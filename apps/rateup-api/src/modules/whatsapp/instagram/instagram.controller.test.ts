import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./instagram.service.js", () => ({ handleInstagramWebhook: vi.fn() }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { handleInstagramWebhook } from "./instagram.service.js";
import { instagramWebhookEventHandler } from "./instagram.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const handleWebhookMock = handleInstagramWebhook as unknown as Mock;

/** The order in which the handler acknowledged and processed. */
let trace: string[] = [];

/** A Fastify reply whose `sent` flips once something has been written. */
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

const IG_EVENT = {
  object: "instagram",
  entry: [
    {
      id: "iba-1",
      time: 1,
      messaging: [
        {
          sender: { id: "igs-1" },
          recipient: { id: "iba-1" },
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

describe("instagramWebhookEventHandler - the happy path", () => {
  test("acknowledges an Instagram event with a 200", async () => {
    const rep = makeReply();

    await instagramWebhookEventHandler(makeRequest(IG_EVENT), rep);

    expect(rep.code).toHaveBeenCalledWith(200);
    expect(rep.send).toHaveBeenCalledTimes(1);
  });

  test("passes the body straight through to the webhook processor", async () => {
    await instagramWebhookEventHandler(makeRequest(IG_EVENT), makeReply());

    expect(handleWebhookMock).toHaveBeenCalledWith(IG_EVENT);
  });

  // Processed BEFORE acknowledging. The 200 used to go out first, so `reply.sent`
  // was already true by the time anything threw and the catch could only log —
  // Meta, which retries only on a non-2xx, treated a lost message as delivered.
  // Matches the Facebook webhook (issues.txt 10.6). See issues.txt 12.2.
  test("processes before it acknowledges, so a failure can still be reported", async () => {
    await instagramWebhookEventHandler(makeRequest(IG_EVENT), makeReply());

    expect(trace).toEqual(["process", "send"]);
  });

  // NOTE: pins current behaviour. The Instagram endpoint also accepts object
  // "page", which is what the Facebook webhook receives — so a Facebook page event
  // posted here is processed as Instagram, against an entry id looked up as an
  // Instagram business account. Harmless in practice (the lookup finds nothing and
  // the entry is skipped) but the two endpoints overlap for no stated reason.
  // See issues.txt 12.16.
  test("also accepts a Facebook page event", async () => {
    await instagramWebhookEventHandler(makeRequest({ object: "page", entry: [] }), makeReply());

    expect(handleWebhookMock).toHaveBeenCalled();
  });
});

describe("instagramWebhookEventHandler - events it turns away", () => {
  test("acknowledges but does not process an object it does not recognise", async () => {
    const rep = makeReply();

    await instagramWebhookEventHandler(makeRequest({ object: "whatsapp_business_account" }), rep);

    expect(rep.code).toHaveBeenCalledWith(200);
    expect(handleWebhookMock).not.toHaveBeenCalled();
  });

  test("acknowledges but does not process a body with no object at all", async () => {
    const rep = makeReply();

    await instagramWebhookEventHandler(makeRequest({ entry: [] }), rep);

    expect(rep.code).toHaveBeenCalledWith(200);
    expect(handleWebhookMock).not.toHaveBeenCalled();
  });
});

describe("instagramWebhookEventHandler - failures", () => {
  test("replies 500 when it fails before it has acknowledged", async () => {
    const rep = makeReply();

    await instagramWebhookEventHandler(makeRequest(null), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
    expect(handleWebhookMock).not.toHaveBeenCalled();
  });

  test("replies once, with a 500, when processing throws outright", async () => {
    handleWebhookMock.mockRejectedValue(new Error("processing blew up"));
    const rep = makeReply();

    await instagramWebhookEventHandler(makeRequest(IG_EVENT), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
    expect(rep.send).toHaveBeenCalledTimes(1);
  });

  // The 200 used to go out before processing, so a failure — including the
  // batch-abandoning throws that were pinned in instagram.service.test.ts — left
  // Meta believing the event was handled. Meta only retries on a non-2xx, so
  // those events were lost for good. Same shape as issues.txt 10.6.
  // See issues.txt 12.2.
  test("answers non-2xx when some events in the batch failed, so Meta retries", async () => {
    handleWebhookMock.mockResolvedValue({ processed: 1, failed: 1 });
    const rep = makeReply();

    await instagramWebhookEventHandler(makeRequest(IG_EVENT), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
    expect(rep.code).not.toHaveBeenCalledWith(200);
  });

  test("acknowledges when every event in the batch was handled", async () => {
    handleWebhookMock.mockResolvedValue({ processed: 2, failed: 0 });
    const rep = makeReply();

    await instagramWebhookEventHandler(makeRequest(IG_EVENT), rep);

    expect(rep.code).toHaveBeenCalledWith(200);
  });
});

describe("instagramWebhookEventHandler - who is allowed to post here", () => {
  // NOTE: pins current behaviour, the same gap as issues.txt 10.8. The route is
  // unauthenticated and nothing checks x-hub-signature-256, so anyone who knows a
  // connected Instagram business account id can post fabricated inbound messages
  // and comments into that org's inbox — and those run the org's automated replies.
  // See issues.txt 12.17.
  test("processes an event that carries no signature header", async () => {
    await instagramWebhookEventHandler(makeRequest(IG_EVENT, {}), makeReply());

    expect(handleWebhookMock).toHaveBeenCalledWith(IG_EVENT);
  });

  test("processes an event whose signature header is plainly wrong", async () => {
    await instagramWebhookEventHandler(
      makeRequest(IG_EVENT, { "x-hub-signature-256": "sha256=deadbeef" }),
      makeReply(),
    );

    expect(handleWebhookMock).toHaveBeenCalledWith(IG_EVENT);
  });
});
