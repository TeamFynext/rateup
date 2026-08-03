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
  // NOTE: pins current behaviour. Only the text and image senders call
  // assertWithinConversationLimit. Video, file, quick reply, generic template,
  // product template and story reply all skip it, so an org past its limit — or on
  // a plan that does not include the channel — can keep sending by using any other
  // message type. The automated-reply engine sends several of these directly.
  // See issues.txt 12.10.
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
    ["a private reply to a comment", () => sendInstagramPrivateReply("comment-1", "hi", IBA_ID)],
  ])("sends %s without checking the conversation limit", async (_label, send) => {
    await send();

    expect(assertLimitMock).not.toHaveBeenCalled();
    expect(callMetaApiMock).toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. sendInstagramImage's orgId is optional and the
  // check is `if (orgId)`, so a caller that omits it skips the gate entirely.
  // Every sibling requires orgId. See issues.txt 12.10.
  test("skips the limit check for an image sent without an org", async () => {
    await sendInstagramImage(IGS_ID, "https://cdn/i.jpg", undefined, undefined, IBA_ID);

    expect(assertLimitMock).not.toHaveBeenCalled();
    expect(callMetaApiMock).toHaveBeenCalled();
  });
});

describe("sendInstagramImage", () => {
  test("sends the image as a reusable attachment", async () => {
    await sendInstagramImage(IGS_ID, "https://cdn/i.jpg", undefined, ORG_ID, IBA_ID);

    expect(lastCall().body).toEqual({
      recipient: { id: IGS_ID },
      message: {
        attachment: { type: "image", payload: { url: "https://cdn/i.jpg", is_reusable: true } },
      },
    });
  });

  test("checks the conversation limit when it is given an org", async () => {
    await sendInstagramImage(IGS_ID, "https://cdn/i.jpg", undefined, ORG_ID, IBA_ID);

    expect(assertLimitMock).toHaveBeenCalledWith(ORG_ID);
  });

  // NOTE: pins current behaviour. A caption is not attached to the image — it goes
  // out as a second, separate text message, so the customer sees two bubbles and
  // the caption can arrive out of order. See issues.txt 12.11.
  test("sends a caption as a second message rather than attaching it", async () => {
    await sendInstagramImage(IGS_ID, "https://cdn/i.jpg", "Our new arrival", ORG_ID, IBA_ID);

    expect(callMetaApiMock).toHaveBeenCalledTimes(2);
    expect(lastCall(1).body).toEqual({
      recipient: { id: IGS_ID },
      message: { text: "Our new arrival" },
    });
  });

  // NOTE: pins current behaviour. The caption send is inside the same try, so its
  // failure is reported as "Error sending image" and rethrown — but the image has
  // already gone out. The caller cannot tell a total failure from a half-sent one.
  // See issues.txt 12.11.
  test("reports the whole send as failed when only the caption failed", async () => {
    callMetaApiMock
      .mockResolvedValueOnce({ data: { message_id: "mid-out-1" } })
      .mockRejectedValueOnce(new Error("graph is down"));

    await expect(
      sendInstagramImage(IGS_ID, "https://cdn/i.jpg", "caption", ORG_ID, IBA_ID),
    ).rejects.toThrow("graph is down");
    expect(callMetaApiMock).toHaveBeenCalledTimes(2);
  });
});

describe("sendInstagramPrivateReply", () => {
  test("addresses the reply to the comment rather than to a user", async () => {
    await sendInstagramPrivateReply("comment-1", "thanks!", IBA_ID);

    expect(lastCall().body).toEqual({
      recipient: { comment_id: "comment-1" },
      message: { text: "thanks!" },
    });
  });

  test("refuses when the account has no Facebook page behind it", async () => {
    getSettingsMock.mockResolvedValue({ ...SETTINGS, fbPageId: null });

    await expect(sendInstagramPrivateReply("comment-1", "hi", IBA_ID)).rejects.toThrow(
      `No Facebook Page ID configured for ibaId ${IBA_ID}`,
    );
    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  test("refuses when the account is not connected", async () => {
    getSettingsMock.mockResolvedValue(null);

    await expect(sendInstagramPrivateReply("comment-1", "hi", IBA_ID)).rejects.toThrow(
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

    expect(updateSettingsMock).toHaveBeenCalledWith("settings-1", {
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
    expect(updateSettingsMock).toHaveBeenCalledWith("settings-1", { instagramIceBreakers: [] });
  });

  test("refuses when the account is not connected", async () => {
    getSettingsMock.mockResolvedValue(null);

    await expect(getInstagramIceBreakers(ORG_ID, IBA_ID)).rejects.toThrow(
      `No Instagram settings found for organization ${ORG_ID}`,
    );
  });

  // NOTE: pins current behaviour. callInstagramMessengerProfileApi already returns
  // response.data, and setInstagramIceBreakers then returns `response.data` again —
  // one unwrap too many, so it resolves to undefined. setInstagramPersistentMenu,
  // which does the same job, returns `response` and is correct. The sync endpoint
  // hands this straight back to the client as its `data`. See issues.txt 12.12.
  test("resolves to nothing at all, having unwrapped Meta's answer twice", async () => {
    callMetaApiMock.mockResolvedValue({ data: { result: "success" } });

    await expect(
      setInstagramIceBreakers([{ question: "Hours?", payload: "HOURS" }], ORG_ID, IBA_ID),
    ).resolves.toBeUndefined();
  });

  // NOTE: pins current behaviour. The cache is filled from `response.ice_breakers`,
  // but the GET returns Meta's messenger_profile envelope, which carries the
  // fields under `data`. So the top-level read finds nothing, `[]` is cached, and
  // every later call takes the cached branch and reports no ice breakers — even
  // though Meta has them. Note the two branches also return different shapes:
  // `{ ice_breakers }` when cached, the raw envelope when not.
  // See issues.txt 12.12.
  test("caches an empty list when Meta's answer nests the field, and returns a different shape", async () => {
    callMetaApiMock.mockResolvedValue({
      data: { data: [{ ice_breakers: [{ question: "Hours?", payload: "HOURS" }] }] },
    });

    const first = await getInstagramIceBreakers(ORG_ID, IBA_ID);

    expect(updateSettingsMock).toHaveBeenCalledWith("settings-1", { instagramIceBreakers: [] });
    expect(first).toEqual({ data: [{ ice_breakers: [{ question: "Hours?", payload: "HOURS" }] }] });
    expect(first).not.toHaveProperty("ice_breakers");
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
    expect(updateSettingsMock).toHaveBeenCalledWith("settings-1", {
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
    expect(updateSettingsMock).toHaveBeenCalledWith("settings-1", {
      instagramPersistentMenu: [],
    });
  });

  // NOTE: same caching gap as the ice breakers above. See issues.txt 12.12.
  test("caches an empty menu when Meta's answer nests the field", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [{ persistent_menu: MENU }] } });

    await getInstagramPersistentMenu(ORG_ID, IBA_ID);

    expect(updateSettingsMock).toHaveBeenCalledWith("settings-1", {
      instagramPersistentMenu: [],
    });
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
