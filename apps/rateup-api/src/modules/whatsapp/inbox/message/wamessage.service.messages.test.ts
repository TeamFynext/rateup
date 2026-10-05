import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/prisma.js", () => ({
  default: {
    waMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    conversation: { update: vi.fn() },
    contact: { findMany: vi.fn() },
    waMessageOrgTeamMap: { create: vi.fn() },
    $transaction: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
  excludeFields: vi.fn(),
}));

vi.mock("../../wa_axios.js", () => ({ callMetaApi: vi.fn() }));
vi.mock("../../settings/wa_settings.service.js", () => ({
  getWaSettings: vi.fn(),
  getWaSettingsByPhone: vi.fn(),
}));
vi.mock("../../metaChannel/metaChannel.service.js", () => ({
  getInstagramChannel: vi.fn(),
  getMessengerChannel: vi.fn(),
}));
vi.mock("../../settings/wa_channel_access.js", () => ({ getScopedSourceIdentifiers: vi.fn() }));
vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("../../../contact/contact.service.js", () => ({ updateContactById: vi.fn() }));
vi.mock("../../whatsappSurvey/wasurvey.controller.js", () => ({ wait: vi.fn() }));
vi.mock("../../whatsappSurvey/wasurvey.service.js", () => ({ sendMessage: vi.fn() }));
vi.mock("../../whatsappSurvey/wasurvey.utils.js", () => ({
  createAudioMessage: vi.fn(() => ({ kind: "audio" })),
  createContactMessage: vi.fn(() => ({ kind: "contacts" })),
  createDocumentMessage: vi.fn(() => ({ kind: "document" })),
  createLocationMessage: vi.fn(() => ({ kind: "location" })),
  createReplyImageMessage: vi.fn(() => ({ kind: "image" })),
  createVideoMessage: vi.fn(() => ({ kind: "video" })),
}));
vi.mock("../inboxStats/inboxStats.service.js", () => ({
  getInboxCountsFromConversations: vi.fn(),
}));
vi.mock("../../../org/org.services.js", () => ({
  Role: { SUPER_ADMIN: "SUPER_ADMIN", ADMIN: "ADMIN", MEMBER: "MEMBER" },
}));
vi.mock("../../../team/team.service.js", () => ({ getTeamIdsByUserId: vi.fn(async () => []) }));
vi.mock("../../../notification/notification.service.js", () => ({
  getNotificationSettings: vi.fn(),
}));
vi.mock("../../../integrations/events/emitIntegrationEvent.js", () => ({
  emitIntegrationEvent: vi.fn(),
  emitSurveyResponseSubmitted: vi.fn(),
}));
vi.mock("@faker-js/faker", () => ({ faker: {} }));
vi.mock("../note/note.service.js", () => ({
  getThreadNotes: vi.fn(async () => []),
  findNoteTime: vi.fn(async () => null),
  noteInclude: {},
  noteToThreadItem: vi.fn(),
}));
vi.mock("../../../contact/conversation/conversation.service.js", () => ({
  getConversationById: vi.fn(),
  getLastCreatedConversationForContact: vi.fn(),
  openConversationForContact: vi.fn(),
  resolveClosedByUserId: vi.fn(() => "user-1"),
  resolveInboxActor: vi.fn(() => ({ source: "user", userId: "user-1" })),
  setInboxStatus: vi.fn(),
  updateConversationAssignees: vi.fn(),
}));
vi.mock("../../../../workers/bullmq/queues/index.js", () => ({
  notificationQueue: { add: vi.fn() },
  sendMessageQueue: { add: vi.fn() },
}));
vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../../../../../generated/prisma/client.js", () => ({
  PlatformType: {
    WHATSAPP: "WHATSAPP",
    INSTAGRAM: "INSTAGRAM",
    FACEBOOK: "FACEBOOK",
    WEBCHAT: "WEBCHAT",
    INTERNAL: "INTERNAL",
  },
  Prisma: { sql: vi.fn(() => ({})), join: vi.fn(), empty: {} },
}));

import prisma from "../../../../utils/prisma.js";
import axios from "axios";
import { callMetaApi } from "../../wa_axios.js";
import { getWaSettings, getWaSettingsByPhone } from "../../settings/wa_settings.service.js";
import { getMessengerChannel, getInstagramChannel } from "../../metaChannel/metaChannel.service.js";
import { sendMessage } from "../../whatsappSurvey/wasurvey.service.js";
import {
  createAudioMessage,
  createContactMessage,
  createDocumentMessage,
  createLocationMessage,
  createReplyImageMessage,
  createVideoMessage,
} from "../../whatsappSurvey/wasurvey.utils.js";
import { log } from "../../../../utils/logger.js";
import { PlatformType } from "../../../../../generated/prisma/client.js";
import { findNoteTime, getThreadNotes } from "../note/note.service.js";
import {
  addNewWaMessage,
  createWaMessageOrgTeamMap,
  getMediaFile,
  getWaMessageByMessageId,
  getWaMessagesByContactId,
  markMessagesAsRead,
  markWaMessageAsDeleted,
  sendContactMessage,
  sendLocationMessage,
  sendMediaMessages,
  updateWaMessageByMessageId,
} from "./wamessage.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  waMessage: { create: Mock; findMany: Mock; findFirst: Mock; findUnique: Mock; update: Mock };
  conversation: { update: Mock };
  contact: { findMany: Mock };
  waMessageOrgTeamMap: { create: Mock };
  $transaction: Mock;
  $executeRawUnsafe: Mock;
};

const sendMessageMock = sendMessage as unknown as Mock;
const callMetaApiMock = callMetaApi as unknown as Mock;
const getWaSettingsMock = getWaSettings as unknown as Mock;
const getWaSettingsByPhoneMock = getWaSettingsByPhone as unknown as Mock;
const getInstagramChannelMock = getInstagramChannel as unknown as Mock;
const getMessengerChannelByPageIdMock = getMessengerChannel as unknown as Mock;
const axiosGetMock = (axios as unknown as { get: Mock }).get;

const MESSAGE: {
  id: string;
  messageId: string;
  stats: { sent: string };
  deletedAt: Date | null;
} = { id: "msg-1", messageId: "wamid-1", stats: { sent: "" }, deletedAt: null };
const WA_CREATED_AT = "2026-07-27T09:00:00Z";

beforeEach(() => {
  vi.clearAllMocks();
  db.waMessage.create.mockReturnValue("create-promise" as any);
  db.waMessage.findMany.mockResolvedValue([]);
  db.waMessage.findFirst.mockResolvedValue(MESSAGE);
  db.waMessage.update.mockResolvedValue(MESSAGE);
  db.conversation.update.mockReturnValue("conv-update-promise" as any);
  db.$transaction.mockResolvedValue([MESSAGE, {}]);
  db.waMessageOrgTeamMap.create.mockResolvedValue({ id: "map-1" });
  db.contact.findMany.mockResolvedValue([{ name: "Ada", phone: "15550001" }]);
});

describe("addNewWaMessage", () => {
  test("stores the message with its thread and channel details", async () => {
    await addNewWaMessage(
      { exchangeProcess: "receive" } as any,
      "contact-1",
      WA_CREATED_AT,
      PlatformType.WHATSAPP,
      "phone-1",
      "conv-1",
    );

    expect(db.waMessage.create.mock.calls[0][0].data).toMatchObject({
      contactId: "contact-1",
      waCreatedAt: WA_CREATED_AT,
      sourcePlatform: PlatformType.WHATSAPP,
      sourceIdentifier: "phone-1",
      conversationId: "conv-1",
      sourceMessage: "inbox",
    });
  });

  test("counts an inbound message against the conversation's customer clock", async () => {
    await addNewWaMessage(
      { exchangeProcess: "receive" } as any,
      "contact-1",
      WA_CREATED_AT,
      PlatformType.WHATSAPP,
      "phone-1",
      "conv-1",
    );

    const data = db.conversation.update.mock.calls[0][0].data;
    expect(data.messageCount).toEqual({ increment: 1 });
    expect(data.lastCustomerMessageAt).toEqual(new Date(WA_CREATED_AT));
    expect(data.lastAgentMessageAt).toBeUndefined();
  });

  test("counts a message with a sender against the agent clock", async () => {
    await addNewWaMessage(
      { exchangeProcess: "send" } as any,
      "contact-1",
      WA_CREATED_AT,
      PlatformType.WHATSAPP,
      "phone-1",
      "conv-1",
      undefined,
      undefined,
      "user-1",
    );

    const data = db.conversation.update.mock.calls[0][0].data;
    expect(data.lastAgentMessageAt).toEqual(new Date(WA_CREATED_AT));
    expect(data.lastCustomerMessageAt).toBeUndefined();
  });

  test("writes the message and the metrics in one transaction", async () => {
    await addNewWaMessage(
      { exchangeProcess: "receive" } as any,
      "contact-1",
      WA_CREATED_AT,
      PlatformType.WHATSAPP,
      "phone-1",
      "conv-1",
    );

    expect(db.$transaction).toHaveBeenCalledWith(["create-promise", "conv-update-promise"]);
  });

  test("leaves conversation metrics alone for an internal note", async () => {
    await addNewWaMessage(
      { exchangeProcess: "internal" } as any,
      "contact-1",
      WA_CREATED_AT,
      PlatformType.INTERNAL,
      "internal",
      "conv-1",
      undefined,
      undefined,
      "user-1",
    );

    expect(db.conversation.update).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test("leaves conversation metrics alone for a message with no thread", async () => {
    await addNewWaMessage(
      { exchangeProcess: "receive" } as any,
      "contact-1",
      WA_CREATED_AT,
      PlatformType.WHATSAPP,
      "phone-1",
      null as any,
    );

    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test.each([
    ["webchat", PlatformType.WEBCHAT, { sent: WA_CREATED_AT, delivered: WA_CREATED_AT }],
    ["Instagram", PlatformType.INSTAGRAM, { sent: WA_CREATED_AT, delivered: "" }],
    ["Facebook", PlatformType.FACEBOOK, { sent: WA_CREATED_AT, delivered: "" }],
  ])("seeds delivery stats for %s, which sends no receipts", async (_n, platform, expected) => {
    await addNewWaMessage(
      { exchangeProcess: "send" } as any,
      "contact-1",
      WA_CREATED_AT,
      platform,
      "id-1",
      "conv-1",
    );

    expect(db.waMessage.create.mock.calls[0][0].data.stats).toMatchObject(expected);
  });

  test("records a failed send against the failed stat", async () => {
    await addNewWaMessage(
      { exchangeProcess: "send" } as any,
      "contact-1",
      WA_CREATED_AT,
      PlatformType.WHATSAPP,
      "phone-1",
      "conv-1",
      undefined,
      undefined,
      undefined,
      true,
    );

    expect(db.waMessage.create.mock.calls[0][0].data.stats).toMatchObject({
      failed: WA_CREATED_AT,
    });
  });

  test("attributes a campaign message to its send session", async () => {
    // Every per-attempt number — the attempts table, the send's own sent/failed
    // counters — is derived from this column, and the status consumer reads it to
    // decide which send a receipt belongs to. Dropped here, every attempt reads 0.
    await addNewWaMessage(
      { exchangeProcess: "send" } as any,
      "contact-1",
      WA_CREATED_AT,
      PlatformType.WHATSAPP,
      "phone-1",
      "conv-1",
      undefined,
      undefined,
      undefined,
      false,
      "campaign",
      {},
      undefined,
      { campaignParticipantId: "participant-1", campaignSendId: "send-1" },
    );

    expect(
      db.waMessage.create.mock.calls[0][0].data.WaMessageCampaginParticipantMap.create,
    ).toMatchObject({ campaignParticipantId: "participant-1", campaignSendId: "send-1" });
  });

  test("leaves stats unset for a normal WhatsApp message", async () => {
    await addNewWaMessage(
      { exchangeProcess: "receive" } as any,
      "contact-1",
      WA_CREATED_AT,
      PlatformType.WHATSAPP,
      "phone-1",
      "conv-1",
    );

    expect(db.waMessage.create.mock.calls[0][0].data.stats).toBeUndefined();
  });
});

describe("getWaMessagesByContactId", () => {
  test("returns the newest 50 messages for a contact", async () => {
    db.waMessage.findMany.mockResolvedValue([{ id: "m1" }]);

    const result = await getWaMessagesByContactId("contact-1", "org-1", null);

    const args = db.waMessage.findMany.mock.calls[0][0];
    expect(args.take).toBe(50);
    expect(args.orderBy).toEqual({ waCreatedAt: "desc" });
    expect(args.skip).toBeUndefined();
    expect(result).toMatchObject({ nextCursor: null, hasNextPage: false });
  });

  test("pages past the cursor when one is given", async () => {
    db.waMessage.findUnique.mockResolvedValue({
      id: "msg-50",
      waCreatedAt: new Date(),
      createdAt: new Date(),
    });
    await getWaMessagesByContactId("contact-1", "org-1", "msg-50");

    const args = db.waMessage.findMany.mock.calls[0][0];
    expect(args.skip).toBe(1);
    expect(args.cursor).toEqual({ id: "msg-50" });
  });

  test("hands back the last id as the next cursor when the page is full", async () => {
    db.waMessage.findMany.mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => ({ id: `m${i}` })),
    );

    const result = await getWaMessagesByContactId("contact-1", "org-1", null);

    expect(result.hasNextPage).toBe(true);
    expect(result.nextCursor).toBe("m49");
  });

  /**
   * Matched on digits rather than on a guessed pair of spellings. The column
   * holds at least four spellings of one number, so listing `phone` and `+phone`
   * dropped whichever of the thread's messages were stored with the separators
   * Meta formats the number with — most of them, for some orgs.
   */
  test("narrows the thread to one channel, whatever spelling its messages hold", async () => {
    db.waMessage.findMany.mockResolvedValueOnce([
      { sourceIdentifier: "15550001" },
      { sourceIdentifier: "+15550001" },
      { sourceIdentifier: "+1555-000-1" },
      { sourceIdentifier: "+1555 0001" },
      // A different channel, and the system-note marker, which is added back
      // separately rather than matched by number.
      { sourceIdentifier: "15559999" },
      { sourceIdentifier: "internal" },
    ]);

    await getWaMessagesByContactId("contact-1", "org-1", null, "15550001");

    const [identifierCondition] = db.waMessage.findMany.mock.calls[1][0].where.AND;
    expect(identifierCondition.OR).toEqual([
      { sourceIdentifier: { in: ["15550001", "+15550001", "+1555-000-1", "+1555 0001"] } },
      { sourceIdentifier: "internal" },
    ]);
  });

  test("resolves the thread's spellings from that contact's own messages", async () => {
    db.waMessage.findMany.mockResolvedValueOnce([]);

    await getWaMessagesByContactId("contact-1", "org-1", null, "15550001");

    expect(db.waMessage.findMany.mock.calls[0][0]).toMatchObject({
      where: { contactId: "contact-1" },
      distinct: ["sourceIdentifier"],
    });
  });

  // A channel the contact has no messages on must match nothing, not everything.
  test("matches no message when the contact never used that channel", async () => {
    db.waMessage.findMany.mockResolvedValueOnce([{ sourceIdentifier: "15559999" }]);

    await getWaMessagesByContactId("contact-1", "org-1", null, "15550001");

    const [identifierCondition] = db.waMessage.findMany.mock.calls[1][0].where.AND;
    expect(identifierCondition.OR[0]).toEqual({ sourceIdentifier: { in: [] } });
  });

  test('treats the "all" channel as no channel filter', async () => {
    await getWaMessagesByContactId("contact-1", "org-1", null, "all");

    expect(db.waMessage.findMany.mock.calls[0][0].where.AND[0]).toEqual({});
  });

  // Legacy messages predate the conversation backfill and carry a null conversationId.
  test("keeps un-backfilled messages visible when scoping to a ticket", async () => {
    await getWaMessagesByContactId("contact-1", "org-1", null, undefined, "conv-1");

    const [, conversationCondition] = db.waMessage.findMany.mock.calls[0][0].where.AND;
    expect(conversationCondition.OR).toEqual([
      { conversationId: "conv-1" },
      { conversationId: null },
    ]);
  });

  test("only reads messages of the caller's org", async () => {
    await getWaMessagesByContactId("contact-1", "org-1", null);

    expect(db.waMessage.findMany.mock.calls[0][0].where.contact).toEqual({ orgId: "org-1" });
  });

  test("slots the page's notes between its messages by time", async () => {
    const at = (m: number) => new Date(Date.UTC(2026, 8, 29, 10, m));
    db.waMessage.findMany.mockResolvedValue([
      { id: "m3", waCreatedAt: at(30) },
      { id: "m1", waCreatedAt: at(10) },
    ]);
    (getThreadNotes as Mock).mockResolvedValue([
      { id: "n4", createdAt: at(40) },
      { id: "n2", createdAt: at(20) },
      { id: "n0", createdAt: at(0) },
    ]);

    const result = await getWaMessagesByContactId("contact-1", "org-1", null);

    expect(result.messages.map((m) => m.id)).toEqual(["n4", "m3", "n2", "m1", "n0"]);
  });

  // A full page has older messages still to come, so older notes wait for that page.
  test("bounds notes to the time the page covers", async () => {
    const oldest = new Date(Date.UTC(2026, 8, 1));
    const cursorAt = new Date(Date.UTC(2026, 8, 20));
    db.waMessage.findUnique.mockResolvedValue({
      id: "c",
      waCreatedAt: cursorAt,
      createdAt: cursorAt,
    });
    db.waMessage.findMany.mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => ({
        id: `m${i}`,
        waCreatedAt: i === 49 ? oldest : cursorAt,
      })),
    );

    await getWaMessagesByContactId("contact-1", "org-1", "c", undefined, "conv-1");

    expect(getThreadNotes).toHaveBeenCalledWith({
      contactId: "contact-1",
      orgId: "org-1",
      conversationId: "conv-1",
      from: oldest,
      before: cursorAt,
    });
  });

  test("continues from a note id a client took as its cursor before notes moved", async () => {
    const noteAt = new Date(Date.UTC(2026, 8, 20));
    db.waMessage.findUnique.mockResolvedValue(null);
    (findNoteTime as Mock).mockResolvedValue(noteAt);

    await getWaMessagesByContactId("contact-1", "org-1", "note-1");

    const args = db.waMessage.findMany.mock.calls[0][0];
    expect(args.cursor).toBeUndefined();
    expect(args.where.AND[1]).toEqual({ waCreatedAt: { lt: noteAt } });
  });

  test("applies no ticket filter when none is named", async () => {
    await getWaMessagesByContactId("contact-1", "org-1", null);

    expect(db.waMessage.findMany.mock.calls[0][0].where.AND[1]).toEqual({});
  });
});

describe("getWaMessageByMessageId", () => {
  test("finds the message by its WhatsApp id", async () => {
    const result = await getWaMessageByMessageId("wamid-1");

    expect(db.waMessage.findFirst).toHaveBeenCalledWith({ where: { messageId: "wamid-1" } });
    expect(result).toBe(MESSAGE);
  });
});

describe("markWaMessageAsDeleted", () => {
  test("stamps the revoked message with a deletion time", async () => {
    const result = await markWaMessageAsDeleted("wamid-1", "org-1");

    expect(db.waMessage.update).toHaveBeenCalledWith({
      where: { id: "msg-1" },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result).toBe(MESSAGE);
  });

  test("scopes the lookup to the org so another account's wamid cannot match", async () => {
    await markWaMessageAsDeleted("wamid-1", "org-1");

    expect(db.waMessage.findFirst).toHaveBeenCalledWith({
      where: { messageId: "wamid-1", contact: { orgId: "org-1" } },
    });
  });

  test("keeps the first deletion time when the webhook is redelivered", async () => {
    const alreadyDeleted = { ...MESSAGE, deletedAt: new Date("2026-07-01") };
    db.waMessage.findFirst.mockResolvedValue(alreadyDeleted);

    const result = await markWaMessageAsDeleted("wamid-1", "org-1");

    expect(result).toBe(alreadyDeleted);
    expect(db.waMessage.update).not.toHaveBeenCalled();
  });

  test("warns and does nothing for a message this org does not have", async () => {
    db.waMessage.findFirst.mockResolvedValue(null);

    await expect(markWaMessageAsDeleted("wamid-unknown", "org-1")).resolves.toBeNull();
    expect(log.warn).toHaveBeenCalled();
    expect(db.waMessage.update).not.toHaveBeenCalled();
  });

  test("does nothing without a message id", async () => {
    await expect(markWaMessageAsDeleted("", "org-1")).resolves.toBeNull();
    expect(db.waMessage.findFirst).not.toHaveBeenCalled();
  });
});

describe("updateWaMessageByMessageId", () => {
  test("merges new delivery stats over the ones already stored", async () => {
    db.waMessage.findFirst.mockResolvedValue({
      id: "msg-1",
      stats: { sent: "t1", delivered: "" },
    });

    await updateWaMessageByMessageId("wamid-1", { stats: { delivered: "t2" } } as any);

    expect(db.waMessage.update.mock.calls[0][0].data.stats).toEqual({
      sent: "t1",
      delivered: "t2",
    });
  });

  test("leaves stats untouched when the change carries none", async () => {
    await updateWaMessageByMessageId("wamid-1", { failed: true } as any);

    expect(db.waMessage.update.mock.calls[0][0].data.stats).toBeUndefined();
  });

  test("prefers the row id over the WhatsApp id when both are given", async () => {
    await updateWaMessageByMessageId("wamid-1", {}, "msg-9");

    expect(db.waMessage.findFirst).toHaveBeenCalledWith({ where: { id: "msg-9" } });
  });

  test("returns null without writing when the message is unknown", async () => {
    db.waMessage.findFirst.mockResolvedValue(null);

    await expect(updateWaMessageByMessageId("wamid-unknown", {})).resolves.toBeNull();
    expect(db.waMessage.update).not.toHaveBeenCalled();
  });
});

describe("createWaMessageOrgTeamMap", () => {
  test("records which org and team a message belongs to", async () => {
    await createWaMessageOrgTeamMap({
      teamId: "team-1",
      messageId: "msg-1",
      orgId: "org-1",
      type: "CAMPAIGN",
      externalApi: true,
    });

    expect(db.waMessageOrgTeamMap.create).toHaveBeenCalledWith({
      data: {
        teamId: "team-1",
        messageId: "msg-1",
        orgId: "org-1",
        isAutomedMessage: false,
        type: "CAMPAIGN",
        externalApi: true,
      },
    });
  });

  test("marks the message as automated when told to", async () => {
    await createWaMessageOrgTeamMap({
      teamId: null as any,
      messageId: "msg-1",
      orgId: "org-1",
      isAutomedMessage: true,
      type: "AUTOMATED",
      externalApi: false,
    });

    expect(db.waMessageOrgTeamMap.create.mock.calls[0][0].data.isAutomedMessage).toBe(true);
  });
});

describe("getMediaFile", () => {
  beforeEach(() => {
    getWaSettingsMock.mockResolvedValue({ accessToken: "token-1" });
    callMetaApiMock.mockResolvedValue({ data: { url: "https://media/1" } });
    axiosGetMock.mockResolvedValue({
      headers: { "content-type": "image/jpeg" },
      data: Buffer.from("bytes"),
    });
  });

  test("resolves the media URL from Meta and downloads it with the org's token", async () => {
    const result = await getMediaFile("media-1", "org-1");

    expect(callMetaApiMock).toHaveBeenCalledWith("/media-1", "GET", "token-1");
    expect(axiosGetMock).toHaveBeenCalledWith("https://media/1", {
      responseType: "arraybuffer",
      headers: { Authorization: "Bearer token-1" },
    });
    expect(result).toMatchObject({ type: "image/jpeg" });
  });

  test("logs and returns nothing when Meta has no URL for the media", async () => {
    callMetaApiMock.mockResolvedValue({});

    await expect(getMediaFile("media-1", "org-1")).resolves.toBeUndefined();
    expect(axiosGetMock).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalled();
  });
});

describe("sendMediaMessages", () => {
  test.each([
    ["image", createReplyImageMessage],
    ["document", createDocumentMessage],
    ["video", createVideoMessage],
    ["audio", createAudioMessage],
  ])("builds a %s message before sending", async (type, builder) => {
    await sendMediaMessages(
      [{ type: type as any, url: "https://f/1", name: "f" }],
      "15550001",
      "org-1",
      "user-1",
      PlatformType.WHATSAPP,
      "",
      "",
      undefined,
    );

    expect(builder as unknown as Mock).toHaveBeenCalled();
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
  });

  test("captions only the last attachment so the text appears once", async () => {
    await sendMediaMessages(
      [
        { type: "image", url: "https://f/1", name: "f1" },
        { type: "image", url: "https://f/2", name: "f2" },
      ],
      "15550001",
      "org-1",
      "user-1",
      PlatformType.WHATSAPP,
      "look at these",
      "",
      undefined,
    );

    const imageBuilder = createReplyImageMessage as unknown as Mock;
    expect(imageBuilder.mock.calls[0][3]).toBe("");
    expect(imageBuilder.mock.calls[1][3]).toBe("look at these");
    expect(sendMessageMock).toHaveBeenCalledTimes(2);
  });

  test("sends nothing for an empty attachment list", async () => {
    await sendMediaMessages(
      [],
      "15550001",
      "org-1",
      "user-1",
      PlatformType.WHATSAPP,
      "",
      "",
      undefined,
    );

    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  test("skips a media type it cannot build instead of sending an empty message", async () => {
    await sendMediaMessages(
      [{ type: "sticker" as any, url: "https://f/1", name: "f" }],
      "15550001",
      "org-1",
      "user-1",
      PlatformType.WHATSAPP,
      "",
      "",
      undefined,
    );

    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalled();
  });
});

describe("sendContactMessage", () => {
  test("looks up the named contacts and sends them as a card", async () => {
    await sendContactMessage(
      { contactIds: ["c1", "c2"] },
      "15550001",
      "org-1",
      "user-1",
      "phone-1",
      "team-1",
    );

    expect(db.contact.findMany.mock.calls[0][0].where.OR).toEqual([{ id: { in: ["c1", "c2"] } }]);
    expect(createContactMessage).toHaveBeenCalledWith("15550001", [
      { name: "Ada", phone: "15550001" },
    ]);
    expect(sendMessageMock).toHaveBeenCalled();
  });

  test("resolves a contact group into its members", async () => {
    await sendContactMessage(
      { groupIds: ["g1"] },
      "15550001",
      "org-1",
      "user-1",
      "phone-1",
      "team-1",
    );

    expect(db.contact.findMany.mock.calls[0][0].where.OR[0]).toEqual({
      contactGroups: { some: { contactGroupId: { in: ["g1"] } } },
    });
  });

  test("sends nothing when neither contacts nor groups are named", async () => {
    await sendContactMessage({}, "15550001", "org-1", "user-1", "phone-1", "team-1");

    expect(db.contact.findMany).not.toHaveBeenCalled();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});

describe("sendLocationMessage", () => {
  test("builds and sends the location", async () => {
    await sendLocationMessage(
      { latitude: 1, longitude: 2 },
      "15550001",
      "org-1",
      "user-1",
      "phone-1",
      "team-1",
    );

    expect(createLocationMessage).toHaveBeenCalledWith("15550001", { latitude: 1, longitude: 2 });
    expect(sendMessageMock).toHaveBeenCalled();
  });
});

describe("markMessagesAsRead", () => {
  const INBOUND = {
    messageId: "wamid.abc",
    sourceIdentifier: "15551323034",
    sourcePlatform: PlatformType.WHATSAPP,
    contact: { orgId: "org-1", phone: "15550001", igsId: null, psid: null },
  };

  beforeEach(() => {
    db.$executeRawUnsafe.mockResolvedValue(1);
    db.waMessage.findFirst.mockResolvedValue(INBOUND);
    getWaSettingsByPhoneMock.mockResolvedValue({ phoneId: "phone-1" });
    getWaSettingsMock.mockResolvedValue({ phoneId: "phone-1", accessToken: "token-abc" });
    callMetaApiMock.mockResolvedValue({ data: { success: true } });
  });

  test("records the read for this user", async () => {
    await markMessagesAsRead("contact-1", "user-1");

    expect(db.$executeRawUnsafe.mock.calls[0].slice(1)).toEqual(["contact-1", "user-1"]);
  });

  // Turns the customer's ticks blue. Only the newest message is sent: WhatsApp
  // marks every earlier message in the conversation read along with it.
  test("sends WhatsApp the read receipt for the newest inbound message", async () => {
    await markMessagesAsRead("contact-1", "user-1");
    await vi.waitFor(() => expect(callMetaApiMock).toHaveBeenCalled());

    expect(callMetaApiMock).toHaveBeenCalledWith("/phone-1/messages", "POST", "token-abc", {
      messaging_product: "whatsapp",
      status: "read",
      message_id: "wamid.abc",
    });
    expect(db.waMessage.findFirst.mock.calls[0][0].orderBy).toEqual({ waCreatedAt: "desc" });
  });

  // Re-sending on every open would be one Graph call per poll.
  test("sends nothing when the thread was already read", async () => {
    db.$executeRawUnsafe.mockResolvedValue(0);

    await markMessagesAsRead("contact-1", "user-1");

    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  // A multi-number org must acknowledge on the number the message arrived on.
  test("acknowledges on the channel the message arrived on", async () => {
    await markMessagesAsRead("contact-1", "user-1");
    await vi.waitFor(() => expect(callMetaApiMock).toHaveBeenCalled());

    expect(getWaSettingsByPhoneMock).toHaveBeenCalledWith("15551323034");
    expect(getWaSettingsMock).toHaveBeenCalledWith("org-1", "phone-1");
  });

  // Instagram and Messenger take a sender action addressed to the person, with
  // no message id — Meta requires the request to carry nothing else.
  test("marks an Instagram thread seen with the page token as a query parameter", async () => {
    db.waMessage.findFirst.mockResolvedValue({
      ...INBOUND,
      messageId: null,
      sourceIdentifier: "iba-1",
      sourcePlatform: PlatformType.INSTAGRAM,
      contact: { orgId: "org-1", phone: null, igsId: "igsid-1", psid: null },
    });
    getInstagramChannelMock.mockResolvedValue({ pageAccessToken: "page-token" });

    await markMessagesAsRead("contact-1", "user-1");
    await vi.waitFor(() => expect(callMetaApiMock).toHaveBeenCalled());

    // Scoped to the contact's org, so a mark-seen never goes out on another org's account.
    expect(getInstagramChannelMock).toHaveBeenCalledWith("iba-1", "org-1");
    expect(callMetaApiMock).toHaveBeenCalledWith(
      "/me/messages",
      "POST",
      undefined,
      { recipient: { id: "igsid-1" }, sender_action: "mark_seen" },
      { params: { access_token: "page-token" } },
    );
  });

  test("marks a Messenger thread seen with the page token as a bearer", async () => {
    db.waMessage.findFirst.mockResolvedValue({
      ...INBOUND,
      messageId: null,
      sourceIdentifier: "page-1",
      sourcePlatform: PlatformType.FACEBOOK,
      contact: { orgId: "org-1", phone: null, igsId: null, psid: "psid-1" },
    });
    getMessengerChannelByPageIdMock.mockResolvedValue({ pageAccessToken: "page-token" });

    await markMessagesAsRead("contact-1", "user-1");
    await vi.waitFor(() => expect(callMetaApiMock).toHaveBeenCalled());

    expect(getMessengerChannelByPageIdMock).toHaveBeenCalledWith("page-1", "org-1");
    expect(callMetaApiMock).toHaveBeenCalledWith("/me/messages", "POST", "page-token", {
      recipient: { id: "psid-1" },
      sender_action: "mark_seen",
    });
  });

  // Webchat has no upstream to acknowledge to.
  test("looks only at channels that can show a receipt", async () => {
    await markMessagesAsRead("contact-1", "user-1");

    expect(db.waMessage.findFirst.mock.calls[0][0].where.sourcePlatform).toEqual({
      in: [PlatformType.WHATSAPP, PlatformType.INSTAGRAM, PlatformType.FACEBOOK],
    });
  });

  test("skips the receipt when the thread has no inbound message to acknowledge", async () => {
    db.waMessage.findFirst.mockResolvedValue(null);

    await markMessagesAsRead("contact-1", "user-1");

    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  // The conversation is read on our side either way; a Graph failure must not
  // fail the agent's action.
  test("does not surface a failed receipt to the caller", async () => {
    callMetaApiMock.mockRejectedValue(new Error("graph is down"));

    await expect(markMessagesAsRead("contact-1", "user-1")).resolves.not.toThrow();
    await vi.waitFor(() => expect(log.error).toHaveBeenCalled());
  });
});
