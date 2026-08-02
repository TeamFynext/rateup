import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: { waMessage: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() } },
  excludeFields: vi.fn(),
}));
vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("../settings/wa_settings.service.js", () => ({ getWaSettingsByPageId: vi.fn() }));
vi.mock("../inbox/message/wamessage.service.js", () => ({
  updateWaMessageByMessageId: vi.fn(),
}));
vi.mock("../inbox/message/wamessage.controller.js", () => ({ handleWaMessages: vi.fn() }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { callMetaApi } from "../wa_axios.js";
import { getWaSettingsByPageId } from "../settings/wa_settings.service.js";
import { updateWaMessageByMessageId } from "../inbox/message/wamessage.service.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import {
  getFacebookUserDetailsFromMeta,
  handleFacebookMessageDelivered,
  handleFacebookMessageRead,
  handleFacebookMessages,
  handleFacebookPostback,
  handleFacebookQuickReply,
  handleFacebookWebhook,
} from "./facebook.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = (prisma as unknown as { waMessage: { findMany: Mock; findFirst: Mock; update: Mock } })
  .waMessage;
const callMetaApiMock = callMetaApi as unknown as Mock;
const getSettingsMock = getWaSettingsByPageId as unknown as Mock;
const updateByMessageIdMock = updateWaMessageByMessageId as unknown as Mock;
const handleWaMessagesMock = handleWaMessages as unknown as Mock;

const PAGE_ID = "page-1";
const PSID = "psid-1";
const ORG_ID = "org-1";

const SETTINGS = {
  orgId: ORG_ID,
  fbPageId: PAGE_ID,
  pageAccessToken: "page-token-abc",
};

/** One entry in the `messaging` array Meta posts to the page webhook. */
function messaging(overrides: Record<string, unknown> = {}): any {
  return {
    sender: { id: PSID },
    recipient: { id: PAGE_ID },
    timestamp: 1_700_000_000_000,
    ...overrides,
  };
}

/** A whole webhook body wrapping a single messaging event. */
function webhook(msg: any, pageId = PAGE_ID): any {
  return { object: "page", entry: [{ id: pageId, time: 1, messaging: [msg] }] };
}

/** The positional arguments handleWaMessages was called with. */
function waMessageCall(index = 0) {
  const [type, body, from, orgId, platform, sourceIdentifier, userName, messageId] =
    handleWaMessagesMock.mock.calls[index];
  return { type, body, from, orgId, platform, sourceIdentifier, userName, messageId };
}

beforeEach(() => {
  vi.clearAllMocks();
  getSettingsMock.mockResolvedValue(SETTINGS);
  handleWaMessagesMock.mockResolvedValue(undefined);
  updateByMessageIdMock.mockResolvedValue(null);
  callMetaApiMock.mockResolvedValue({ data: {} });
  db.findMany.mockResolvedValue([]);
  // No message already stored with this mid — the retry guard lets the event through.
  db.findFirst.mockResolvedValue(null);
  db.update.mockResolvedValue({});
});

describe("getFacebookUserDetailsFromMeta", () => {
  test("returns the profile Meta sends back", async () => {
    callMetaApiMock.mockResolvedValue({
      data: { id: PSID, name: "Ada Lovelace", profile_pic: "https://cdn/pic.jpg" },
    });

    await expect(getFacebookUserDetailsFromMeta(PSID, PAGE_ID)).resolves.toEqual({
      id: PSID,
      name: "Ada Lovelace",
      profile_pic: "https://cdn/pic.jpg",
    });
  });

  test("finds the page's token by looking the page up", async () => {
    await getFacebookUserDetailsFromMeta(PSID, PAGE_ID);

    expect(getSettingsMock).toHaveBeenCalledWith(PAGE_ID);
  });

  test("asks Meta only for the fields it needs", async () => {
    await getFacebookUserDetailsFromMeta(PSID, PAGE_ID);

    const [url, method] = callMetaApiMock.mock.calls[0];
    expect(url).toContain(`/${PSID}?`);
    expect(url).toContain("fields=name,profile_pic");
    expect(method).toBe("GET");
  });

  // The token goes in the auth header, like every other Meta call in this codebase.
  // Interpolated into the URL it was trace-logged with the request and dumped in the
  // axios config on any non-2xx.
  test("passes the page access token as the auth header, not in the query string", async () => {
    await getFacebookUserDetailsFromMeta(PSID, PAGE_ID);

    const [url, , token] = callMetaApiMock.mock.calls[0];
    expect(url).not.toContain("access_token");
    expect(token).toBe("page-token-abc");
  });

  // NOTE: pins current behaviour. The declared return type promises an optional
  // `email`, but the request never asks for one, so it is always undefined.
  test("promises an email it never asks Meta for", async () => {
    callMetaApiMock.mockResolvedValue({ data: { id: PSID, name: "Ada", profile_pic: "p" } });

    const details = await getFacebookUserDetailsFromMeta(PSID, PAGE_ID);

    expect(details.email).toBeUndefined();
  });

  test("refuses when the page is not connected to any org", async () => {
    getSettingsMock.mockResolvedValue(null);

    await expect(getFacebookUserDetailsFromMeta(PSID, PAGE_ID)).rejects.toThrow(
      "No Facebook settings found for pageId: page-1",
    );
    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  test("passes a Meta failure on to the caller", async () => {
    callMetaApiMock.mockRejectedValue(new Error("graph is down"));

    await expect(getFacebookUserDetailsFromMeta(PSID, PAGE_ID)).rejects.toThrow("graph is down");
  });
});

describe("handleFacebookWebhook - routing an event to its handler", () => {
  test("hands a plain message to the message handler", async () => {
    await handleFacebookWebhook(webhook(messaging({ message: { mid: "mid-1", text: "hi" } })));

    expect(handleWaMessagesMock).toHaveBeenCalledTimes(1);
    expect(waMessageCall().messageId).toBe("mid-1");
  });

  test("stamps the delivered time from a delivery receipt", async () => {
    await handleFacebookWebhook(
      webhook(messaging({ delivery: { mids: ["mid-1"], watermark: 1 } })),
    );

    expect(updateByMessageIdMock).toHaveBeenCalledTimes(1);
    expect(updateByMessageIdMock.mock.calls[0][0]).toBe("mid-1");
  });

  test("looks for messages to mark read on a read receipt", async () => {
    await handleFacebookWebhook(webhook(messaging({ read: { watermark: 1_700_000_000_000 } })));

    expect(db.findMany).toHaveBeenCalledTimes(1);
  });

  test("stores a button tap as a received message", async () => {
    await handleFacebookWebhook(
      webhook(messaging({ postback: { title: "Track", payload: "TRACK" } })),
    );

    expect(waMessageCall().body).toMatchObject({ type: "postback", payload: "TRACK" });
  });

  test("stores a quick reply as a received message", async () => {
    await handleFacebookWebhook(
      webhook(
        messaging({ message: { mid: "mid-1", text: "Yes", quick_reply: { payload: "OK" } } }),
      ),
    );

    expect(waMessageCall().body).toMatchObject({ type: "quick_reply", payload: "OK" });
  });

  test("processes each messaging event in an entry on its own", async () => {
    const body: any = {
      object: "page",
      entry: [
        {
          id: PAGE_ID,
          time: 1,
          messaging: [
            messaging({ message: { mid: "mid-1", text: "one" } }),
            messaging({ message: { mid: "mid-2", text: "two" } }),
          ],
        },
      ],
    };

    await handleFacebookWebhook(body);

    expect(handleWaMessagesMock).toHaveBeenCalledTimes(2);
    expect(waMessageCall(0).messageId).toBe("mid-1");
    expect(waMessageCall(1).messageId).toBe("mid-2");
  });

  test("gives each handler only the one event it is meant to process", async () => {
    const body: any = {
      object: "page",
      entry: [
        {
          id: PAGE_ID,
          time: 1,
          messaging: [
            messaging({ message: { mid: "mid-1", text: "one" } }),
            messaging({ message: { mid: "mid-2", text: "two" } }),
          ],
        },
      ],
    };

    await handleFacebookWebhook(body);

    expect(waMessageCall(0).body.message.text).toBe("one");
    expect(waMessageCall(1).body.message.text).toBe("two");
  });
});

describe("handleFacebookWebhook - events it passes over", () => {
  test("skips a page that is not connected to any org", async () => {
    getSettingsMock.mockResolvedValue(null);

    await handleFacebookWebhook(webhook(messaging({ message: { mid: "mid-1", text: "hi" } })));

    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  test("skips an echo of a message the page itself sent", async () => {
    await handleFacebookWebhook(
      webhook(messaging({ message: { mid: "mid-1", text: "hi", is_echo: true } })),
    );

    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  test("skips an event it cannot classify", async () => {
    await handleFacebookWebhook(webhook(messaging()));

    expect(handleWaMessagesMock).not.toHaveBeenCalled();
    expect(updateByMessageIdMock).not.toHaveBeenCalled();
  });

  test("ignores an entry that carries no messaging events at all", async () => {
    const body: any = { object: "page", entry: [{ id: PAGE_ID, time: 1 }] };

    await expect(handleFacebookWebhook(body)).resolves.toEqual({ processed: 0, failed: 0 });
    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  test("looks the page up once per entry", async () => {
    const body: any = {
      object: "page",
      entry: [
        { id: PAGE_ID, time: 1, messaging: [messaging({ message: { mid: "m1" } })] },
        { id: "page-2", time: 2, messaging: [messaging({ message: { mid: "m2" } })] },
      ],
    };

    await handleFacebookWebhook(body);

    expect(getSettingsMock.mock.calls.map((c) => c[0])).toEqual([PAGE_ID, "page-2"]);
  });
});

describe("handleFacebookWebhook - one bad event in a batch", () => {
  // Each entry is guarded, so a database hiccup looking one page up no longer abandons
  // the entries after it. The failure is counted, which the controller turns into a
  // non-2xx so Meta retries the batch.
  test("carries on with the rest of the batch when one page lookup fails", async () => {
    getSettingsMock.mockRejectedValueOnce(new Error("db down")).mockResolvedValue(SETTINGS);

    const body: any = {
      object: "page",
      entry: [
        { id: "page-a", time: 1, messaging: [messaging({ message: { mid: "m1" } })] },
        { id: "page-b", time: 2, messaging: [messaging({ message: { mid: "m2" } })] },
      ],
    };

    const result = await handleFacebookWebhook(body);

    expect(handleWaMessagesMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ processed: 1, failed: 1 });
  });

  // A storage failure on one message does not stop the batch; it is counted instead,
  // and the controller answers non-2xx so Meta retries.
  test("carries on with the next message when one fails to store", async () => {
    handleWaMessagesMock
      .mockRejectedValueOnce(new Error("write failed"))
      .mockResolvedValue(undefined);

    const body: any = {
      object: "page",
      entry: [
        {
          id: PAGE_ID,
          time: 1,
          messaging: [
            messaging({ message: { mid: "mid-1", text: "one" } }),
            messaging({ message: { mid: "mid-2", text: "two" } }),
          ],
        },
      ],
    };

    const result = await handleFacebookWebhook(body);

    expect(handleWaMessagesMock).toHaveBeenCalledTimes(2);
    // handleFacebookMessages swallows its own storage failure, so the batch sees both
    // events as handled — see 10.6's remaining note in issues.txt.
    expect(result).toEqual({ processed: 2, failed: 0 });
  });

  // handleFacebookPostback guards on sender and no longer dereferences it inside its
  // catch, so a postback with no sender is skipped rather than throwing out of the
  // catch and aborting the whole batch.
  test("skips a postback with no sender and carries on with the batch", async () => {
    const body: any = {
      object: "page",
      entry: [
        {
          id: PAGE_ID,
          time: 1,
          messaging: [
            { recipient: { id: PAGE_ID }, timestamp: 1, postback: { payload: "TRACK" } },
            messaging({ message: { mid: "mid-2", text: "two" } }),
          ],
        },
      ],
    };

    const result = await handleFacebookWebhook(body);

    // The postback is skipped; the plain message after it is still stored.
    expect(handleWaMessagesMock).toHaveBeenCalledTimes(1);
    expect(result.failed).toBe(0);
  });
});

describe("handleFacebookMessages", () => {
  test("stores the message against the page's org as a received Facebook message", async () => {
    await handleFacebookMessages(
      webhook(messaging({ message: { mid: "mid-1", text: "hi" } })),
      SETTINGS,
    );

    const call = waMessageCall();
    expect(call.type).toBe("receive");
    expect(call.from).toBe(PSID);
    expect(call.orgId).toBe(ORG_ID);
    expect(call.platform).toBe(PlatformType.FACEBOOK);
    expect(call.sourceIdentifier).toBe(PAGE_ID);
    expect(call.messageId).toBe("mid-1");
  });

  test("hands the whole messaging object over as the message body", async () => {
    const msg = messaging({ message: { mid: "mid-1", text: "hi" } });

    await handleFacebookMessages(webhook(msg), SETTINGS);

    expect(waMessageCall().body).toEqual(msg);
  });

  test("names no sender, so the contact is identified by psid alone", async () => {
    await handleFacebookMessages(
      webhook(messaging({ message: { mid: "mid-1", text: "hi" } })),
      SETTINGS,
    );

    expect(waMessageCall().userName).toBeUndefined();
  });

  test("ignores an event with no sender id", async () => {
    const body = webhook({ recipient: { id: PAGE_ID }, message: { mid: "mid-1" } });

    await expect(handleFacebookMessages(body, SETTINGS)).resolves.toBeUndefined();
    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  test("skips an echo of a message the page itself sent", async () => {
    await handleFacebookMessages(
      webhook(messaging({ message: { mid: "mid-1", is_echo: true } })),
      SETTINGS,
    );

    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. A failed write is indistinguishable from a
  // successful one to the caller, and the inbound message is lost with only a log
  // line to show for it. Same family as issues.txt 3.1. See issues.txt 10.6.
  test("swallows a storage failure and reports nothing", async () => {
    handleWaMessagesMock.mockRejectedValue(new Error("write failed"));

    await expect(
      handleFacebookMessages(webhook(messaging({ message: { mid: "mid-1" } })), SETTINGS),
    ).resolves.toBeUndefined();
  });
});

describe("handleFacebookMessageDelivered", () => {
  test("stamps a delivered time on every message the receipt names", async () => {
    await handleFacebookMessageDelivered(
      webhook(messaging({ delivery: { mids: ["mid-1", "mid-2"], watermark: 1 } })),
    );

    expect(updateByMessageIdMock.mock.calls.map((c) => c[0])).toEqual(["mid-1", "mid-2"]);
  });

  test("records the time it processed the receipt, not the watermark", async () => {
    await handleFacebookMessageDelivered(
      webhook(messaging({ delivery: { mids: ["mid-1"], watermark: 1_600_000_000_000 } })),
    );

    const { stats } = updateByMessageIdMock.mock.calls[0][1];
    expect(typeof stats.delivered).toBe("string");
    expect(new Date(stats.delivered).getTime()).toBeGreaterThan(1_600_000_000_000);
  });

  test("does nothing for a receipt that names no messages", async () => {
    await handleFacebookMessageDelivered(webhook(messaging({ delivery: { watermark: 1 } as any })));

    expect(updateByMessageIdMock).not.toHaveBeenCalled();
  });

  test("carries on with the remaining messages when one update fails", async () => {
    updateByMessageIdMock.mockRejectedValueOnce(new Error("nope")).mockResolvedValue(null);

    await handleFacebookMessageDelivered(
      webhook(messaging({ delivery: { mids: ["mid-1", "mid-2"], watermark: 1 } })),
    );

    expect(updateByMessageIdMock).toHaveBeenCalledTimes(2);
  });
});

describe("handleFacebookMessageRead", () => {
  const READ_AT = 1_700_000_000_000;

  function readEvent() {
    return webhook(messaging({ read: { watermark: READ_AT } }));
  }

  test("does nothing for a receipt with no watermark", async () => {
    await handleFacebookMessageRead(webhook(messaging({ read: {} })));

    expect(db.findMany).not.toHaveBeenCalled();
  });

  test("looks only at Facebook messages sent from the page the receipt is for", async () => {
    await handleFacebookMessageRead(readEvent());

    const { where } = db.findMany.mock.calls[0][0];
    expect(where.sourcePlatform).toBe(PlatformType.FACEBOOK);
    expect(where.sourceIdentifier).toBe(PAGE_ID);
  });

  test("looks only at messages sent before the watermark", async () => {
    await handleFacebookMessageRead(readEvent());

    const { where } = db.findMany.mock.calls[0][0];
    expect(where.waCreatedAt).toEqual({ lte: new Date(READ_AT) });
  });

  test("marks the messages it found as read, keeping the stats they already had", async () => {
    db.findMany.mockResolvedValue([
      { id: "msg-1", stats: { sent: "2026-01-01T00:00:00.000Z", delivered: "d" } },
    ]);

    await handleFacebookMessageRead(readEvent());

    expect(db.update.mock.calls[0][0]).toEqual({
      where: { id: "msg-1" },
      data: {
        stats: {
          sent: "2026-01-01T00:00:00.000Z",
          delivered: "d",
          read: new Date(READ_AT).toISOString(),
        },
      },
    });
  });

  test("updates every message the watermark covers", async () => {
    db.findMany.mockResolvedValue([
      { id: "msg-1", stats: {} },
      { id: "msg-2", stats: {} },
    ]);

    await handleFacebookMessageRead(readEvent());

    expect(db.update).toHaveBeenCalledTimes(2);
  });

  // NOTE: pins current behaviour, and this one makes the whole handler a no-op.
  // Outbound bodies are stored under the key `send` (see WaInboxMessageBody and
  // handleWaMessages, which builds `{ exchangeProcess, send, receive }`). The query
  // used to filter on `["sent", ...]` — a key no row has — so findMany matched nothing
  // and no Facebook message was ever marked read.
  test("filters on the message-body key outbound messages are stored under", async () => {
    await handleFacebookMessageRead(readEvent());

    const { where } = db.findMany.mock.calls[0][0];
    expect(where.messageBody.path).toEqual(["send", "recipient", "id"]);
  });

  // sendBy holds the agent's user id, so it is null for anything the platform sent on
  // its own — automated replies, campaigns, chatbot messages. Filtering on it meant
  // none of those could ever be marked read, so the filter is gone.
  test("considers messages the platform sent as well as those an agent sent by hand", async () => {
    await handleFacebookMessageRead(readEvent());

    const { where } = db.findMany.mock.calls[0][0];
    expect(where.sendBy).toBeUndefined();
  });

  // A watermark covers everything up to that point, so each receipt re-selects the whole
  // conversation. Rows already marked read are skipped, so an old message's read time no
  // longer drifts forward to whenever the customer last opened the thread — and a long
  // thread no longer issues one write per message on every receipt.
  test("leaves the read time of a message that was already read alone", async () => {
    const LATER = READ_AT + 60_000;
    db.findMany.mockResolvedValue([
      { id: "msg-1", stats: { read: new Date(READ_AT).toISOString() } },
    ]);

    await handleFacebookMessageRead(webhook(messaging({ read: { watermark: LATER } })));

    expect(db.update).not.toHaveBeenCalled();
  });

  test("still marks a message that has not been read yet", async () => {
    const LATER = READ_AT + 60_000;
    db.findMany.mockResolvedValue([
      { id: "msg-1", stats: { read: new Date(READ_AT).toISOString() } },
      { id: "msg-2", stats: { delivered: new Date(READ_AT).toISOString() } },
    ]);

    await handleFacebookMessageRead(webhook(messaging({ read: { watermark: LATER } })));

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.update.mock.calls[0][0].where.id).toBe("msg-2");
    expect(db.update.mock.calls[0][0].data.stats.read).toBe(new Date(LATER).toISOString());
  });

  test("keeps the stats already on the row it marks", async () => {
    db.findMany.mockResolvedValue([{ id: "msg-2", stats: { delivered: "earlier" } }]);

    await handleFacebookMessageRead(readEvent());

    expect(db.update.mock.calls[0][0].data.stats.delivered).toBe("earlier");
  });

  test("swallows a query failure rather than reporting it", async () => {
    db.findMany.mockRejectedValue(new Error("db down"));

    await expect(handleFacebookMessageRead(readEvent())).resolves.toBeUndefined();
  });
});

describe("handleFacebookPostback", () => {
  function postbackEvent(postback: Record<string, unknown> = { title: "Track", payload: "TRACK" }) {
    return webhook(messaging({ postback }));
  }

  test("stores the tapped button as a received message on the page's org", async () => {
    await handleFacebookPostback(postbackEvent(), SETTINGS);

    const call = waMessageCall();
    expect(call.type).toBe("receive");
    expect(call.from).toBe(PSID);
    expect(call.orgId).toBe(ORG_ID);
    expect(call.platform).toBe(PlatformType.FACEBOOK);
    expect(call.sourceIdentifier).toBe(PAGE_ID);
  });

  test("records the payload and the button's label", async () => {
    await handleFacebookPostback(postbackEvent(), SETTINGS);

    expect(waMessageCall().body).toEqual({
      type: "postback",
      payload: "TRACK",
      title: "Track",
      timestamp: 1_700_000_000_000,
      sender: { id: PSID },
    });
  });

  test("invents a message id from the timestamp, since a postback has no mid", async () => {
    await handleFacebookPostback(postbackEvent(), SETTINGS);

    expect(waMessageCall().messageId).toBe("postback_1700000000000");
  });

  test("ignores a postback with no payload", async () => {
    await handleFacebookPostback(postbackEvent({ title: "Track" }), SETTINGS);

    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  test("swallows a storage failure and reports nothing", async () => {
    handleWaMessagesMock.mockRejectedValue(new Error("write failed"));

    await expect(handleFacebookPostback(postbackEvent(), SETTINGS)).resolves.toBeUndefined();
  });

  // Guarded like handleFacebookMessages, and the catch no longer dereferences sender.
  // Previously `${sender.id}` threw inside the try and the catch threw the same
  // TypeError again while trying to report it, unwinding the whole batch.
  test("skips an event with no sender rather than throwing", async () => {
    const body: any = webhook({
      recipient: { id: PAGE_ID },
      timestamp: 1,
      postback: { payload: "TRACK" },
    });

    await expect(handleFacebookPostback(body, SETTINGS)).resolves.toBeUndefined();
    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });
});

describe("handleFacebookQuickReply", () => {
  function quickReplyEvent(message: Record<string, unknown> = {}) {
    return webhook(
      messaging({
        message: { mid: "mid-1", text: "Yes", quick_reply: { payload: "CONFIRM" }, ...message },
      }),
    );
  }

  test("stores the tapped reply as a received message on the page's org", async () => {
    await handleFacebookQuickReply(quickReplyEvent(), SETTINGS);

    const call = waMessageCall();
    expect(call.type).toBe("receive");
    expect(call.from).toBe(PSID);
    expect(call.orgId).toBe(ORG_ID);
    expect(call.platform).toBe(PlatformType.FACEBOOK);
    expect(call.messageId).toBe("mid-1");
  });

  test("records both the payload and the text the customer saw", async () => {
    await handleFacebookQuickReply(quickReplyEvent(), SETTINGS);

    expect(waMessageCall().body).toEqual({
      type: "quick_reply",
      text: "Yes",
      payload: "CONFIRM",
      timestamp: 1_700_000_000_000,
      sender: { id: PSID },
    });
  });

  test("records an empty text when the reply carried none", async () => {
    await handleFacebookQuickReply(quickReplyEvent({ text: undefined }), SETTINGS);

    expect(waMessageCall().body.text).toBe("");
  });

  test("ignores a message with no quick reply payload", async () => {
    await handleFacebookQuickReply(
      webhook(messaging({ message: { mid: "mid-1", text: "hi" } })),
      SETTINGS,
    );

    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  test("swallows a storage failure and reports nothing", async () => {
    handleWaMessagesMock.mockRejectedValue(new Error("write failed"));

    await expect(handleFacebookQuickReply(quickReplyEvent(), SETTINGS)).resolves.toBeUndefined();
  });

  // Same shape as the postback handler above.
  test("skips an event with no sender rather than throwing", async () => {
    const body: any = webhook({
      recipient: { id: PAGE_ID },
      timestamp: 1,
      message: { mid: "mid-1", quick_reply: { payload: "CONFIRM" } },
    });

    await expect(handleFacebookQuickReply(body, SETTINGS)).resolves.toBeUndefined();
    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });
});
