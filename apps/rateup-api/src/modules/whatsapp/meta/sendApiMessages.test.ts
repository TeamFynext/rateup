import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("../metaChannel/metaChannel.service.js", () => ({
  getInstagramChannel: vi.fn(),
  getMessengerChannel: vi.fn(),
}));
vi.mock("../whatsappSurvey/wasurvey.auth.js", () => ({
  assertCanMessageContact: vi.fn(),
  assertCampaignCredit: vi.fn(),
}));
vi.mock("../inbox/message/wamessage.controller.js", () => ({ handleWaMessages: vi.fn() }));
vi.mock("../../../workers/bullmq/queues/whatsapp.queue.js", () => ({
  enqueueWaMessageRecord: vi.fn().mockResolvedValue({ id: "record" }),
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { callMetaApi } from "../wa_axios.js";
import { getInstagramChannel, getMessengerChannel } from "../metaChannel/metaChannel.service.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import {
  sendSendApiAudio,
  sendSendApiText,
  sendSendApiVideo,
  type MetaFlowChannel,
} from "./sendApiMessages.js";

type Mock = ReturnType<typeof vi.fn>;

const callMetaApiMock = callMetaApi as unknown as Mock;
const instagramChannelMock = getInstagramChannel as unknown as Mock;
const messengerChannelMock = getMessengerChannel as unknown as Mock;
const handleWaMessagesMock = handleWaMessages as unknown as Mock;

const ORG_ID = "org-1";
const MESSENGER: MetaFlowChannel = { platform: PlatformType.FACEBOOK, accountId: "page-1" };

beforeEach(() => {
  vi.clearAllMocks();
  messengerChannelMock.mockResolvedValue({ pageAccessToken: "page-token" });
  instagramChannelMock.mockResolvedValue({ pageAccessToken: "ig-token" });
  callMetaApiMock.mockResolvedValue({ data: { message_id: "mid-1" } });
  handleWaMessagesMock.mockResolvedValue(undefined);
});

describe("sending on Messenger", () => {
  test("sends with the Page's token and files the message as a Messenger one", async () => {
    await expect(sendSendApiText(MESSENGER, "psid-1", ORG_ID, "hello")).resolves.toEqual({
      message_id: "mid-1",
    });

    expect(messengerChannelMock).toHaveBeenCalledWith("page-1", ORG_ID);
    expect(instagramChannelMock).not.toHaveBeenCalled();
    const [url, method, token, body] = callMetaApiMock.mock.calls[0];
    expect({ url, method, token, body }).toEqual({
      url: "/me/messages",
      method: "POST",
      token: "page-token",
      body: { recipient: { id: "psid-1" }, message: { text: "hello" } },
    });
    expect(handleWaMessagesMock.mock.calls[0][4]).toBe(PlatformType.FACEBOOK);
  });

  test("refuses when the Page has no Messenger channel", async () => {
    messengerChannelMock.mockResolvedValue(null);

    await expect(sendSendApiText(MESSENGER, "psid-1", ORG_ID, "hello")).rejects.toThrow(
      "No FACEBOOK credentials configured",
    );
    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  test("passes a Meta refusal on, so a flow can stop there", async () => {
    callMetaApiMock.mockRejectedValue(new Error("outside the messaging window"));

    await expect(sendSendApiText(MESSENGER, "psid-1", ORG_ID, "hello")).rejects.toThrow();
  });
});

describe("media", () => {
  test("sends audio as a reusable attachment", async () => {
    await sendSendApiAudio(MESSENGER, "psid-1", ORG_ID, "https://cdn/a.mp3");

    expect(callMetaApiMock.mock.calls[0][3].message).toEqual({
      attachment: { type: "audio", payload: { url: "https://cdn/a.mp3", is_reusable: true } },
    });
  });

  test("sends a video's caption as a second message", async () => {
    const result = await sendSendApiVideo(MESSENGER, "psid-1", ORG_ID, "https://cdn/v.mp4", "Hi");

    expect(callMetaApiMock).toHaveBeenCalledTimes(2);
    expect(callMetaApiMock.mock.calls[0][3].message.attachment.type).toBe("video");
    expect(callMetaApiMock.mock.calls[1][3].message).toEqual({ text: "Hi" });
    expect(result.caption).toEqual({ sent: true });
  });
});

// A Page comment does not name the person's Messenger id, so the first send answers the
// comment and Meta's reply names them; later sends on the same channel go to them.
describe("answering a Facebook comment", () => {
  const onComment = () => ({
    ...MESSENGER,
    pendingComment: { commentId: "comment-1" } as { commentId: string; recipientId?: string },
  });

  test("sends the first message as a private reply to the comment", async () => {
    callMetaApiMock.mockResolvedValue({ data: { message_id: "mid-1", recipient_id: "psid-9" } });
    const channel = onComment();

    await sendSendApiText(channel, "fb_comment:comment-1", ORG_ID, "Here is the price list");

    expect(callMetaApiMock.mock.calls[0][3]).toEqual({
      recipient: { comment_id: "comment-1" },
      message: { text: "Here is the price list" },
    });
    expect(channel.pendingComment.recipientId).toBe("psid-9");
  });

  test("files the reply under the person Meta named, not the stand-in", async () => {
    callMetaApiMock.mockResolvedValue({ data: { message_id: "mid-1", recipient_id: "psid-9" } });

    await sendSendApiText(onComment(), "fb_comment:comment-1", ORG_ID, "hi");

    expect(handleWaMessagesMock.mock.calls[0][2]).toBe("psid-9");
  });

  test("sends everything after the reply to the person", async () => {
    callMetaApiMock.mockResolvedValue({ data: { message_id: "mid-1", recipient_id: "psid-9" } });
    const channel = onComment();

    await sendSendApiText(channel, "fb_comment:comment-1", ORG_ID, "first");
    await sendSendApiText(channel, "fb_comment:comment-1", ORG_ID, "second");

    expect(callMetaApiMock).toHaveBeenCalledTimes(2);
    expect(callMetaApiMock.mock.calls[1][3]).toEqual({
      recipient: { id: "psid-9" },
      message: { text: "second" },
    });
  });

  test("leaves the comment unanswered when Meta refuses the reply", async () => {
    callMetaApiMock.mockRejectedValue(new Error("comment is over 7 days old"));
    const channel = onComment();

    await expect(sendSendApiText(channel, "fb_comment:comment-1", ORG_ID, "hi")).rejects.toThrow();
    expect(channel.pendingComment.recipientId).toBeUndefined();
  });
});
