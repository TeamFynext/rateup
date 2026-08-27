import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const callMetaApi = vi.fn();
const handleWaMessages = vi.fn();
const assertWithinConversationLimit = vi.fn();
const getWaSettings = vi.fn();
const getWaSettingsByIbaId = vi.fn();
const getWaSettingsByPageId = vi.fn();

vi.mock("../wa_axios.js", async () => {
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
vi.mock("../inbox/message/wamessage.controller.js", () => ({ handleWaMessages }));
vi.mock("../whatsappSurvey/wasurvey.auth.js", () => ({ assertWithinConversationLimit }));
vi.mock("../settings/wa_settings.service.js", () => ({
  getWaSettings,
  getWaSettingsByIbaId,
  getWaSettingsByPageId,
}));

const { sendMetaMessage, metaErrorMessage } = await import("./metaMessage.service.js");
const { GraphApiError } = await import("../wa_axios.js");
const { PlatformType } = await import("../../../../generated/prisma/enums.js");

const ORG = "org-1";
const payload = { messaging_product: "whatsapp", to: "+100" };

beforeEach(() => {
  vi.clearAllMocks();
  getWaSettings.mockResolvedValue({ accessToken: "wa-token", phoneId: "phone-1", phone: "+919" });
  getWaSettingsByIbaId.mockResolvedValue({ pageAccessToken: "ig-token" });
  getWaSettingsByPageId.mockResolvedValue({ pageAccessToken: "fb-token" });
  callMetaApi.mockResolvedValue({ data: { messages: [{ id: "wamid.1" }] } });
});

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

    expect(result).toEqual({ ok: true, messageId: "wamid.1" });
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
    getWaSettings.mockResolvedValue(null);

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

    expect(result).toEqual({ ok: true, messageId: "ig.1" });
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

  it("still reports success when the message cannot be stored", async () => {
    handleWaMessages.mockRejectedValueOnce(new Error("db down"));

    await expect(send()).resolves.toEqual({ ok: true, messageId: "wamid.1" });
  });

  it("carries campaign linkage through to the writer", async () => {
    await send({ campaign: { participantId: "p-1", dripStageId: "d-1" }, messageType: "CAMPAIGN" });

    expect(handleWaMessages.mock.calls[0][15]).toEqual({
      participantId: "p-1",
      dripStageId: "d-1",
    });
  });

  it("checks the conversation quota by default, and skips it only when opted out", async () => {
    // Enforcement is on unless a caller opts out. The default used to be false — the
    // opposite polarity to sendMessage's `skipConversationLimit` — which left campaign
    // fan-out and ad-hoc sends through this path silently ungated.
    await send();
    expect(assertWithinConversationLimit).toHaveBeenCalledWith(ORG);

    vi.mocked(assertWithinConversationLimit).mockClear();
    await send({ enforceConversationLimit: false });
    expect(assertWithinConversationLimit).not.toHaveBeenCalled();
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
});
