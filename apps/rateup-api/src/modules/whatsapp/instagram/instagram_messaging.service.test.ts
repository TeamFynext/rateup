import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("../settings/wa_settings.service.js", () => ({
  getWaSettingsByIbaId: vi.fn(),
  updateWaSettingsById: vi.fn(),
}));
vi.mock("../whatsappSurvey/wasurvey.auth.js", () => ({
  assertWithinConversationLimit: vi.fn(),
}));
// Every send files itself in the inbox; the real one talks to the database.
vi.mock("../inbox/message/wamessage.controller.js", () => ({ handleWaMessages: vi.fn() }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { callMetaApi } from "../wa_axios.js";
import { getWaSettingsByIbaId, updateWaSettingsById } from "../settings/wa_settings.service.js";
import { assertWithinConversationLimit } from "../whatsappSurvey/wasurvey.auth.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import {
  deleteInstagramIceBreakers,
  deleteInstagramPersistentMenu,
  getInstagramIceBreakers,
  getInstagramMediaPermalink,
  getInstagramMediaPosts,
  getInstagramPersistentMenu,
  getInstagramStories,
  sendInstagramFile,
  sendInstagramGenericTemplate,
  sendInstagramImage,
  sendInstagramPrivateReply,
  sendInstagramProductTemplate,
  sendInstagramQuickReply,
  sendInstagramStoryReply,
  sendInstagramTextMessage,
  sendInstagramVideo,
  setInstagramIceBreakers,
  setInstagramPersistentMenu,
} from "./instagram_messaging.service.js";

type Mock = ReturnType<typeof vi.fn>;

const callMetaApiMock = callMetaApi as unknown as Mock;
const getSettingsMock = getWaSettingsByIbaId as unknown as Mock;
const updateSettingsMock = updateWaSettingsById as unknown as Mock;
const assertLimitMock = assertWithinConversationLimit as unknown as Mock;
const handleWaMessagesMock = handleWaMessages as unknown as Mock;

const IBA_ID = "iba-1";
const IGS_ID = "igs-1";
const ORG_ID = "org-1";

const SETTINGS: {
  id: string;
  orgId: string;
  ibaId: string;
  fbPageId: string;
  pageAccessToken: string;
  instagramIceBreakers: unknown;
  instagramPersistentMenu: unknown;
} = {
  id: "settings-1",
  orgId: ORG_ID,
  ibaId: IBA_ID,
  fbPageId: "page-1",
  pageAccessToken: "page-token-abc",
  instagramIceBreakers: null,
  instagramPersistentMenu: null,
};

/** The url, method, token and body handed to the Graph API. */
function lastCall(index = 0) {
  const [url, method, token, body, , , params] = callMetaApiMock.mock.calls[index];
  return { url, method, token, body, params };
}

beforeEach(() => {
  vi.clearAllMocks();
  getSettingsMock.mockResolvedValue(SETTINGS);
  updateSettingsMock.mockResolvedValue({});
  assertLimitMock.mockResolvedValue(undefined);
  callMetaApiMock.mockResolvedValue({ data: { message_id: "mid-out-1" } });
  handleWaMessagesMock.mockResolvedValue(undefined);
});

/** The positional arguments handleWaMessages was called with. */
function storedMessage(index = 0) {
  const [type, body, from, orgId, platform, sourceIdentifier, , messageId, , , , messageType] =
    handleWaMessagesMock.mock.calls[index];
  return { type, body, from, orgId, platform, sourceIdentifier, messageId, messageType };
}

// Before this, an automation's reply reached the customer and then vanished: the
// send helpers talked to Meta and nothing else, so the ticket showed only the
// customer's side.
describe("filing sent messages in the inbox", () => {
  test("stores a text message against the contact it went to", async () => {
    await sendInstagramTextMessage(IGS_ID, "hello", ORG_ID, IBA_ID);

    expect(storedMessage()).toMatchObject({
      type: "send",
      from: IGS_ID,
      orgId: ORG_ID,
      platform: PlatformType.INSTAGRAM,
      sourceIdentifier: IBA_ID,
      messageId: "mid-out-1",
      messageType: "AUTOMATED",
    });
    expect(storedMessage().body).toEqual({
      recipient: { id: IGS_ID },
      message: { text: "hello" },
    });
  });

  // A private reply is addressed to a comment, not a person, so the contact it
  // belongs to has to come from somewhere else.
  test("files a private reply against the commenter Meta names", async () => {
    callMetaApiMock.mockResolvedValue({
      data: { message_id: "mid-out-1", recipient_id: "igs-from-meta" },
    });

    await sendInstagramPrivateReply("comment-1", "hi", IBA_ID, ORG_ID);

    expect(storedMessage().from).toBe("igs-from-meta");
  });

  test("prefers the commenter the caller already knows over Meta's answer", async () => {
    callMetaApiMock.mockResolvedValue({
      data: { message_id: "mid-out-1", recipient_id: "igs-from-meta" },
    });

    await sendInstagramPrivateReply("comment-1", "hi", IBA_ID, ORG_ID, IGS_ID);

    expect(storedMessage().from).toBe(IGS_ID);
  });

  test("stores nothing when neither the caller nor Meta names a recipient", async () => {
    callMetaApiMock.mockResolvedValue({ data: { message_id: "mid-out-1" } });

    await sendInstagramPrivateReply("comment-1", "hi", IBA_ID, ORG_ID);

    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  // The message is already delivered; reporting it as failed would be the worse lie.
  test("still reports the send as successful when the message cannot be stored", async () => {
    handleWaMessagesMock.mockRejectedValue(new Error("db down"));

    await expect(sendInstagramTextMessage(IGS_ID, "hello", ORG_ID, IBA_ID)).resolves.toBeDefined();
  });

  test("files an image and its caption as the two messages they are", async () => {
    await sendInstagramImage(IGS_ID, "https://cdn/i.jpg", ORG_ID, IBA_ID, "Our new arrival");

    expect(handleWaMessagesMock).toHaveBeenCalledTimes(2);
    expect(storedMessage(1).body).toEqual({
      recipient: { id: IGS_ID },
      message: { text: "Our new arrival" },
    });
  });
});

describe("sendInstagramTextMessage", () => {
  test("sends the text to the Instagram-scoped id with the page token", async () => {
    await sendInstagramTextMessage(IGS_ID, "hello", ORG_ID, IBA_ID);

    const { url, method, token, body } = lastCall();
    expect(url).toBe("/me/messages");
    expect(method).toBe("POST");
    expect(token).toBe("page-token-abc");
    expect(body).toEqual({ recipient: { id: IGS_ID }, message: { text: "hello" } });
  });

  test("returns what Meta sends back", async () => {
    await expect(sendInstagramTextMessage(IGS_ID, "hello", ORG_ID, IBA_ID)).resolves.toEqual({
      message_id: "mid-out-1",
    });
  });

  test("checks the org's conversation limit before sending", async () => {
    await sendInstagramTextMessage(IGS_ID, "hello", ORG_ID, IBA_ID);

    expect(assertLimitMock).toHaveBeenCalledWith(ORG_ID);
  });

  test("does not send when the org is over its conversation limit", async () => {
    assertLimitMock.mockRejectedValue(new Error("conversation limit reached"));

    await expect(sendInstagramTextMessage(IGS_ID, "hello", ORG_ID, IBA_ID)).rejects.toThrow(
      "conversation limit reached",
    );
    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  test("refuses when the account is not connected", async () => {
    getSettingsMock.mockResolvedValue(null);

    await expect(sendInstagramTextMessage(IGS_ID, "hello", ORG_ID, IBA_ID)).rejects.toThrow(
      `No Instagram settings found for organization ${ORG_ID}`,
    );
  });

  test("passes a Meta failure on to the caller", async () => {
    callMetaApiMock.mockRejectedValue(new Error("graph is down"));

    await expect(sendInstagramTextMessage(IGS_ID, "hello", ORG_ID, IBA_ID)).rejects.toThrow(
      "graph is down",
    );
  });
});

describe("the conversation limit, across every kind of message", () => {
  test.each([
    ["a video", () => sendInstagramVideo(IGS_ID, "https://cdn/v.mp4", ORG_ID, IBA_ID)],
    ["a file", () => sendInstagramFile(IGS_ID, "https://cdn/f.pdf", ORG_ID, IBA_ID)],
    [
      "a quick reply",
      () =>
        sendInstagramQuickReply(
          IGS_ID,
          "Pick one",
          [{ content_type: "text", title: "A", payload: "A" }],
          ORG_ID,
          IBA_ID,
        ),
    ],
    [
      "a generic template",
      () => sendInstagramGenericTemplate(IGS_ID, [{ title: "Card" }], ORG_ID, IBA_ID),
    ],
    ["a product template", () => sendInstagramProductTemplate(IGS_ID, ["sku-1"], ORG_ID, IBA_ID)],
    ["a story reply", () => sendInstagramStoryReply(IGS_ID, "story-1", "nice", ORG_ID, IBA_ID)],
    [
      "a private reply to a comment",
      () => sendInstagramPrivateReply("comment-1", "hi", IBA_ID, ORG_ID),
    ],
    ["an image", () => sendInstagramImage(IGS_ID, "https://cdn/i.jpg", ORG_ID, IBA_ID)],
    ["a text message", () => sendInstagramTextMessage(IGS_ID, "hi", ORG_ID, IBA_ID)],
  ])("checks the conversation limit before sending %s", async (_label, send) => {
    await send();

    expect(assertLimitMock).toHaveBeenCalledWith(ORG_ID);
    expect(callMetaApiMock).toHaveBeenCalled();
  });

  test.each([
    ["a video", () => sendInstagramVideo(IGS_ID, "https://cdn/v.mp4", ORG_ID, IBA_ID)],
    ["an image", () => sendInstagramImage(IGS_ID, "https://cdn/i.jpg", ORG_ID, IBA_ID)],
    [
      "a private reply to a comment",
      () => sendInstagramPrivateReply("comment-1", "hi", IBA_ID, ORG_ID),
    ],
  ])("sends nothing when the org is over its limit, for %s", async (_label, send) => {
    assertLimitMock.mockRejectedValue(new Error("Conversation limit reached"));

    await expect(send()).rejects.toThrow("Conversation limit reached");
    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  test("requires an org for an image, like every other sender", async () => {
    await sendInstagramImage(IGS_ID, "https://cdn/i.jpg", ORG_ID, IBA_ID);

    expect(assertLimitMock).toHaveBeenCalledWith(ORG_ID);
  });
});

describe("sendInstagramImage", () => {
  test("sends the image as a reusable attachment", async () => {
    await sendInstagramImage(IGS_ID, "https://cdn/i.jpg", ORG_ID, IBA_ID);

    expect(lastCall().body).toEqual({
      recipient: { id: IGS_ID },
      message: {
        attachment: { type: "image", payload: { url: "https://cdn/i.jpg", is_reusable: true } },
      },
    });
  });

  test("checks the conversation limit", async () => {
    await sendInstagramImage(IGS_ID, "https://cdn/i.jpg", ORG_ID, IBA_ID);

    expect(assertLimitMock).toHaveBeenCalledWith(ORG_ID);
  });

  test("sends a caption as a second message, which is all Instagram allows", async () => {
    await sendInstagramImage(IGS_ID, "https://cdn/i.jpg", ORG_ID, IBA_ID, "Our new arrival");

    expect(callMetaApiMock).toHaveBeenCalledTimes(2);
    expect(lastCall(1).body).toEqual({
      recipient: { id: IGS_ID },
      message: { text: "Our new arrival" },
    });
  });

  test("reports the image as sent and the caption as failed, separately", async () => {
    callMetaApiMock
      .mockResolvedValueOnce({ data: { message_id: "mid-out-1" } })
      .mockRejectedValueOnce(new Error("graph is down"));

    const result = await sendInstagramImage(IGS_ID, "https://cdn/i.jpg", ORG_ID, IBA_ID, "caption");

    expect(result.image).toEqual({ message_id: "mid-out-1" });
    expect(result.caption?.sent).toBe(false);
    expect(callMetaApiMock).toHaveBeenCalledTimes(2);
  });

  test("reports the caption as sent when both halves succeed", async () => {
    const result = await sendInstagramImage(IGS_ID, "https://cdn/i.jpg", ORG_ID, IBA_ID, "caption");

    expect(result.caption).toEqual({ sent: true });
  });

  test("reports no caption at all when none was asked for", async () => {
    const result = await sendInstagramImage(IGS_ID, "https://cdn/i.jpg", ORG_ID, IBA_ID);

    expect(result.caption).toBeUndefined();
  });

  test("still fails outright when the image itself fails", async () => {
    callMetaApiMock.mockRejectedValue(new Error("graph is down"));

    await expect(
      sendInstagramImage(IGS_ID, "https://cdn/i.jpg", ORG_ID, IBA_ID, "caption"),
    ).rejects.toThrow("graph is down");
  });
});

describe("sendInstagramPrivateReply", () => {
  test("addresses the reply to the comment rather than to a user", async () => {
    await sendInstagramPrivateReply("comment-1", "thanks!", IBA_ID, ORG_ID);

    expect(lastCall().body).toEqual({
      recipient: { comment_id: "comment-1" },
      message: { text: "thanks!" },
    });
  });

  test("refuses when the account has no Facebook page behind it", async () => {
    getSettingsMock.mockResolvedValue({ ...SETTINGS, fbPageId: null });

    await expect(sendInstagramPrivateReply("comment-1", "hi", IBA_ID, ORG_ID)).rejects.toThrow(
      `No Facebook Page ID configured for ibaId ${IBA_ID}`,
    );
    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  test("refuses when the account is not connected", async () => {
    getSettingsMock.mockResolvedValue(null);

    await expect(sendInstagramPrivateReply("comment-1", "hi", IBA_ID, ORG_ID)).rejects.toThrow(
      `No Instagram settings found for ibaId ${IBA_ID}`,
    );
  });
});

describe("the remaining message shapes", () => {
  test("sends a quick reply with its options", async () => {
    await sendInstagramQuickReply(
      IGS_ID,
      "Pick one",
      [{ content_type: "text", title: "Yes", payload: "Y" }],
      ORG_ID,
      IBA_ID,
    );

    expect(lastCall().body.message).toEqual({
      text: "Pick one",
      quick_replies: [{ content_type: "text", title: "Yes", payload: "Y", image_url: undefined }],
    });
  });

  test("fills in the blanks a generic template card leaves out", async () => {
    await sendInstagramGenericTemplate(IGS_ID, [{ title: "Card" }], ORG_ID, IBA_ID);

    expect(lastCall().body.message.attachment.payload.elements[0]).toEqual({
      title: "Card",
      subtitle: "",
      image_url: "",
      buttons: [],
    });
  });

  test("sends a product template as a list of product ids", async () => {
    await sendInstagramProductTemplate(IGS_ID, ["sku-1", "sku-2"], ORG_ID, IBA_ID);

    expect(lastCall().body.message.attachment.payload).toEqual({
      template_type: "product",
      elements: [{ id: "sku-1" }, { id: "sku-2" }],
    });
  });

  test("sends a story reply carrying both the text and the story it answers", async () => {
    await sendInstagramStoryReply(IGS_ID, "story-1", "love it", ORG_ID, IBA_ID);

    expect(lastCall().body.message).toEqual({
      text: "love it",
      attachment: { type: "story_mention", payload: { id: "story-1" } },
    });
  });

  test("sends a video as a reusable attachment", async () => {
    await sendInstagramVideo(IGS_ID, "https://cdn/v.mp4", ORG_ID, IBA_ID);

    expect(lastCall().body.message.attachment.type).toBe("video");
  });

  test("sends a file as a reusable attachment", async () => {
    await sendInstagramFile(IGS_ID, "https://cdn/f.pdf", ORG_ID, IBA_ID);

    expect(lastCall().body.message.attachment.type).toBe("file");
  });
});

describe("ice breakers", () => {
  test("sends the questions to the Instagram messenger profile", async () => {
    await setInstagramIceBreakers([{ question: "Hours?", payload: "HOURS" }], ORG_ID, IBA_ID);

    const { url, method, body } = lastCall();
    expect(url).toBe("/me/messenger_profile?platform=instagram");
    expect(method).toBe("POST");
    expect(body).toEqual({ ice_breakers: [{ question: "Hours?", payload: "HOURS" }] });
  });

  test("keeps a local copy of what was sent", async () => {
    const iceBreakers = [{ question: "Hours?", payload: "HOURS" }];

    await setInstagramIceBreakers(iceBreakers, ORG_ID, IBA_ID);

    expect(updateSettingsMock).toHaveBeenCalledWith("settings-1", ORG_ID, {
      instagramIceBreakers: iceBreakers,
    });
  });

  test("returns the cached copy without calling Meta when there is one", async () => {
    getSettingsMock.mockResolvedValue({
      ...SETTINGS,
      instagramIceBreakers: [{ question: "Hours?", payload: "HOURS" }],
    });

    await expect(getInstagramIceBreakers(ORG_ID, IBA_ID)).resolves.toEqual({
      ice_breakers: [{ question: "Hours?", payload: "HOURS" }],
    });
    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  test("asks Meta only for the ice breaker field when nothing is cached", async () => {
    callMetaApiMock.mockResolvedValue({ data: { ice_breakers: [] } });

    await getInstagramIceBreakers(ORG_ID, IBA_ID);

    expect(lastCall().params).toEqual({ fields: "ice_breakers" });
  });

  test("clears both Meta's copy and ours on a delete", async () => {
    await deleteInstagramIceBreakers(ORG_ID, IBA_ID);

    expect(lastCall().method).toBe("DELETE");
    expect(lastCall().body).toEqual({ fields: ["ice_breakers"] });
    expect(updateSettingsMock).toHaveBeenCalledWith("settings-1", ORG_ID, {
      instagramIceBreakers: [],
    });
  });

  test("refuses when the account is not connected", async () => {
    getSettingsMock.mockResolvedValue(null);

    await expect(getInstagramIceBreakers(ORG_ID, IBA_ID)).rejects.toThrow(
      `No Instagram settings found for organization ${ORG_ID}`,
    );
  });

  test("reports what Meta answered, unwrapped exactly once", async () => {
    callMetaApiMock.mockResolvedValue({ data: { result: "success" } });

    await expect(
      setInstagramIceBreakers([{ question: "Hours?", payload: "HOURS" }], ORG_ID, IBA_ID),
    ).resolves.toEqual({ result: "success" });
  });

  test("caches what Meta actually returned, out of the nested envelope", async () => {
    const ICE = [{ question: "Hours?", payload: "HOURS" }];
    callMetaApiMock.mockResolvedValue({ data: { data: [{ ice_breakers: ICE }] } });

    const first = await getInstagramIceBreakers(ORG_ID, IBA_ID);

    expect(updateSettingsMock).toHaveBeenCalledWith("settings-1", ORG_ID, {
      instagramIceBreakers: ICE,
    });
    expect(first).toEqual({ ice_breakers: ICE });
  });

  test("returns the same shape whether or not the answer came from the cache", async () => {
    const ICE = [{ question: "Hours?", payload: "HOURS" }];
    callMetaApiMock.mockResolvedValue({ data: { data: [{ ice_breakers: ICE }] } });

    const fetched = await getInstagramIceBreakers(ORG_ID, IBA_ID);

    getSettingsMock.mockResolvedValue({ ...SETTINGS, instagramIceBreakers: ICE });
    const cached = await getInstagramIceBreakers(ORG_ID, IBA_ID);

    expect(fetched).toEqual(cached);
  });

  // A bare top-level field is accepted too, in case Meta answers that way.
  test("also reads the field when Meta puts it at the top level", async () => {
    const ICE = [{ question: "Hours?", payload: "HOURS" }];
    callMetaApiMock.mockResolvedValue({ data: { ice_breakers: ICE } });

    await expect(getInstagramIceBreakers(ORG_ID, IBA_ID)).resolves.toEqual({ ice_breakers: ICE });
  });
});

describe("the persistent menu", () => {
  const MENU = [
    {
      locale: "default",
      call_to_actions: [{ type: "postback" as const, title: "Shop", payload: "S" }],
    },
  ];

  test("sends the menu to the Instagram messenger profile and keeps a local copy", async () => {
    await setInstagramPersistentMenu(MENU, ORG_ID, IBA_ID);

    expect(lastCall().body).toEqual({ persistent_menu: MENU });
    expect(updateSettingsMock).toHaveBeenCalledWith("settings-1", ORG_ID, {
      instagramPersistentMenu: MENU,
    });
  });

  test("returns Meta's answer, unlike its ice-breaker counterpart", async () => {
    callMetaApiMock.mockResolvedValue({ data: { result: "success" } });

    await expect(setInstagramPersistentMenu(MENU, ORG_ID, IBA_ID)).resolves.toEqual({
      result: "success",
    });
  });

  test("returns the cached menu without calling Meta when there is one", async () => {
    getSettingsMock.mockResolvedValue({ ...SETTINGS, instagramPersistentMenu: MENU });

    await expect(getInstagramPersistentMenu(ORG_ID, IBA_ID)).resolves.toEqual({
      persistent_menu: MENU,
    });
    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  test("clears both Meta's copy and ours on a delete", async () => {
    await deleteInstagramPersistentMenu(ORG_ID, IBA_ID);

    expect(lastCall().method).toBe("DELETE");
    expect(updateSettingsMock).toHaveBeenCalledWith("settings-1", ORG_ID, {
      instagramPersistentMenu: [],
    });
  });

  test("caches the menu Meta actually returned, out of the nested envelope", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [{ persistent_menu: MENU }] } });

    const result = await getInstagramPersistentMenu(ORG_ID, IBA_ID);

    expect(updateSettingsMock).toHaveBeenCalledWith("settings-1", ORG_ID, {
      instagramPersistentMenu: MENU,
    });
    expect(result).toEqual({ persistent_menu: MENU });
  });
});

describe("reading the account's own posts and stories", () => {
  test("lists the most recent media with the fields the picker shows", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [{ id: "media-1" }] } });

    await expect(getInstagramMediaPosts(IBA_ID)).resolves.toEqual([{ id: "media-1" }]);

    const { url, token } = lastCall();
    expect(url).toContain(`/${IBA_ID}/media?`);
    expect(url).toContain("permalink");
    expect(url).toContain("limit=50");
    expect(token).toBe("page-token-abc");
  });

  // The comment webhook carries only the media's numeric id, and an
  // instagram.com/p/ URL needs the shortcode, so the link has to come from Meta.
  test("reads the public permalink for one post", async () => {
    callMetaApiMock.mockResolvedValue({
      data: { id: "media-1", permalink: "https://www.instagram.com/p/ABC123/" },
    });

    await expect(getInstagramMediaPermalink("media-1", IBA_ID)).resolves.toBe(
      "https://www.instagram.com/p/ABC123/",
    );

    const { url, token } = lastCall();
    expect(url).toContain("/media-1?");
    expect(url).toContain("permalink");
    expect(token).toBe("page-token-abc");
  });

  test("reports no permalink for a post that has been deleted", async () => {
    callMetaApiMock.mockResolvedValue({ data: { id: "media-1" } });

    await expect(getInstagramMediaPermalink("media-1", IBA_ID)).resolves.toBeNull();
  });

  test("lists the account's live stories", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [{ id: "story-1" }] } });

    await expect(getInstagramStories(IBA_ID)).resolves.toEqual([{ id: "story-1" }]);
    expect(lastCall().url).toContain(`/${IBA_ID}/stories?`);
  });

  test("reports nothing rather than throwing when Meta returns no list", async () => {
    callMetaApiMock.mockResolvedValue({ data: {} });

    await expect(getInstagramMediaPosts(IBA_ID)).resolves.toEqual([]);
    await expect(getInstagramStories(IBA_ID)).resolves.toEqual([]);
  });

  test("refuses when the account has no page token", async () => {
    getSettingsMock.mockResolvedValue({ ...SETTINGS, pageAccessToken: null });

    await expect(getInstagramMediaPosts(IBA_ID)).rejects.toThrow(
      `No Instagram settings found for ibaId ${IBA_ID}`,
    );
  });
});
