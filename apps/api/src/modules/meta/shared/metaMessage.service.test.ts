import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const callMetaApi = vi.fn();
const handleWaMessages = vi.fn();
const getWaMessageByMessageId = vi.fn();
const assertCanMessageContact = vi.fn();
const assertCampaignCredit = vi.fn();
const getWaSettings = vi.fn();
const getWaSendingSettings = vi.fn();
const getInstagramChannel = vi.fn();
const getMessengerChannel = vi.fn();
const enqueueWaMessageRecord = vi.fn();
const getSentMessageId = vi.fn();
const markMessageSent = vi.fn();
const gateSendApiMessage = vi.fn();

vi.mock("../whatsapp/wa_axios.js", async () => {
  class GraphApiError extends Error {
    error: unknown;
    constructor(error: unknown) {
      super("graph");
      this.name = "GraphApiError";
      this.error = error;
    }
  }
  return { callMetaApi, GraphApiError };
});
vi.mock("../../inbox/message/wamessage.controller.js", () => ({ handleWaMessages }));
vi.mock("../../inbox/message/wamessage.service.js", () => ({ getWaMessageByMessageId }));
vi.mock("../whatsapp/webhook/whatsapp.auth.js", () => ({
  assertCanMessageContact,
  assertCampaignCredit,
}));
vi.mock("../../../workers/bullmq/queues/whatsapp.queue.js", () => ({ enqueueWaMessageRecord }));
vi.mock("./sendIdempotency.js", () => ({ getSentMessageId, markMessageSent }));
// The gate reads the database; its own decisions are tested in sendWindow.test.ts.
vi.mock("./sendWindow.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sendWindow.js")>()),
  gateSendApiMessage,
}));
vi.mock("../whatsapp/settings/settings.service.js", () => ({
  getWaSettings,
  getWaSendingSettings,
}));
vi.mock("../channels/metaChannel.service.js", () => ({
  getInstagramChannel,
  getMessengerChannel,
}));

const { sendMetaMessage, metaErrorMessage } = await import("./metaMessage.service.js");
const { GraphApiError } = await import("../whatsapp/wa_axios.js");
const { PlatformType } = await import("../../../generated/prisma/enums.js");

const ORG = "org-1";
const payload = { messaging_product: "whatsapp", to: "+100" };

beforeEach(() => {
  vi.clearAllMocks();
  gateSendApiMessage.mockImplementation(async ({ payload }) => payload);
  getWaSendingSettings.mockResolvedValue({
    accessToken: "wa-token",
    phoneId: "phone-1",
    phone: "+919",
  });
  getWaSettings.mockResolvedValue({ accessToken: "wa-token", phoneId: "phone-1", phone: "+919" });
  getInstagramChannel.mockResolvedValue({ pageAccessToken: "ig-token" });
  getMessengerChannel.mockResolvedValue({ pageAccessToken: "fb-token" });
  callMetaApi.mockResolvedValue({ data: { messages: [{ id: "wamid.1" }] } });
  getWaMessageByMessageId.mockResolvedValue(null);
  enqueueWaMessageRecord.mockResolvedValue({ id: "record:wamid.1" });
  getSentMessageId.mockResolvedValue(null);
  markMessageSent.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  // `clearAllMocks` keeps implementations, and a persistent rejection left on
  // the store would send the next test round the real-timer retry path.
  handleWaMessages.mockReset();
  getWaMessageByMessageId.mockReset();
  enqueueWaMessageRecord.mockReset();
});

/** Run a send whose store retries wait on timers, without waiting for them. */
const sendThroughRetries = async (over = {}) => {
  vi.useFakeTimers();
  const pending = send(over);
  await vi.runAllTimersAsync();
  return pending;
};

const send = (over = {}) =>
  sendMetaMessage({
    platform: PlatformType.WHATSAPP,
    orgId: ORG,
    to: "+100",
    payload,
    ...over,
  } as never);

describe("sendMetaMessage", () => {
  it("sends and records the message once", async () => {
    const result = await send();

    expect(result).toEqual({ ok: true, messageId: "wamid.1", recipientId: "+100" });
    expect(callMetaApi).toHaveBeenCalledWith("/phone-1/messages", "POST", "wa-token", payload, {});
    expect(handleWaMessages).toHaveBeenCalledTimes(1);
    // 10th positional argument is `failed`
    expect(handleWaMessages.mock.calls[0][9]).toBe(false);
  });

  // The failure this service exists for: Instagram's senders used to log and
  // rethrow, leaving no trace, and the WhatsApp path recorded the same failure
  // twice — once bare, once with the detail.
  it("records exactly one message, carrying the reason, when Meta rejects", async () => {
    callMetaApi.mockRejectedValue(
      new GraphApiError({ code: 131026, message: "Message undeliverable" } as never),
    );

    const result = await send();

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Message undeliverable");
    expect(handleWaMessages).toHaveBeenCalledTimes(1);
    const call = handleWaMessages.mock.calls[0];
    expect(call[9]).toBe(true); // failed
    expect(call[14]).toEqual({ code: 131026, message: "Message undeliverable" }); // logs
    expect(call[7]).toBeUndefined(); // no message id
  });

  it("records transport failures with a readable reason", async () => {
    callMetaApi.mockRejectedValue(new Error("socket hang up"));

    const result = await send();

    expect(result.ok).toBe(false);
    expect(result.error).toBe("socket hang up");
    expect(handleWaMessages.mock.calls[0][14]).toEqual({
      message: "socket hang up",
      type: "Error",
    });
  });

  it("reports missing credentials instead of throwing, and sends nothing", async () => {
    // Also the shape a multi-channel org gets when the send names no number:
    // `getWaSendingSettings` refuses to guess one rather than falling back to
    // the org's oldest, so the send is reported rather than sent on a number
    // with no 24h window open.
    getWaSendingSettings.mockResolvedValue(null);

    const result = await send();

    expect(result.ok).toBe(false);
    expect(result.error).toContain("No WHATSAPP credentials");
    expect(callMetaApi).not.toHaveBeenCalled();
    expect(handleWaMessages).not.toHaveBeenCalled();
  });

  it("routes marketing sends to the metered endpoint", async () => {
    await send({ category: "MARKETING" });

    expect(callMetaApi.mock.calls[0][0]).toBe("/phone-1/marketing_messages");
  });

  it("sends Instagram through the Send API with its page token", async () => {
    callMetaApi.mockResolvedValue({ data: { message_id: "ig.1" } });

    const result = await sendMetaMessage({
      platform: PlatformType.INSTAGRAM,
      orgId: ORG,
      to: "igs-1",
      sourceIdentifier: "iba-1",
      payload: { recipient: { id: "igs-1" }, message: { text: "hi" } },
    } as never);

    expect(result).toEqual({ ok: true, messageId: "ig.1", recipientId: "igs-1" });
    // Scoped to the sending org, so a send never goes out on another org's account.
    expect(getInstagramChannel).toHaveBeenCalledWith("iba-1", ORG);
    const [path, method, token, , config] = callMetaApi.mock.calls[0];
    expect([path, method, token]).toEqual(["/me/messages", "POST", "ig-token"]);
    expect(config).toEqual({});
  });

  // The older inbox path passes the token as a query parameter; both modes have
  // to keep working until it is routed through here too.
  it("supports query-parameter auth when the credentials ask for it", async () => {
    await send({
      credentials: {
        accessToken: "q-token",
        phoneId: "phone-1",
        sourceIdentifier: "919",
        auth: "query",
      },
    });

    const [, , token, , config] = callMetaApi.mock.calls[0];
    expect(token).toBeUndefined();
    expect(config).toEqual({ params: { access_token: "q-token" } });
  });

  // Meta has the message either way. A record that fails is handed to the
  // record queue, which retries with real backoff from another process — an
  // unrecorded campaign message is a participant stuck in PENDING with its
  // receipts dead-lettered, and in-process retries in the process whose pool
  // just timed out fail the same way.
  it("queues the message for recording when the store fails", async () => {
    handleWaMessages.mockRejectedValueOnce(new Error("db down"));

    await expect(
      send({ campaign: { participantId: "p-1", campaignSendId: "s-1" }, messageType: "CAMPAIGN" }),
    ).resolves.toEqual({ ok: true, messageId: "wamid.1", recipientId: "+100" });
    expect(handleWaMessages).toHaveBeenCalledTimes(1);
    expect(enqueueWaMessageRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: "wamid.1",
        recipient: "+100",
        orgId: ORG,
        messageType: "CAMPAIGN",
        campaign: { participantId: "p-1", campaignSendId: "s-1" },
      }),
    );
  });

  it("falls back to in-process retries when the record queue is unreachable", async () => {
    handleWaMessages.mockRejectedValueOnce(new Error("db down"));
    enqueueWaMessageRecord.mockRejectedValue(new Error("redis down"));

    await expect(sendThroughRetries()).resolves.toEqual({
      ok: true,
      messageId: "wamid.1",
      recipientId: "+100",
    });
    expect(handleWaMessages).toHaveBeenCalledTimes(2);
  });

  it("does not store twice when the first attempt wrote the row before failing", async () => {
    handleWaMessages.mockRejectedValueOnce(new Error("failed after insert"));
    enqueueWaMessageRecord.mockRejectedValue(new Error("redis down"));
    getWaMessageByMessageId.mockResolvedValue({ id: "row-1" });

    await expect(sendThroughRetries()).resolves.toEqual({
      ok: true,
      messageId: "wamid.1",
      recipientId: "+100",
    });
    expect(handleWaMessages).toHaveBeenCalledTimes(1);
    expect(getWaMessageByMessageId).toHaveBeenCalledWith("wamid.1");
  });

  it("still reports success when the message cannot be stored at all", async () => {
    handleWaMessages.mockRejectedValue(new Error("db down"));
    enqueueWaMessageRecord.mockRejectedValue(new Error("redis down"));

    await expect(sendThroughRetries()).resolves.toEqual({
      ok: true,
      messageId: "wamid.1",
      recipientId: "+100",
    });
    // The first attempt plus every fallback retry, then it gives up rather than throw.
    expect(handleWaMessages).toHaveBeenCalledTimes(4);
  });

  it("records a rejected send once even when the store fails", async () => {
    callMetaApi.mockRejectedValue(new Error("socket hang up"));
    handleWaMessages.mockRejectedValue(new Error("db down"));

    const result = await sendThroughRetries();

    expect(result.ok).toBe(false);
    // No message id to check against, so a retry could file the rejection twice.
    expect(handleWaMessages).toHaveBeenCalledTimes(1);
    expect(getWaMessageByMessageId).not.toHaveBeenCalled();
    expect(enqueueWaMessageRecord).not.toHaveBeenCalled();
  });

  it("carries campaign linkage through to the writer", async () => {
    await send({ campaign: { participantId: "p-1", dripStageId: "d-1" }, messageType: "CAMPAIGN" });

    expect(handleWaMessages.mock.calls[0][15]).toEqual({
      participantId: "p-1",
      dripStageId: "d-1",
    });
  });

  it("checks the recipient against the active-contact allowance by default", async () => {
    // On unless a caller opts out, so a new send path is never silently ungated.
    await send();
    expect(assertCanMessageContact).toHaveBeenCalledWith(ORG, {
      platform: PlatformType.WHATSAPP,
      customerId: "+100",
    });
    expect(assertCampaignCredit).not.toHaveBeenCalled();

    vi.mocked(assertCanMessageContact).mockClear();
    await send({ enforcePlanLimits: false });
    expect(assertCanMessageContact).not.toHaveBeenCalled();
  });

  it("spends a campaign credit for a campaign send instead of checking the contact", async () => {
    await send({ campaign: { participantId: "p-1" }, messageType: "CAMPAIGN" });

    expect(assertCampaignCredit).toHaveBeenCalledWith(ORG);
    expect(assertCanMessageContact).not.toHaveBeenCalled();
  });

  it("sends nothing when the plan refuses", async () => {
    assertCanMessageContact.mockRejectedValueOnce(new Error("limit"));

    await expect(send()).rejects.toThrow("limit");
    expect(callMetaApi).not.toHaveBeenCalled();
  });
});

describe("sendMetaMessage — idempotency key", () => {
  const campaignSend = (over = {}) =>
    send({
      campaign: { participantId: "p-1", campaignSendId: "s-1" },
      messageType: "CAMPAIGN",
      idempotencyKey: "job-1",
      ...over,
    });

  it("marks the key as soon as Meta accepts, before recording", async () => {
    await campaignSend();

    expect(markMessageSent).toHaveBeenCalledWith("job-1", "wamid.1");
    expect(markMessageSent.mock.invocationCallOrder[0]).toBeLessThan(
      handleWaMessages.mock.invocationCallOrder[0],
    );
  });

  // A stalled job rerun by BullMQ after Meta accepted its message.
  it("does not call Graph again when the key is already marked", async () => {
    getSentMessageId.mockResolvedValue("wamid.earlier");

    const result = await campaignSend();

    expect(result).toEqual({ ok: true, messageId: "wamid.earlier", replayed: true });
    expect(callMetaApi).not.toHaveBeenCalled();
    // Paid for on the first run; a rerun spends nothing.
    expect(assertCampaignCredit).not.toHaveBeenCalled();
    expect(markMessageSent).not.toHaveBeenCalled();
    // The first run died before storing it, so this one does.
    expect(handleWaMessages).toHaveBeenCalledTimes(1);
    expect(handleWaMessages.mock.calls[0][7]).toBe("wamid.earlier");
    expect(handleWaMessages.mock.calls[0][9]).toBe(false);
  });

  it("does not record twice when the first run already stored the message", async () => {
    getSentMessageId.mockResolvedValue("wamid.earlier");
    getWaMessageByMessageId.mockResolvedValue({ id: "row-1" });

    await campaignSend();

    expect(callMetaApi).not.toHaveBeenCalled();
    expect(handleWaMessages).not.toHaveBeenCalled();
  });

  it("does not mark a rejected send", async () => {
    callMetaApi.mockRejectedValue(new GraphApiError({ code: 131026 } as never));

    await campaignSend();

    expect(markMessageSent).not.toHaveBeenCalled();
  });

  it("leaves sends without a key alone", async () => {
    await send();

    expect(getSentMessageId).not.toHaveBeenCalled();
    expect(markMessageSent).not.toHaveBeenCalled();
  });
});

describe("metaErrorMessage", () => {
  it("prefers the copy Meta wrote for humans", () => {
    expect(
      metaErrorMessage({ error_user_msg: "Number not on WhatsApp", message: "raw" } as never),
    ).toBe("Number not on WhatsApp");
  });

  it("falls back through message, details, then the code", () => {
    expect(metaErrorMessage({ message: "raw" })).toBe("raw");
    expect(metaErrorMessage({ error_data: { details: "deep" } })).toBe("deep");
    expect(metaErrorMessage({ code: 131026 })).toBe("Graph error 131026");
    expect(metaErrorMessage(undefined)).toBe("Failed to send message");
  });

  it("explains Meta's outside-the-window refusals on Messenger and Instagram", () => {
    for (const subcode of [2018278, 2534022]) {
      expect(
        metaErrorMessage({ code: 10, error_subcode: subcode, message: "raw" } as never),
      ).toMatch(/7 days by a person/);
    }
  });
});

describe("sendMetaMessage - Send API gate", () => {
  it("refuses without calling Meta or recording anything", async () => {
    const { MetaSendRefusedError } = await import("./sendWindow.js");
    gateSendApiMessage.mockRejectedValue(new MetaSendRefusedError("window_closed"));
    getInstagramChannel.mockResolvedValue({ pageAccessToken: "ig-token" });

    const result = await sendMetaMessage({
      platform: PlatformType.INSTAGRAM,
      orgId: ORG,
      to: "igsid-1",
      sourceIdentifier: "iba-1",
      payload: { recipient: { id: "igsid-1" }, message: { text: "hi" } },
      userId: "user-1",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/7 days/);
    expect(callMetaApi).not.toHaveBeenCalled();
    expect(handleWaMessages).not.toHaveBeenCalled();
  });

  it("sends and records the payload the gate returned", async () => {
    gateSendApiMessage.mockImplementation(async ({ payload }) => ({
      ...payload,
      messaging_type: "MESSAGE_TAG",
      tag: "HUMAN_AGENT",
    }));
    getInstagramChannel.mockResolvedValue({ pageAccessToken: "ig-token" });
    callMetaApi.mockResolvedValue({ data: { message_id: "mid.1" } });

    await sendMetaMessage({
      platform: PlatformType.INSTAGRAM,
      orgId: ORG,
      to: "igsid-1",
      sourceIdentifier: "iba-1",
      payload: { recipient: { id: "igsid-1" }, message: { text: "hi" } },
      userId: "user-1",
    });

    expect(callMetaApi.mock.calls[0]![3]).toMatchObject({ tag: "HUMAN_AGENT" });
    expect(handleWaMessages.mock.calls[0]![1]).toMatchObject({ tag: "HUMAN_AGENT" });
  });
});

// A private reply is addressed to the comment, not a person; Meta's answer names them.
describe("sendMetaMessage - addressed to a comment", () => {
  it("reports the recipient Meta named", async () => {
    callMetaApi.mockResolvedValue({ data: { message_id: "m.1", recipient_id: "psid-9" } });

    const result = await sendMetaMessage({
      platform: PlatformType.FACEBOOK,
      orgId: ORG,
      sourceIdentifier: "page-1",
      payload: { recipient: { comment_id: "c-1" }, message: { text: "hi" } },
    } as never);

    expect(result).toEqual({ ok: true, messageId: "m.1", recipientId: "psid-9" });
  });
});
