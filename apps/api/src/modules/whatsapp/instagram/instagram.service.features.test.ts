import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("../metaChannel/metaChannel.service.js", () => ({
  getInstagramChannel: vi.fn(),
  getMessengerChannel: vi.fn(),
  updateMetaChannelById: vi.fn(),
}));
vi.mock("../inbox/message/wamessage.service.js", () => ({
  updateWaMessageByMessageId: vi.fn(),
}));
vi.mock("../inbox/message/wamessage.controller.js", () => ({ handleWaMessages: vi.fn() }));
vi.mock("../automatedReply/wa_automatedReply.utils.js", () => ({
  checkAndExecuteRuleByTriggerEvent: vi.fn(),
}));
vi.mock("../automatedReply/metaFlow.service.js", () => ({
  handleMetaFlowUserResponse: vi.fn(),
}));
vi.mock("../../org/ws/org.ws.controller.js", () => ({ sendViaWstoOrgHandler: vi.fn() }));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    waMessage: { count: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    conversation: { updateMany: vi.fn() },
    contact: { findUnique: vi.fn() },
    instagramMention: { findFirst: vi.fn() },
  },
}));
vi.mock("./instagram_mentions.service.js", () => ({
  handleInstagramMentionChange: vi.fn(),
  linkPendingInstagramMentions: vi.fn(),
  recordInstagramStoryMention: vi.fn(),
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { getInstagramChannel } from "../metaChannel/metaChannel.service.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { checkAndExecuteRuleByTriggerEvent } from "../automatedReply/wa_automatedReply.utils.js";
import { handleMetaFlowUserResponse } from "../automatedReply/metaFlow.service.js";
import { sendViaWstoOrgHandler } from "../../org/ws/org.ws.controller.js";
import { InstagramEvent } from "../../../types/enums.js";
import { getInstagramWebhookEvent } from "./instagram.util.js";
import {
  handleInstagramMentionChange,
  linkPendingInstagramMentions,
  recordInstagramStoryMention,
} from "./instagram_mentions.service.js";
import {
  AD_THREAD_WINDOW_MS,
  handleInstagramComment,
  handleInstagramMessageEdit,
  handleInstagramMessages,
  handleInstagramWebhook,
} from "./instagram.service.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  waMessage: { count: Mock; findFirst: Mock; update: Mock };
  conversation: { updateMany: Mock };
};
const storeMock = handleWaMessages as unknown as Mock;
const runRuleMock = checkAndExecuteRuleByTriggerEvent as unknown as Mock;
const answerFlowMock = handleMetaFlowUserResponse as unknown as Mock;
const wsMock = sendViaWstoOrgHandler as unknown as Mock;

const IBA_ID = "iba-1";
const IGS_ID = "igs-1";
const ORG_ID = "org-1";
const SETTINGS = { orgId: ORG_ID, ibaId: IBA_ID };
const TIMESTAMP = 1_700_000_000_000;

function messaging(overrides: Record<string, unknown> = {}): any {
  return { sender: { id: IGS_ID }, recipient: { id: IBA_ID }, timestamp: TIMESTAMP, ...overrides };
}
function webhook(...msgs: any[]): any {
  return { object: "instagram", entry: [{ id: IBA_ID, time: 1, messaging: msgs }] };
}
const triggers = () => runRuleMock.mock.calls.map(([trigger]) => trigger);

beforeEach(() => {
  vi.clearAllMocks();
  (getInstagramChannel as unknown as Mock).mockResolvedValue({ orgId: ORG_ID, accountId: IBA_ID });
  storeMock.mockResolvedValue({ id: "row-1", conversationId: "conv-1" });
  runRuleMock.mockResolvedValue(undefined);
  answerFlowMock.mockResolvedValue(false);
  db.waMessage.count.mockResolvedValue(0);
  db.conversation.updateMany.mockResolvedValue({ count: 1 });
});

describe("shared posts and reels", () => {
  test.each([
    ["ig_post", { ig_post_media_id: "m-1", url: "https://cdn/p.jpg", title: "Our new menu" }],
    ["ig_reel", { ig_post_media_id: "m-2", url: "https://cdn/r.mp4", title: "Behind the bar" }],
    ["share", { url: "https://cdn/legacy.jpg" }],
  ])("stores a shared %s as a message with its attachment intact", async (type, payload) => {
    const event = messaging({ message: { mid: "mid-1", attachments: [{ type, payload }] } });

    expect(getInstagramWebhookEvent(event)).toBe(InstagramEvent.MESSAGE);
    await handleInstagramWebhook(webhook(event));

    const [, body] = storeMock.mock.calls[0];
    expect(body.message.attachments).toEqual([{ type, payload }]);
    expect(triggers()).toEqual(["MESSAGE_RECEIVED"]);
  });
});

describe("story replies", () => {
  const storyReply = (text = "GUIDE") =>
    webhook(
      messaging({
        message: {
          mid: "mid-1",
          text,
          reply_to: { story: { id: "story-1", url: "https://cdn/s" } },
        },
      }),
    );

  test("runs the story-reply rules with the story id, and stops there when one fires", async () => {
    runRuleMock.mockResolvedValueOnce({ executed: true });

    await handleInstagramMessages(storyReply(), SETTINGS);

    expect(runRuleMock).toHaveBeenCalledWith(
      "INSTAGRAM_STORY_REPLY",
      expect.objectContaining({ instagramStoryId: "story-1", message: "GUIDE", phone: IGS_ID }),
    );
    expect(triggers()).toEqual(["INSTAGRAM_STORY_REPLY"]);
  });

  test("falls through to the keyword rules when no story rule answers", async () => {
    await handleInstagramMessages(storyReply("hello"), SETTINGS);

    expect(triggers()).toEqual(["INSTAGRAM_STORY_REPLY", "MESSAGE_RECEIVED"]);
  });

  test("lets a running flow take the reply before any story rule", async () => {
    answerFlowMock.mockResolvedValue(true);

    await handleInstagramMessages(storyReply(), SETTINGS);

    expect(runRuleMock).not.toHaveBeenCalled();
  });

  test("runs no story rules for a plain message", async () => {
    await handleInstagramMessages(
      webhook(messaging({ message: { mid: "m", text: "hi" } })),
      SETTINGS,
    );

    expect(triggers()).toEqual(["MESSAGE_RECEIVED"]);
  });
});

describe("ad threads", () => {
  test("opens the longer window for a message from a click-to-Direct ad", async () => {
    const event = messaging({
      message: {
        mid: "m",
        text: "Is this in stock?",
        referral: { ref: "", source: "ADS", type: "OPEN_THREAD", ad_id: "ad-1" },
      },
    });

    await handleInstagramMessages(webhook(event), SETTINGS);

    const [{ where, data }] = db.conversation.updateMany.mock.calls[0];
    expect(where.id).toBe("conv-1");
    expect(data.adThreadUntil).toEqual(new Date(TIMESTAMP + AD_THREAD_WINDOW_MS));
  });

  test("leaves the window alone for an ig.me link", async () => {
    const event = messaging({
      message: {
        mid: "m",
        text: "hi",
        referral: { ref: "promo", source: "SHORTLINKS", type: "OPEN_THREAD" },
      },
    });

    await handleInstagramMessages(webhook(event), SETTINGS);

    expect(db.conversation.updateMany).not.toHaveBeenCalled();
  });
});

describe("post attribution", () => {
  const comment = {
    id: "c-1",
    text: "price?",
    from: { id: IGS_ID, username: "ada" },
    media: { id: "media-9" },
  };

  test("records the post on the conversation a comment opened", async () => {
    await handleInstagramComment(comment, InstagramEvent.COMMENT, SETTINGS);

    expect(db.conversation.updateMany).toHaveBeenCalledWith({
      where: { id: "conv-1", sourceMediaId: null },
      data: { sourceMediaId: "media-9" },
    });
  });

  test("does not credit a post for a conversation that was already going", async () => {
    db.waMessage.count.mockResolvedValue(3);

    await handleInstagramComment(comment, InstagramEvent.COMMENT, SETTINGS);

    expect(db.conversation.updateMany).not.toHaveBeenCalled();
  });
});

describe("edited messages", () => {
  const stored = (overrides: Record<string, unknown> = {}) => ({
    id: "row-1",
    contactId: "contact-1",
    conversationId: "conv-1",
    messageBody: {
      exchangeProcess: "receive",
      receive: messaging({ message: { mid: "mid-1", text: "see you at 5" } }),
      ...overrides,
    },
  });
  const edit = (num_edit?: number) =>
    messaging({ message_edit: { mid: "mid-1", text: "see you at 6", num_edit } });

  test("is classified as an edit, not a new message", () => {
    expect(getInstagramWebhookEvent(edit(1))).toBe(InstagramEvent.MESSAGE_EDIT);
  });

  test("replaces the text, keeps the old one in the history and tells the inbox", async () => {
    db.waMessage.findFirst.mockResolvedValue(stored());
    db.waMessage.update.mockImplementation(async ({ data }) => ({ ...stored(), ...data }));

    await handleInstagramMessageEdit(edit(1), SETTINGS);

    const { data } = db.waMessage.update.mock.calls[0][0];
    expect(data.messageBody.receive.message.text).toBe("see you at 6");
    expect(data.messageBody.editHistory).toEqual([
      { text: "see you at 5", editedAt: new Date(TIMESTAMP).toISOString() },
    ]);
    expect(data.editedAt).toEqual(new Date(TIMESTAMP));
    expect(wsMock.mock.calls[0][1].type).toBe("message_edited");
  });

  test("ignores a redelivered or out-of-order edit", async () => {
    db.waMessage.findFirst.mockResolvedValue(stored({ editCount: 2 }));

    await handleInstagramMessageEdit(edit(2), SETTINGS);

    expect(db.waMessage.update).not.toHaveBeenCalled();
  });

  test("ignores an edit of a message it never stored", async () => {
    db.waMessage.findFirst.mockResolvedValue(null);

    await handleInstagramMessageEdit(edit(1), SETTINGS);

    expect(db.waMessage.update).not.toHaveBeenCalled();
  });

  test("looks the message up inside the account's org only", async () => {
    db.waMessage.findFirst.mockResolvedValue(null);

    await handleInstagramMessageEdit(edit(1), SETTINGS);

    expect(db.waMessage.findFirst.mock.calls[0][0].where).toEqual({
      messageId: "mid-1",
      contact: { orgId: ORG_ID },
    });
  });
});

describe("mentions for loyalty points", () => {
  test("hands a caption or comment mention to the mentions service", async () => {
    const body = {
      object: "instagram",
      entry: [
        { id: IBA_ID, time: 1, changes: [{ field: "mentions", value: { media_id: "m-1" } }] },
      ],
    } as any;

    const result = await handleInstagramWebhook(body);

    expect(handleInstagramMentionChange).toHaveBeenCalledWith({ media_id: "m-1" }, SETTINGS);
    expect(result.processed).toBe(1);
  });

  test("records a story mention under the DM's id once it is stored", async () => {
    const event = messaging({
      message: {
        mid: "mid-story",
        attachments: [{ type: "story_mention", payload: { url: "u" } }],
      },
    });

    await handleInstagramWebhook(webhook(event));

    expect(recordInstagramStoryMention).toHaveBeenCalledWith({
      orgId: ORG_ID,
      ibaId: IBA_ID,
      igsId: IGS_ID,
      storyId: "mid-story",
    });
  });

  test("links waiting mentions when their author DMs us", async () => {
    storeMock.mockResolvedValue({ id: "row-1", conversationId: "conv-1", contactId: "contact-1" });
    (prisma as any).contact.findUnique.mockResolvedValue({ whatsappUserName: "@Ada" });
    (prisma as any).instagramMention.findFirst.mockResolvedValue({ id: "mention-1" });

    await handleInstagramMessages(
      webhook(messaging({ message: { mid: "m", text: "hi" } })),
      SETTINGS,
    );

    expect(linkPendingInstagramMentions).toHaveBeenCalledWith(ORG_ID, "contact-1", "ada");
  });

  test("skips the link when nothing is waiting", async () => {
    storeMock.mockResolvedValue({ id: "row-1", conversationId: "conv-1", contactId: "contact-1" });
    (prisma as any).contact.findUnique.mockResolvedValue({ whatsappUserName: "ada" });
    (prisma as any).instagramMention.findFirst.mockResolvedValue(null);

    await handleInstagramMessages(
      webhook(messaging({ message: { mid: "m", text: "hi" } })),
      SETTINGS,
    );

    expect(linkPendingInstagramMentions).not.toHaveBeenCalled();
  });
});
