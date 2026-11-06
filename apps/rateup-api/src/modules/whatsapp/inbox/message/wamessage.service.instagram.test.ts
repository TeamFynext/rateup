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
    contact: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    waMessageOrgTeamMap: { create: vi.fn() },
    $transaction: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
  excludeFields: vi.fn(),
}));

vi.mock("../../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {
    error = { message: "Meta says no" };
  },
}));
vi.mock("../../meta/sendApiMessages.js", () => ({ sendSendApiImages: vi.fn() }));
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
  createTextMessage: vi.fn((to: string, _t: string, text: string) => ({
    recipient: { id: to },
    message: { text },
  })),
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
import { callMetaApi } from "../../wa_axios.js";
import { getInstagramChannel } from "../../metaChannel/metaChannel.service.js";
import { sendMessage } from "../../whatsappSurvey/wasurvey.service.js";
import { sendSendApiImages } from "../../meta/sendApiMessages.js";
import { PlatformType } from "../../../../../generated/prisma/client.js";
import {
  moderateConversationsBody,
  moderateInstagramContact,
  sendMediaMessages,
} from "./wamessage.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  waMessage: { findFirst: Mock };
  contact: { findFirst: Mock; update: Mock };
};
const callMetaApiMock = callMetaApi as unknown as Mock;
const getInstagramChannelMock = getInstagramChannel as unknown as Mock;
const sendMessageMock = sendMessage as unknown as Mock;
const sendImagesMock = sendSendApiImages as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("moderateInstagramContact", () => {
  beforeEach(() => {
    db.contact.findFirst.mockResolvedValue({ id: "c1", igsId: "igsid-1" });
    db.waMessage.findFirst.mockResolvedValue({ sourceIdentifier: "iba-1" });
    getInstagramChannelMock.mockResolvedValue({ pageAccessToken: "page-token" });
    callMetaApiMock.mockResolvedValue({ data: { success: "true" } });
    db.contact.update.mockImplementation(async ({ data }) => ({ ...data, isSpam: false }));
  });

  test("builds Meta's body for each action", () => {
    expect(moderateConversationsBody("igsid-1", "block")).toEqual({
      user_ids: [{ id: "igsid-1" }],
      actions: ["block_user"],
    });
    expect(moderateConversationsBody("igsid-1", "unblock").actions).toEqual(["unblock_user"]);
    expect(moderateConversationsBody("igsid-1", "spam").actions).toEqual(["move_to_spam"]);
  });

  test("blocks on Instagram with the account's Page token, then records it", async () => {
    const result = await moderateInstagramContact("org-1", "c1", "block", "user-1");

    expect(getInstagramChannelMock).toHaveBeenCalledWith("iba-1", "org-1");
    expect(callMetaApiMock).toHaveBeenCalledWith(
      "/me/moderate_conversations",
      "POST",
      "page-token",
      { user_ids: [{ id: "igsid-1" }], actions: ["block_user"] },
    );
    expect(result.igBlockedAt).toBeInstanceOf(Date);
  });

  test("unblocking clears the block", async () => {
    await moderateInstagramContact("org-1", "c1", "unblock");
    expect(db.contact.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { igBlockedAt: null } }),
    );
  });

  test("changes nothing here when Meta refuses", async () => {
    callMetaApiMock.mockRejectedValue(new Error("boom"));
    await expect(moderateInstagramContact("org-1", "c1", "block")).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(db.contact.update).not.toHaveBeenCalled();
  });

  test("refuses a contact with no Instagram conversation", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "c1", igsId: null });
    await expect(moderateInstagramContact("org-1", "c1", "spam")).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(callMetaApiMock).not.toHaveBeenCalled();
  });
});

describe("sendMediaMessages on Instagram", () => {
  const image = (n: number) => ({
    type: "image" as const,
    url: `https://x/${n}.png`,
    name: `${n}`,
  });

  test("sends several images as one album, quoting on the album", async () => {
    await sendMediaMessages(
      [image(1), image(2)],
      "igsid-1",
      "org-1",
      "user-1",
      PlatformType.INSTAGRAM,
      "",
      "iba-1",
      "team-1",
      "mid-quoted",
    );

    expect(sendImagesMock).toHaveBeenCalledWith(
      { platform: PlatformType.INSTAGRAM, accountId: "iba-1" },
      "igsid-1",
      "org-1",
      ["https://x/1.png", "https://x/2.png"],
      { userId: "user-1", teamId: "team-1", replyToMid: "mid-quoted" },
    );
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  test("sends the caption as its own text, since the Send API has none", async () => {
    await sendMediaMessages(
      [image(1)],
      "igsid-1",
      "org-1",
      "user-1",
      PlatformType.INSTAGRAM,
      "look at this",
      "iba-1",
      undefined,
      "mid-quoted",
    );

    expect(sendMessageMock).toHaveBeenCalledTimes(2);
    // The quote goes on the first message only.
    expect(sendMessageMock.mock.calls[0]![1]).toMatchObject({ reply_to: { mid: "mid-quoted" } });
    expect(sendMessageMock.mock.calls[1]![1]).toEqual({
      recipient: { id: "igsid-1" },
      message: { text: "look at this" },
    });
  });
});
