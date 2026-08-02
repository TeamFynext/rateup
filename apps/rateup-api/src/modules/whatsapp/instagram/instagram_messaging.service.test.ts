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
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { callMetaApi } from "../wa_axios.js";
import { getWaSettingsByIbaId, updateWaSettingsById } from "../settings/wa_settings.service.js";
import { assertWithinConversationLimit } from "../whatsappSurvey/wasurvey.auth.js";
import {
  deleteInstagramIceBreakers,
  deleteInstagramPersistentMenu,
  getInstagramIceBreakers,
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
  // Only the text and image senders used to call assertWithinConversationLimit.
  // Video, file, quick reply, generic template, product template, story reply and
  // private reply all skipped it, so an org past its limit — or on a plan that
  // does not include the channel — could keep sending by using any other message
  // type. The automated-reply engine sends several of these directly, so this was
  // a billing and plan-enforcement gap. See issues.txt 12.10.
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

  // sendInstagramImage's orgId and ibaId were optional and the check was
  // `if (orgId)`, so a caller that simply omitted the org skipped the gate. Every
  // sibling required orgId; these now do too, which is why there is no longer an
  // "image sent without an org" case to test. See issues.txt 12.10.
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

  // A caption goes out as a second, separate text message. That is NOT the bug and
  // was not changed: Instagram's send API takes either `text` or `attachment` on a
  // message, not both, so there is no captioned image to attach it to.
  // See issues.txt 12.11.
  test("sends a caption as a second message, which is all Instagram allows", async () => {
    await sendInstagramImage(IGS_ID, "https://cdn/i.jpg", ORG_ID, IBA_ID, "Our new arrival");

    expect(callMetaApiMock).toHaveBeenCalledTimes(2);
    expect(lastCall(1).body).toEqual({
      recipient: { id: IGS_ID },
      message: { text: "Our new arrival" },
    });
  });

  // The caption send used to sit inside the same try, so its failure was reported
  // as "Error sending image" and rethrown — even though the image had already gone
  // out. The caller could not tell a total failure from a half-sent one, and a
  // retry sent the image twice. See issues.txt 12.11.
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

  // callInstagramMessengerProfileApi already returns response.data, and this used
  // to return `response.data` again — one unwrap too many, so it resolved to
  // undefined and the sync endpoint answered { success: true, data: undefined }.
  // setInstagramPersistentMenu, which does the same job, was already correct.
  // See issues.txt 12.12.
  test("reports what Meta answered, unwrapped exactly once", async () => {
    callMetaApiMock.mockResolvedValue({ data: { result: "success" } });

    await expect(
      setInstagramIceBreakers([{ question: "Hours?", payload: "HOURS" }], ORG_ID, IBA_ID),
    ).resolves.toEqual({ result: "success" });
  });

  // The cache was filled from `response.ice_breakers`, but Meta's messenger_profile
  // GET nests the requested fields under `data`. The top-level read found nothing,
  // `[]` was cached, and every later call took the cached branch and reported no
  // ice breakers at all — even though Meta had them. See issues.txt 12.12.
  test("caches what Meta actually returned, out of the nested envelope", async () => {
    const ICE = [{ question: "Hours?", payload: "HOURS" }];
    callMetaApiMock.mockResolvedValue({ data: { data: [{ ice_breakers: ICE }] } });

    const first = await getInstagramIceBreakers(ORG_ID, IBA_ID);

    expect(updateSettingsMock).toHaveBeenCalledWith("settings-1", ORG_ID, {
      instagramIceBreakers: ICE,
    });
    expect(first).toEqual({ ice_breakers: ICE });
  });

  // Both branches return the same shape now. They used to differ —
  // { ice_breakers } when cached, Meta's raw envelope when not — which
  // normalizeIceBreakers in the controller papered over, which is why the
  // empty-cache bug went unnoticed. See issues.txt 12.12.
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

  // Same caching gap as the ice breakers above. See issues.txt 12.12.
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
