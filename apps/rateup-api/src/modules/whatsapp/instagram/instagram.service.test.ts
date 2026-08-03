import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("../settings/wa_settings.service.js", () => ({
  getWaSettingsByIbaId: vi.fn(),
  getWaSettingsById: vi.fn(),
}));
vi.mock("../inbox/message/wamessage.service.js", () => ({
  updateWaMessageByMessageId: vi.fn(),
}));
vi.mock("../inbox/message/wamessage.controller.js", () => ({ handleWaMessages: vi.fn() }));
vi.mock("../automatedReply/wa_automatedReply.utils.js", () => ({
  checkAndExecuteRuleByTriggerEvent: vi.fn(),
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { callMetaApi } from "../wa_axios.js";
import { getWaSettingsByIbaId, getWaSettingsById } from "../settings/wa_settings.service.js";
import { updateWaMessageByMessageId } from "../inbox/message/wamessage.service.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { checkAndExecuteRuleByTriggerEvent } from "../automatedReply/wa_automatedReply.utils.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { InstagramEvent } from "../../../types/enums.js";
import {
  getFbPages,
  getIgUserDetailsFromMeta,
  handleInstagramComment,
  handleInstagramMessageReaction,
  handleInstagramMessageSeen,
  handleInstagramMessages,
  handleInstagramPostback,
  handleInstagramReferral,
  handleInstagramWebhook,
} from "./instagram.service.js";

type Mock = ReturnType<typeof vi.fn>;

const callMetaApiMock = callMetaApi as unknown as Mock;
const getSettingsByIbaIdMock = getWaSettingsByIbaId as unknown as Mock;
const getSettingsByIdMock = getWaSettingsById as unknown as Mock;
const updateByMessageIdMock = updateWaMessageByMessageId as unknown as Mock;
const handleWaMessagesMock = handleWaMessages as unknown as Mock;
const runRuleMock = checkAndExecuteRuleByTriggerEvent as unknown as Mock;

const IBA_ID = "iba-1";
const IGS_ID = "igs-1";
const ORG_ID = "org-1";

const SETTINGS = { orgId: ORG_ID, ibaId: IBA_ID, pageAccessToken: "page-token-abc" };

/** One entry in the `messaging` array Meta posts to the Instagram webhook. */
function messaging(overrides: Record<string, unknown> = {}): any {
  return {
    sender: { id: IGS_ID },
    recipient: { id: IBA_ID },
    timestamp: 1_700_000_000_000,
    ...overrides,
  };
}

/** A whole webhook body wrapping one or more messaging events on a single entry. */
function webhook(...msgs: any[]): any {
  return { object: "instagram", entry: [{ id: IBA_ID, time: 1, messaging: msgs }] };
}

/** The positional arguments handleWaMessages was called with. */
function waMessageCall(index = 0) {
  const [type, body, from, orgId, platform, sourceIdentifier, userName, messageId] =
    handleWaMessagesMock.mock.calls[index];
  return { type, body, from, orgId, platform, sourceIdentifier, userName, messageId };
}

beforeEach(() => {
  vi.clearAllMocks();
  getSettingsByIbaIdMock.mockResolvedValue(SETTINGS);
  getSettingsByIdMock.mockResolvedValue({ accessToken: "user-token-abc" });
  handleWaMessagesMock.mockResolvedValue(undefined);
  runRuleMock.mockResolvedValue(undefined);
  updateByMessageIdMock.mockResolvedValue(null);
  callMetaApiMock.mockResolvedValue({ data: { data: [] } });
});

describe("getIgUserDetailsFromMeta", () => {
  test("returns the profile Meta sends back", async () => {
    callMetaApiMock.mockResolvedValue({
      data: { name: "Ada", username: "ada", follower_count: 12 },
    });

    await expect(getIgUserDetailsFromMeta(IGS_ID, IBA_ID)).resolves.toMatchObject({
      username: "ada",
    });
  });

  test("asks Meta for the profile fields the inbox shows", async () => {
    await getIgUserDetailsFromMeta(IGS_ID, IBA_ID);

    const [url] = callMetaApiMock.mock.calls[0];
    expect(url).toContain(`/${IGS_ID}?`);
    expect(url).toContain("username");
    expect(url).toContain("follower_count");
  });

  // NOTE: pins current behaviour, same shape as the Facebook case in issues.txt 10.4.
  // Every other Meta call in this module passes the token as callMetaApi's third
  // argument, which becomes an Authorization header; here it is interpolated into
  // the URL, which callMetaApi trace-logs and dumps in full on any non-2xx.
  // See issues.txt 12.7.
  test("puts the page access token in the query string rather than the auth header", async () => {
    await getIgUserDetailsFromMeta(IGS_ID, IBA_ID);

    const [url, , token] = callMetaApiMock.mock.calls[0];
    expect(url).toContain("access_token=page-token-abc");
    expect(token).toBeUndefined();
  });

  // Fixed during the TS strict-mode migration: the settings lookup used to be
  // destructured with no null check, throwing a bare TypeError. It now refuses
  // with a named error, matching getFacebookUserDetailsFromMeta.
  test("throws a named error when the account is not connected to any org", async () => {
    getSettingsByIbaIdMock.mockResolvedValue(null);

    await expect(getIgUserDetailsFromMeta(IGS_ID, IBA_ID)).rejects.toThrow(
      `No Instagram settings found for ibaId ${IBA_ID}`,
    );
  });
});

describe("handleInstagramWebhook - routing an event to its handler", () => {
  test("hands a plain message to the message handler and runs the reply rules", async () => {
    await handleInstagramWebhook(webhook(messaging({ message: { mid: "mid-1", text: "hi" } })));

    expect(waMessageCall().messageId).toBe("mid-1");
    expect(runRuleMock.mock.calls[0][0]).toBe("MESSAGE_RECEIVED");
  });

  test("stores a button tap as a received message", async () => {
    await handleInstagramWebhook(webhook(messaging({ postback: { payload: "TRACK" } })));

    expect(waMessageCall().body).toMatchObject({ type: "postback", payload: "TRACK" });
  });

  test("stores an ad click as a referral", async () => {
    await handleInstagramWebhook(
      webhook(messaging({ message: { mid: "mid-1", referral: { ref: "promo" } } })),
    );

    expect(waMessageCall().body).toMatchObject({ type: "referral" });
  });

  test("stores a story mention and runs the story-mention rules", async () => {
    await handleInstagramWebhook(
      webhook(
        messaging({
          message: {
            mid: "mid-1",
            attachments: [{ type: "story_mention", payload: { url: "https://cdn/story.jpg" } }],
          },
        }),
      ),
    );

    expect(runRuleMock.mock.calls[0][0]).toBe("INSTAGRAM_STORY_MENTION");
    expect(runRuleMock.mock.calls[0][1].instagramMediaId).toBe("https://cdn/story.jpg");
  });

  test("marks a message read on a read receipt", async () => {
    await handleInstagramWebhook(webhook(messaging({ read: { mid: "mid-1" } })));

    expect(updateByMessageIdMock.mock.calls[0][0]).toBe("mid-1");
  });

  test("stores a reaction as a received message", async () => {
    await handleInstagramWebhook(
      webhook(messaging({ reaction: { mid: "mid-1", action: "react", emoji: "❤️" } })),
    );

    expect(waMessageCall().platform).toBe(PlatformType.INSTAGRAM);
  });

  test("skips an account that is not connected to any org", async () => {
    getSettingsByIbaIdMock.mockResolvedValue(null);

    await handleInstagramWebhook(webhook(messaging({ message: { mid: "mid-1" } })));

    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  test("skips an event it cannot classify", async () => {
    await handleInstagramWebhook(webhook(messaging()));

    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  test("ignores an entry that carries no messaging events at all", async () => {
    const body: any = { object: "instagram", entry: [{ id: IBA_ID, time: 1 }] };

    await expect(handleInstagramWebhook(body)).resolves.toBeUndefined();
    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  test("routes a comment change to the comment handler", async () => {
    const body: any = {
      object: "instagram",
      entry: [
        {
          id: IBA_ID,
          time: 1,
          changes: [
            {
              field: "comments",
              value: {
                id: "comment-1",
                text: "nice",
                from: { id: IGS_ID, username: "ada" },
                created_time: 1_700_000_000,
              },
            },
          ],
        },
      ],
    };

    await handleInstagramWebhook(body);

    expect(waMessageCall().messageId).toBe("ig_comment_comment-1");
    expect(runRuleMock.mock.calls[0][0]).toBe("INSTAGRAM_COMMENT");
  });

  test("ignores a change on a field it does not handle", async () => {
    const body: any = {
      object: "instagram",
      entry: [{ id: IBA_ID, time: 1, changes: [{ field: "mentions", value: {} }] }],
    };

    await expect(handleInstagramWebhook(body)).resolves.toBeUndefined();
    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });
});

describe("handleInstagramWebhook - a batch carrying more than one event", () => {
  // NOTE: pins current behaviour, and this is the significant one. The loop is
  // `for (const messaging of entry.messaging)` and classifies each event
  // individually — but then hands the WHOLE `data` to the handler, and every
  // handler reads data.entry[0].messaging[0]. So the first event is processed once
  // per event in the batch and the rest are never seen.
  // handleFacebookWebhook gets this right: it rebuilds a single-event body per
  // iteration (facebook.service.ts:54-62). handleInstagramStoryMentionRule is the
  // one handler here that takes the per-iteration `messaging`.
  // Meta currently sends one messaging object per entry, so this is latent — but
  // the loop exists precisely because the code expects more than one.
  // See issues.txt 12.1.
  test("processes the first message twice and never sees the second", async () => {
    await handleInstagramWebhook(
      webhook(
        messaging({ message: { mid: "mid-1", text: "one" } }),
        messaging({ message: { mid: "mid-2", text: "two" } }),
      ),
    );

    expect(handleWaMessagesMock).toHaveBeenCalledTimes(2);
    expect(waMessageCall(0).messageId).toBe("mid-1");
    expect(waMessageCall(1).messageId).toBe("mid-1");
    expect(handleWaMessagesMock.mock.calls.map((c) => c[7])).not.toContain("mid-2");
  });

  // NOTE: same root cause (issues.txt 12.1) — the read receipt is classified
  // first and handled correctly; the message is classified second but
  // handleInstagramMessages then reads messaging[0] — the read receipt — whose
  // `message` is undefined. Fixed during the TS strict-mode migration:
  // handleInstagramMessages now guards the possibly-undefined `message` and
  // skips instead of throwing a bare TypeError, so the webhook no longer
  // unwinds — but the underlying "always reads messaging[0]" bug (12.1) is
  // untouched, so the second event is still never actually processed.
  test("skips the second event when the first was a different kind, instead of throwing", async () => {
    await expect(
      handleInstagramWebhook(
        webhook(
          messaging({ read: { mid: "mid-0" } }),
          messaging({ message: { mid: "mid-1", text: "hi" } }),
        ),
      ),
    ).resolves.toBeUndefined();
    // The read receipt (correctly messaging[0]) is processed as a read receipt;
    // the message event re-reads messaging[0] too (bug 12.1) and finds no
    // `message`, so it is skipped rather than stored.
    expect(updateByMessageIdMock.mock.calls[0][0]).toBe("mid-0");
    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. There is no per-entry guard, so a database
  // failure looking one account up abandons every entry after it. Meta has already
  // been answered 200, so nothing is retried. Same shape as issues.txt 10.3.
  // See issues.txt 12.2.
  test("abandons the rest of the batch when one account lookup fails", async () => {
    getSettingsByIbaIdMock.mockRejectedValueOnce(new Error("db down")).mockResolvedValue(SETTINGS);

    const body: any = {
      object: "instagram",
      entry: [
        { id: "iba-a", time: 1, messaging: [messaging({ message: { mid: "mid-1" } })] },
        { id: "iba-b", time: 2, messaging: [messaging({ message: { mid: "mid-2" } })] },
      ],
    };

    await expect(handleInstagramWebhook(body)).rejects.toThrow("db down");
    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. handleWaMessages sits OUTSIDE the try in
  // handleInstagramMessages (line 178 vs the try at 189) — only the rule execution
  // is guarded — so a failed write aborts the batch instead of being logged and
  // stepped over. The comment handler gets this right: it guards both halves
  // separately. See issues.txt 12.2.
  test("abandons the batch when storing a message fails", async () => {
    handleWaMessagesMock.mockRejectedValue(new Error("write failed"));

    await expect(
      handleInstagramWebhook(webhook(messaging({ message: { mid: "mid-1", text: "hi" } }))),
    ).rejects.toThrow("write failed");
  });

  test("carries on when the reply rules fail", async () => {
    runRuleMock.mockRejectedValue(new Error("rule engine down"));

    await expect(
      handleInstagramWebhook(webhook(messaging({ message: { mid: "mid-1", text: "hi" } }))),
    ).resolves.toBeUndefined();
  });
});

describe("handleInstagramMessages", () => {
  test("stores the message against the account's org", async () => {
    await handleInstagramMessages(
      webhook(messaging({ message: { mid: "mid-1", text: "hi" } })),
      SETTINGS,
    );

    const call = waMessageCall();
    expect(call.type).toBe("receive");
    expect(call.from).toBe(IGS_ID);
    expect(call.orgId).toBe(ORG_ID);
    expect(call.platform).toBe(PlatformType.INSTAGRAM);
    expect(call.sourceIdentifier).toBe(IBA_ID);
    expect(call.messageId).toBe("mid-1");
  });

  test("matches the reply rules on the message text", async () => {
    await handleInstagramMessages(
      webhook(messaging({ message: { mid: "mid-1", text: "price?" } })),
      SETTINGS,
    );

    expect(runRuleMock.mock.calls[0][1]).toMatchObject({
      orgId: ORG_ID,
      phoneNumberId: IBA_ID,
      message: "price?",
      phone: IGS_ID,
      platform: "INSTAGRAM",
    });
  });

  test("matches on an empty string for a message with no text", async () => {
    await handleInstagramMessages(webhook(messaging({ message: { mid: "mid-1" } })), SETTINGS);

    expect(runRuleMock.mock.calls[0][1].message).toBe("");
  });

  test("skips an echo of a message the business itself sent", async () => {
    await handleInstagramMessages(
      webhook(messaging({ message: { mid: "mid-1", is_echo: true } })),
      SETTINGS,
    );

    expect(handleWaMessagesMock).not.toHaveBeenCalled();
    expect(runRuleMock).not.toHaveBeenCalled();
  });
});

describe("handleInstagramComment", () => {
  function comment(overrides: Record<string, unknown> = {}): any {
    return {
      id: "comment-1",
      text: "how much?",
      from: { id: IGS_ID, username: "ada" },
      created_time: 1_700_000_000,
      media: { id: "media-1" },
      ...overrides,
    };
  }

  test("stores the comment as a received message shaped like a DM", async () => {
    await handleInstagramComment(comment(), InstagramEvent.COMMENT, SETTINGS);

    expect(waMessageCall().body).toEqual({
      sender: { id: IGS_ID },
      recipient: { id: IBA_ID },
      timestamp: 1_700_000_000_000,
      message: {
        mid: "ig_comment_comment-1",
        text: "how much?",
        comment_id: "comment-1",
        media_id: "media-1",
      },
    });
  });

  test("converts the comment's seconds timestamp to milliseconds", async () => {
    await handleInstagramComment(
      comment({ created_time: 1_700_000_000 }),
      "COMMENT" as any,
      SETTINGS,
    );

    expect(waMessageCall().body.timestamp).toBe(1_700_000_000_000);
  });

  test("runs the comment rules against the post the comment is on", async () => {
    await handleInstagramComment(comment(), InstagramEvent.COMMENT, SETTINGS);

    expect(runRuleMock.mock.calls[0]).toEqual([
      "INSTAGRAM_COMMENT",
      {
        orgId: ORG_ID,
        phoneNumberId: IBA_ID,
        message: "how much?",
        phone: IGS_ID,
        instagramMediaId: "media-1",
        platform: "INSTAGRAM",
      },
    ]);
  });

  test("still runs the rules when storing the comment failed", async () => {
    handleWaMessagesMock.mockRejectedValue(new Error("write failed"));

    await expect(
      handleInstagramComment(comment(), InstagramEvent.COMMENT, SETTINGS),
    ).resolves.toBeUndefined();
    expect(runRuleMock).toHaveBeenCalled();
  });

  test("still reports success when the rules fail", async () => {
    runRuleMock.mockRejectedValue(new Error("rule engine down"));

    await expect(
      handleInstagramComment(comment(), InstagramEvent.COMMENT, SETTINGS),
    ).resolves.toBeUndefined();
  });

  // NOTE: pins current behaviour. Nothing compares the commenter to the business
  // account, so a reply the business posts on its own post arrives back through the
  // webhook, is stored as an inbound message, and runs the INSTAGRAM_COMMENT rules.
  // If one of those rules replies to comments, it answers itself. The DM handlers
  // guard this with message.is_echo; the comment path has no equivalent.
  // See issues.txt 12.4.
  test("stores a comment the business made on its own post and runs the rules on it", async () => {
    await handleInstagramComment(
      comment({ from: { id: IBA_ID, username: "the-business" } }),
      InstagramEvent.COMMENT,
      SETTINGS,
    );

    expect(waMessageCall().from).toBe(IBA_ID);
    expect(runRuleMock).toHaveBeenCalled();
  });
});

describe("handleInstagramPostback", () => {
  test("stores the tapped button and runs the reply rules on its payload", async () => {
    await handleInstagramPostback(
      webhook(messaging({ postback: { title: "Track", payload: "TRACK" } })),
      SETTINGS,
    );

    expect(waMessageCall().body).toMatchObject({ type: "postback", payload: "TRACK" });
    expect(waMessageCall().messageId).toBe("ig_postback_1700000000000");
    expect(runRuleMock.mock.calls[0][1].message).toBe("TRACK");
  });

  test("ignores a postback with no payload", async () => {
    await handleInstagramPostback(webhook(messaging({ postback: { title: "Track" } })), SETTINGS);

    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  test("swallows a storage failure and reports nothing", async () => {
    handleWaMessagesMock.mockRejectedValue(new Error("write failed"));

    await expect(
      handleInstagramPostback(webhook(messaging({ postback: { payload: "TRACK" } })), SETTINGS),
    ).resolves.toBeUndefined();
  });

  // NOTE: pins current behaviour, the same shape as issues.txt 10.2. There is no
  // `sender?.id` guard and the catch block logs `sender.id` — the expression that
  // threw — so the error handler throws out of itself. See issues.txt 12.3.
  test("throws out of its own error handler when there is no sender", async () => {
    const body: any = {
      object: "instagram",
      entry: [
        {
          id: IBA_ID,
          time: 1,
          messaging: [{ recipient: { id: IBA_ID }, timestamp: 1, postback: { payload: "P" } }],
        },
      ],
    };

    await expect(handleInstagramPostback(body, SETTINGS)).rejects.toThrow(TypeError);
  });
});

describe("handleInstagramReferral", () => {
  test("stores an ad referral and matches the rules on its ref", async () => {
    await handleInstagramReferral(
      webhook(messaging({ message: { mid: "mid-1", referral: { ref: "promo", source: "ADS" } } })),
      SETTINGS,
    );

    expect(waMessageCall().body).toMatchObject({ type: "referral" });
    expect(waMessageCall().messageId).toBe("ig_referral_1700000000000");
    expect(runRuleMock.mock.calls[0][1].message).toBe("promo");
  });

  test("matches the rules on the product id for a shop referral", async () => {
    await handleInstagramReferral(
      webhook(messaging({ message: { mid: "mid-1", referral: { product: { id: "sku-1" } } } })),
      SETTINGS,
    );

    expect(runRuleMock.mock.calls[0][1].message).toBe("sku-1");
  });

  test("reads the referral off a postback when it arrived that way", async () => {
    await handleInstagramReferral(
      webhook(messaging({ postback: { payload: "P", referral: { ref: "promo" } } })),
      SETTINGS,
    );

    expect(handleWaMessagesMock).toHaveBeenCalled();
  });

  test("ignores an event carrying no referral", async () => {
    await handleInstagramReferral(
      webhook(messaging({ message: { mid: "mid-1", text: "hi" } })),
      SETTINGS,
    );

    expect(handleWaMessagesMock).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour, the other half of issues.txt 12.5. The stored
  // body carries the referral and nothing else — the text the customer typed
  // alongside their ad click never reaches the inbox or the rule match.
  test("drops the message text that arrived with the referral", async () => {
    await handleInstagramReferral(
      webhook(
        messaging({
          message: { mid: "mid-1", text: "Is this still available?", referral: { ref: "promo" } },
        }),
      ),
      SETTINGS,
    );

    expect(JSON.stringify(waMessageCall().body)).not.toContain("Is this still available?");
    expect(runRuleMock.mock.calls[0][1].message).toBe("promo");
  });
});

describe("handleInstagramMessageSeen", () => {
  test("marks the message the receipt names as read", async () => {
    await handleInstagramMessageSeen(webhook(messaging({ read: { mid: "mid-1" } })));

    expect(updateByMessageIdMock.mock.calls[0][0]).toBe("mid-1");
    expect(updateByMessageIdMock.mock.calls[0][1]).toEqual({
      stats: { read: new Date(1_700_000_000_000).toISOString() },
    });
  });

  // NOTE: pins current behaviour. The read time is taken from the messaging
  // event's own timestamp rather than anything on the receipt, which is close
  // enough — but note there is no watermark handling at all, so only the single
  // named message is marked, never the ones before it. See issues.txt 12.8.
  test("marks only the one named message, ignoring everything before it", async () => {
    await handleInstagramMessageSeen(webhook(messaging({ read: { mid: "mid-5", watermark: 1 } })));

    expect(updateByMessageIdMock).toHaveBeenCalledTimes(1);
  });

  // NOTE: pins current behaviour, and this one reaches other orgs' data. `read.mid`
  // is read with no guard — the type marks it optional — so a receipt carrying only
  // a watermark passes `undefined` to updateWaMessageByMessageId. That builds
  // `where: { messageId: undefined }`, and Prisma drops an undefined filter rather
  // than matching null, so the findFirst behind it is an unfiltered query over the
  // whole WaMessage table. Whichever row comes back first — any org's — is stamped
  // read. See issues.txt 12.8.
  test("asks for a message by an undefined id when the receipt carries no mid", async () => {
    await handleInstagramMessageSeen(webhook(messaging({ read: { watermark: 1 } })));

    expect(updateByMessageIdMock).toHaveBeenCalledTimes(1);
    expect(updateByMessageIdMock.mock.calls[0][0]).toBeUndefined();
  });

  // NOTE: there is no try/catch here either, so a failed update unwinds
  // handleInstagramWebhook and abandons the rest of the batch. See issues.txt 12.2.
  test("abandons the work when the update fails", async () => {
    updateByMessageIdMock.mockRejectedValue(new Error("db down"));

    await expect(
      handleInstagramMessageSeen(webhook(messaging({ read: { mid: "mid-1" } }))),
    ).rejects.toThrow("db down");
  });
});

describe("handleInstagramMessageReaction", () => {
  test("stores the reaction against the account's org", async () => {
    await handleInstagramMessageReaction(
      webhook(messaging({ reaction: { mid: "mid-1", action: "react", emoji: "❤️" } })),
      SETTINGS,
    );

    const call = waMessageCall();
    expect(call.from).toBe(IGS_ID);
    expect(call.orgId).toBe(ORG_ID);
    expect(call.sourceIdentifier).toBe(IBA_ID);
  });

  // NOTE: pins current behaviour. No message id is passed, so the reaction is
  // stored with nothing to deduplicate on — a redelivered webhook stores it twice —
  // and nothing links it back to the message it reacted to, even though
  // reaction.mid names that message. Every sibling handler passes an id.
  // See issues.txt 12.8.
  test("stores the reaction with no message id to identify it by", async () => {
    await handleInstagramMessageReaction(
      webhook(messaging({ reaction: { mid: "mid-1", action: "react", emoji: "❤️" } })),
      SETTINGS,
    );

    expect(waMessageCall().messageId).toBeUndefined();
  });

  // NOTE: pins current behaviour. Unlike handleInstagramMessages there is no echo
  // guard, so a reaction the business itself left is stored as inbound.
  // See issues.txt 12.6.
  test("stores a reaction the business itself left", async () => {
    await handleInstagramMessageReaction(
      webhook(
        messaging({
          sender: { id: IBA_ID },
          reaction: { mid: "mid-1", action: "react" },
          message: { is_echo: true },
        }),
      ),
      SETTINGS,
    );

    expect(waMessageCall().from).toBe(IBA_ID);
  });
});

describe("getFbPages", () => {
  test("reports each connected page with its Instagram account and token", async () => {
    callMetaApiMock.mockResolvedValue({
      data: {
        data: [
          {
            id: "page-1",
            name: "The Shop",
            access_token: "page-token-1",
            instagram_business_account: { id: "iba-1" },
          },
        ],
      },
    });

    await expect(getFbPages("settings-1")).resolves.toEqual([
      {
        fbPageId: "page-1",
        ibaId: "iba-1",
        pageAccessToken: "page-token-1",
        fbPageName: "The Shop",
      },
    ]);
  });

  test("reports nothing for an account with no pages", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [] } });

    await expect(getFbPages("settings-1")).resolves.toEqual([]);
  });

  // NOTE: pins current behaviour. `i.instagram_business_account.id` is read for
  // every page with no guard, and a Facebook page with no Instagram account
  // attached simply has no such field. One unconnected page in the list therefore
  // throws, and the user sees no pages at all rather than the ones that do work.
  // This runs during Instagram onboarding, where having an unconnected page is
  // entirely normal. See issues.txt 12.9.
  test("throws when any one page has no Instagram account attached", async () => {
    callMetaApiMock.mockResolvedValue({
      data: {
        data: [
          {
            id: "page-1",
            name: "Connected",
            access_token: "t1",
            instagram_business_account: { id: "iba-1" },
          },
          { id: "page-2", name: "Not connected", access_token: "t2" },
        ],
      },
    });

    await expect(getFbPages("settings-1")).rejects.toThrow(TypeError);
  });

  // NOTE: same token-in-the-url shape as getIgUserDetailsFromMeta above, but with
  // the org's long-lived user access token rather than a page token — the one that
  // grants access to every page the org connected. See issues.txt 12.7.
  test("puts the user access token in the query string", async () => {
    await getFbPages("settings-1");

    const [url, , token] = callMetaApiMock.mock.calls[0];
    expect(url).toContain("access_token=user-token-abc");
    expect(token).toBeUndefined();
  });
});
