import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

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
// The send gate looks the contact up; nobody is blocked here.
vi.mock("../../../utils/prisma.js", () => ({
  default: { contact: { findFirst: vi.fn().mockResolvedValue(null) } },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { callMetaApi } from "../wa_axios.js";
import { getInstagramChannel, getMessengerChannel } from "../metaChannel/metaChannel.service.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { PlatformType } from "../../../generated/prisma/enums.js";
import {
  buildMultiImageMessage,
  chunk,
  sendSendApiImages,
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

describe("several images in one message", () => {
  const INSTAGRAM: MetaFlowChannel = { platform: PlatformType.INSTAGRAM, accountId: "iba-1" };

  test("builds one message from attachment ids and urls, in order", () => {
    expect(
      buildMultiImageMessage([
        { url: "https://x/1.png", attachment_id: "a1" },
        { url: "https://x/2.png" },
      ]),
    ).toEqual({
      attachments: [
        { type: "image", payload: { attachment_id: "a1", url: "https://x/1.png" } },
        { type: "image", payload: { url: "https://x/2.png", is_reusable: true } },
      ],
    });
  });

  test("chunks into runs of at most ten", () => {
    const runs = chunk(
      Array.from({ length: 23 }, (_, i) => i),
      10,
    );
    expect(runs.map((run) => run.length)).toEqual([10, 10, 3]);
    expect(runs[2]).toEqual([20, 21, 22]);
  });

  test("uploads each image, then sends one message of attachment ids", async () => {
    callMetaApiMock.mockImplementation(
      async (url: string, _m: string, _t: string, body: unknown) => {
        if (url === "/me/message_attachments") {
          const imageUrl = (body as { message: { attachment: { payload: { url: string } } } })
            .message.attachment.payload.url;
          return { data: { attachment_id: `id:${imageUrl}` } };
        }
        return { data: { message_id: "mid-album" } };
      },
    );

    await sendSendApiImages(INSTAGRAM, "igsid-1", ORG_ID, ["u1", "u2"], {
      userId: "user-1",
      replyToMid: "mid-quoted",
    });

    const uploads = callMetaApiMock.mock.calls.filter(([url]) => url === "/me/message_attachments");
    expect(uploads).toHaveLength(2);
    expect(uploads[0][3]).toMatchObject({ platform: "instagram" });

    const [, , , body] = callMetaApiMock.mock.calls.find(([url]) => url === "/me/messages")!;
    expect(body).toMatchObject({
      recipient: { id: "igsid-1" },
      reply_to: { mid: "mid-quoted" },
      message: {
        attachments: [
          { type: "image", payload: { attachment_id: "id:u1" } },
          { type: "image", payload: { attachment_id: "id:u2" } },
        ],
      },
    });
    // Stored with the urls, so the inbox can draw the images.
    const filed = handleWaMessagesMock.mock.calls[0];
    expect(filed[1]).toMatchObject({
      message: {
        attachments: [
          { payload: { attachment_id: "id:u1", url: "u1" } },
          { payload: { attachment_id: "id:u2", url: "u2" } },
        ],
      },
    });
    // Filed as the agent's inbox reply, not as an automation.
    expect(filed[8]).toBe("user-1");
    expect(filed[11]).toBe("INBOX");
    expect(filed[12]).toBe(false);
  });

  test("falls back to the url when an upload fails", async () => {
    callMetaApiMock.mockImplementation(async (url: string) => {
      if (url === "/me/message_attachments") throw new Error("upload refused");
      return { data: { message_id: "mid-album" } };
    });

    await sendSendApiImages(INSTAGRAM, "igsid-1", ORG_ID, ["u1", "u2"]);

    const [, , , body] = callMetaApiMock.mock.calls.find(([url]) => url === "/me/messages")!;
    expect((body as { message: unknown }).message).toEqual(
      buildMultiImageMessage([{ url: "u1" }, { url: "u2" }]),
    );
  });
});
