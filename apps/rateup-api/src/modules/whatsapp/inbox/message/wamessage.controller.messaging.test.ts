import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./wamessage.service.js", () => ({
  addNewWaMessage: vi.fn(),
  assignWaMessageToUser: vi.fn(),
  clearMentionsForConversation: vi.fn(),
  createInternalWaMessage: vi.fn(),
  createWaMessageOrgTeamMap: vi.fn(),
  exportWhatsapChats: vi.fn(),
  filterChats: vi.fn(),
  generateChatAnalytics: vi.fn(),
  generateChatFilterData: vi.fn(),
  generateInboxResponse: vi.fn(),
  getAssignedUserForContact: vi.fn(),
  getContactsCountByInbox: vi.fn(),
  getMediaFile: vi.fn(),
  getWaMessageLogs: vi.fn(),
  getWaMessagesByContactId: vi.fn(),
  markMessagesAsRead: vi.fn(),
  reopenConversation: vi.fn(),
  sendContactMessage: vi.fn(),
  sendLocationMessage: vi.fn(),
  sendMediaMessages: vi.fn(),
  setContactSpam: vi.fn(),
  setConversationFavorite: vi.fn(),
}));

vi.mock("./wamessage.utils.js", () => ({
  deriveConversationSubject: vi.fn(),
  extractMentions: vi.fn(() => []),
  handleWaReceivedImages: vi.fn(async (b: unknown) => b),
  returnAppropriateTimeStamp: vi.fn(async () => "2026-07-27T09:00:00Z"),
}));

vi.mock("../../whatsappSurvey/wasurvey.utils.js", () => ({
  createReactionMessage: vi.fn(() => ({ kind: "reaction" })),
  createTextMessage: vi.fn(() => ({ kind: "text" })),
  parseToWhatsAppFormat: vi.fn(() => "parsed-rich-text"),
}));
vi.mock("../../whatsappSurvey/wasurvey.service.js", () => ({
  blockWhatsappUser: vi.fn(),
  sendMessage: vi.fn(),
  unblockWhatsappUser: vi.fn(),
}));
vi.mock("../../messageTemplates/wa_templates.service.js", () => ({
  getTemplateByNameAndOrgId: vi.fn(),
}));
vi.mock("../../../contact/contact.service.js", () => ({
  getContactById: vi.fn(),
  getOrCreateContactByIgsId: vi.fn(),
  getOrCreateContactByPhone: vi.fn(),
  getOrCreateContactByPsid: vi.fn(),
  updateContactById: vi.fn(),
}));
vi.mock("../../../contact/conversation/conversation.service.js", () => ({
  checkIfFirstSendMessageInConversation: vi.fn(),
  checkIfFirstUserSendMessageInConversation: vi.fn(),
  getActiveConversationForContact: vi.fn(),
  getLastCreatedConversationForContact: vi.fn(),
  openConversationForContact: vi.fn(),
  setConversationSubjectIfBlank: vi.fn(),
  updateConversation: vi.fn(),
}));
vi.mock("../../../org/ws/org.ws.controller.js", () => ({ sendViaWstoOrgHandler: vi.fn() }));
vi.mock("../../instagram/instagram.service.js", () => ({ getIgUserDetailsFromMeta: vi.fn() }));
vi.mock("../../facebook/facebook.service.js", () => ({ getFacebookUserDetailsFromMeta: vi.fn() }));
vi.mock("../../../integrations/external/zapier/zapier.service.js", () => ({
  addZapierTriggerToQueue: vi.fn(),
  ZapierTriggers: { NEW_MESSAGE: "NEW_MESSAGE" },
}));
vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("hucre", () => ({ XlsxStreamWriter: vi.fn() }));
vi.mock("hucre/xlsx", () => ({ writeXlsx: vi.fn() }));
vi.mock("../../../../../generated/prisma/client.js", () => ({
  PlatformType: {
    WHATSAPP: "WHATSAPP",
    INSTAGRAM: "INSTAGRAM",
    FACEBOOK: "FACEBOOK",
    WEBCHAT: "WEBCHAT",
    INTERNAL: "INTERNAL",
  },
  Prisma: {},
}));

import {
  addNewWaMessage,
  createInternalWaMessage,
  createWaMessageOrgTeamMap,
  clearMentionsForConversation,
  getMediaFile,
  getWaMessagesByContactId,
  markMessagesAsRead,
  reopenConversation,
  sendContactMessage,
  sendLocationMessage,
  sendMediaMessages,
} from "./wamessage.service.js";
import {
  deriveConversationSubject,
  extractMentions,
  handleWaReceivedImages,
} from "./wamessage.utils.js";
import {
  createReactionMessage,
  createTextMessage,
  parseToWhatsAppFormat,
} from "../../whatsappSurvey/wasurvey.utils.js";
import { sendMessage } from "../../whatsappSurvey/wasurvey.service.js";
import { getTemplateByNameAndOrgId } from "../../messageTemplates/wa_templates.service.js";
import {
  getContactById,
  getOrCreateContactByIgsId,
  getOrCreateContactByPhone,
  getOrCreateContactByPsid,
  updateContactById,
} from "../../../contact/contact.service.js";
import {
  checkIfFirstSendMessageInConversation,
  checkIfFirstUserSendMessageInConversation,
  getActiveConversationForContact,
  getLastCreatedConversationForContact,
  openConversationForContact,
  setConversationSubjectIfBlank,
  updateConversation,
} from "../../../contact/conversation/conversation.service.js";
import { sendViaWstoOrgHandler } from "../../../org/ws/org.ws.controller.js";
import { getIgUserDetailsFromMeta } from "../../instagram/instagram.service.js";
import { getFacebookUserDetailsFromMeta } from "../../facebook/facebook.service.js";
import { addZapierTriggerToQueue } from "../../../integrations/external/zapier/zapier.service.js";
import { PlatformType } from "../../../../../generated/prisma/client.js";
import { WaMessageAssignStatus } from "../../../../types/enums.js";
import {
  clearConversationMentionsHandler,
  createPrivateMessageHandler,
  getMediaFileByMediaId,
  getWaMessagesByContactIdHandler,
  handleWaMessages,
  markMessagesAsReadHandler,
  reopenConversationHandler,
  sendNewWaMessageHandler,
} from "./wamessage.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  addNewWaMessage: addNewWaMessage as unknown as Mock,
  createInternalWaMessage: createInternalWaMessage as unknown as Mock,
  createWaMessageOrgTeamMap: createWaMessageOrgTeamMap as unknown as Mock,
  clearMentions: clearMentionsForConversation as unknown as Mock,
  getMediaFile: getMediaFile as unknown as Mock,
  getWaMessagesByContactId: getWaMessagesByContactId as unknown as Mock,
  markMessagesAsRead: markMessagesAsRead as unknown as Mock,
  reopenConversation: reopenConversation as unknown as Mock,
  sendContactMessage: sendContactMessage as unknown as Mock,
  sendLocationMessage: sendLocationMessage as unknown as Mock,
  sendMediaMessages: sendMediaMessages as unknown as Mock,
  deriveSubject: deriveConversationSubject as unknown as Mock,
  extractMentions: extractMentions as unknown as Mock,
  handleImages: handleWaReceivedImages as unknown as Mock,
  createTextMessage: createTextMessage as unknown as Mock,
  createReactionMessage: createReactionMessage as unknown as Mock,
  parseRichText: parseToWhatsAppFormat as unknown as Mock,
  sendMessage: sendMessage as unknown as Mock,
  getTemplate: getTemplateByNameAndOrgId as unknown as Mock,
  getContactById: getContactById as unknown as Mock,
  byIgsId: getOrCreateContactByIgsId as unknown as Mock,
  byPhone: getOrCreateContactByPhone as unknown as Mock,
  byPsid: getOrCreateContactByPsid as unknown as Mock,
  updateContact: updateContactById as unknown as Mock,
  isFirstSend: checkIfFirstSendMessageInConversation as unknown as Mock,
  isFirstUserSend: checkIfFirstUserSendMessageInConversation as unknown as Mock,
  getActiveConversation: getActiveConversationForContact as unknown as Mock,
  getLastConversation: getLastCreatedConversationForContact as unknown as Mock,
  openConversation: openConversationForContact as unknown as Mock,
  setSubjectIfBlank: setConversationSubjectIfBlank as unknown as Mock,
  updateConversation: updateConversation as unknown as Mock,
  sendViaWs: sendViaWstoOrgHandler as unknown as Mock,
  igDetails: getIgUserDetailsFromMeta as unknown as Mock,
  fbDetails: getFacebookUserDetailsFromMeta as unknown as Mock,
  zapier: addZapierTriggerToQueue as unknown as Mock,
};

const CONTACT = {
  id: "contact-1",
  // Every contact write on this path is org-scoped now.
  orgId: "org-1",
  phone: "15550001",
  isSpam: false,
  waMessageAssignStatus: "OPEN",
};
const CONVERSATION = { id: "conv-1", status: "OPEN", subject: "Existing subject" };
const WA_MESSAGE = { id: "msg-1" };

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    contentType: undefined,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    status: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    type: vi.fn((t: string) => {
      reply.contentType = t;
      return reply;
    }),
    header: vi.fn(() => reply),
    send: vi.fn((p?: unknown) => {
      reply.payload = p;
      return reply;
    }),
  };
  return reply;
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    params: {},
    body: {},
    query: {},
    userId: "user-1",
    user: { orgId: "org-1", userId: "user-1", role: "ADMIN" },
    ...overrides,
  } as any;
}

/** Call handleWaMessages with the long positional signature filled in sensibly. */
function callHandleWaMessages(
  overrides: {
    type?: "send" | "receive";
    messageBody?: any;
    from?: string;
    platform?: any;
    sourceIdentifier?: string;
    userName?: string;
    messageId?: string;
    userId?: string;
    teamId?: string | null;
    messageType?: any;
    isAutomated?: boolean;
  } = {},
) {
  const o = {
    type: "receive" as const,
    messageBody: { messages: [{ type: "text", text: { body: "hi" } }] },
    from: "15550001",
    platform: PlatformType.WHATSAPP,
    sourceIdentifier: "phone-1",
    ...overrides,
  };
  return handleWaMessages(
    o.type,
    o.messageBody,
    o.from,
    "org-1",
    o.platform,
    o.sourceIdentifier,
    o.userName,
    o.messageId,
    o.userId,
    false,
    o.teamId ?? null,
    o.messageType ?? "INBOX",
    o.isAutomated ?? false,
    false,
    {},
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});

  m.byPhone.mockResolvedValue({ contact: { ...CONTACT }, conversation: { ...CONVERSATION } });
  m.byIgsId.mockResolvedValue({ contact: { ...CONTACT }, conversation: { ...CONVERSATION } });
  m.byPsid.mockResolvedValue({ contact: { ...CONTACT }, conversation: { ...CONVERSATION } });
  m.addNewWaMessage.mockResolvedValue(WA_MESSAGE);
  m.updateContact.mockResolvedValue({ ...CONTACT, waMessageAssignStatus: "UNASSIGNED" });
  m.handleImages.mockImplementation(async (b: unknown) => b);
  m.getContactById.mockResolvedValue({ ...CONTACT, igsId: "ig-1", psid: "ps-1", other: "web-1" });
  m.extractMentions.mockReturnValue([]);
});

describe("handleWaMessages - finding the contact", () => {
  test("resolves a WhatsApp sender by phone number", async () => {
    await callHandleWaMessages();

    expect(m.byPhone).toHaveBeenCalledWith(
      "15550001",
      "org-1",
      expect.objectContaining({ phone: "15550001", source: "whatsapp" }),
      undefined,
      true,
    );
  });

  test("resolves an Instagram sender by their IG id", async () => {
    await callHandleWaMessages({ platform: PlatformType.INSTAGRAM });

    expect(m.byIgsId).toHaveBeenCalledWith(
      "15550001",
      "org-1",
      expect.objectContaining({ igsId: "15550001" }),
      true,
    );
    expect(m.byPhone).not.toHaveBeenCalled();
  });

  test("resolves a Facebook sender by their page-scoped id", async () => {
    await callHandleWaMessages({ platform: PlatformType.FACEBOOK });

    expect(m.byPsid).toHaveBeenCalledWith(
      "15550001",
      "org-1",
      expect.objectContaining({ psid: "15550001", other: "15550001" }),
      true,
    );
  });

  test("files a webchat visitor under `other` rather than a phone", async () => {
    await callHandleWaMessages({ platform: PlatformType.WEBCHAT });

    expect(m.byPhone).toHaveBeenCalledWith(
      "15550001",
      "org-1",
      expect.objectContaining({ other: "15550001", source: PlatformType.WEBCHAT }),
      PlatformType.WEBCHAT,
      true,
    );
  });
});

describe("handleWaMessages - enriching the contact from the platform", () => {
  test("adds the Instagram profile to an inbound message", async () => {
    m.igDetails.mockResolvedValue({
      name: "Ada",
      username: "ada_l",
      follower_count: 12,
      is_verified_user: true,
    });

    await callHandleWaMessages({ platform: PlatformType.INSTAGRAM });

    expect(m.igDetails).toHaveBeenCalledWith("15550001", "phone-1");
    expect(m.byIgsId.mock.calls[0][2]).toMatchObject({
      name: "Ada",
      whatsappUserName: "ada_l",
      followerCount: 12,
      isIgVerifiedUser: true,
    });
  });

  test("still records the message when the Instagram lookup fails", async () => {
    m.igDetails.mockRejectedValue(new Error("meta down"));

    const result = await callHandleWaMessages({ platform: PlatformType.INSTAGRAM });

    expect(result).toEqual(WA_MESSAGE);
    expect(m.addNewWaMessage).toHaveBeenCalled();
  });

  test("adds the Facebook profile to an inbound message", async () => {
    m.fbDetails.mockResolvedValue({
      name: "Grace",
      email: "grace@acme.com",
      profile_pic: "https://pic",
    });

    await callHandleWaMessages({ platform: PlatformType.FACEBOOK });

    expect(m.byPsid.mock.calls[0][2]).toMatchObject({
      name: "Grace",
      email: "grace@acme.com",
      profilePic: "https://pic",
    });
  });

  test("does not look up a platform profile for outbound messages", async () => {
    await callHandleWaMessages({ type: "send", platform: PlatformType.INSTAGRAM });

    expect(m.igDetails).not.toHaveBeenCalled();
  });
});

describe("handleWaMessages - stamping the contact's activity", () => {
  test("records an inbound message against lastReceivedMessageTimeStamp", async () => {
    await callHandleWaMessages({ type: "receive" });

    const data = m.byPhone.mock.calls[0][2];
    expect(data.lastReceivedMessageTimeStamp).toBe("2026-07-27T09:00:00Z");
    expect(data.lastSentMessageTimeStamp).toBeUndefined();
  });

  test("records an outbound message against lastSentMessageTimeStamp", async () => {
    await callHandleWaMessages({ type: "send" });

    const data = m.byPhone.mock.calls[0][2];
    expect(data.lastSentMessageTimeStamp).toBe("2026-07-27T09:00:00Z");
    expect(data.lastReceivedMessageTimeStamp).toBeUndefined();
  });

  test("remembers which channel and identifier the message arrived on", async () => {
    await callHandleWaMessages();

    expect(m.byPhone.mock.calls[0][2]).toMatchObject({
      lastMessagePlatform: PlatformType.WHATSAPP,
      lastMessageSourceIdentifier: "phone-1",
    });
  });
});

describe("handleWaMessages - reopening a closed chat", () => {
  test("moves a closed conversation back to UNASSIGNED when the customer writes in", async () => {
    m.byPhone.mockResolvedValue({
      contact: { ...CONTACT, isSpam: false, waMessageAssignStatus: WaMessageAssignStatus.CLOSED },
      conversation: { ...CONVERSATION },
    });

    await callHandleWaMessages({ type: "receive" });

    expect(m.updateContact).toHaveBeenCalledWith("contact-1", "org-1", {
      waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED,
    });
  });

  test("leaves a spam contact's closed chat closed", async () => {
    m.byPhone.mockResolvedValue({
      contact: { ...CONTACT, isSpam: true, waMessageAssignStatus: WaMessageAssignStatus.CLOSED },
      conversation: { ...CONVERSATION },
    });

    await callHandleWaMessages({ type: "receive" });

    expect(m.updateContact).not.toHaveBeenCalled();
  });

  test("does not reopen on an outbound message", async () => {
    m.byPhone.mockResolvedValue({
      contact: { ...CONTACT, waMessageAssignStatus: WaMessageAssignStatus.CLOSED },
      conversation: { ...CONVERSATION },
    });

    await callHandleWaMessages({ type: "send" });

    expect(m.updateContact).not.toHaveBeenCalled();
  });

  test("downloads and stores inbound WhatsApp images", async () => {
    await callHandleWaMessages({ type: "receive", platform: PlatformType.WHATSAPP });

    expect(m.handleImages).toHaveBeenCalled();
  });

  test("does not run the WhatsApp image step for Instagram", async () => {
    await callHandleWaMessages({ type: "receive", platform: PlatformType.INSTAGRAM });

    expect(m.handleImages).not.toHaveBeenCalled();
  });
});

describe("handleWaMessages - choosing the conversation", () => {
  test("opens a new conversation for an inbound message when none is active", async () => {
    m.byPhone.mockResolvedValue({
      contact: { ...CONTACT, waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED },
      conversation: null,
    });
    m.getActiveConversation.mockResolvedValue(null);
    m.openConversation.mockResolvedValue({ id: "conv-new", subject: null });

    await callHandleWaMessages({ type: "receive" });

    expect(m.openConversation).toHaveBeenCalledWith("contact-1", "org-1");
    expect(m.addNewWaMessage.mock.calls[0][5]).toBe("conv-new");
  });

  test("reuses the active conversation rather than opening another", async () => {
    m.byPhone.mockResolvedValue({
      contact: { ...CONTACT, waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED },
      conversation: null,
    });
    m.getActiveConversation.mockResolvedValue({ id: "conv-active", subject: "Set" });

    await callHandleWaMessages({ type: "receive" });

    expect(m.openConversation).not.toHaveBeenCalled();
    expect(m.addNewWaMessage.mock.calls[0][5]).toBe("conv-active");
  });

  test("appends an outbound message to the last conversation", async () => {
    m.byPhone.mockResolvedValue({ contact: { ...CONTACT }, conversation: null });
    m.getLastConversation.mockResolvedValue({ id: "conv-last", subject: "Set" });

    await callHandleWaMessages({ type: "send" });

    expect(m.getLastConversation).toHaveBeenCalledWith("contact-1");
    expect(m.openConversation).not.toHaveBeenCalled();
  });
});

describe("handleWaMessages - titling the ticket", () => {
  test("titles a blank conversation from the message that opened it", async () => {
    m.byPhone.mockResolvedValue({
      contact: { ...CONTACT },
      conversation: { id: "conv-1", subject: null },
    });
    m.deriveSubject.mockReturnValue("My order is late");
    m.setSubjectIfBlank.mockResolvedValue(true);

    await callHandleWaMessages();

    expect(m.setSubjectIfBlank).toHaveBeenCalledWith("conv-1", "My order is late");
  });

  test("never overwrites a title the conversation already has", async () => {
    await callHandleWaMessages();

    expect(m.deriveSubject).not.toHaveBeenCalled();
    expect(m.setSubjectIfBlank).not.toHaveBeenCalled();
  });

  test("leaves the conversation untitled when the message yields no subject", async () => {
    m.byPhone.mockResolvedValue({
      contact: { ...CONTACT },
      conversation: { id: "conv-1", subject: null },
    });
    m.deriveSubject.mockReturnValue(null);

    await callHandleWaMessages();

    expect(m.setSubjectIfBlank).not.toHaveBeenCalled();
  });
});

describe("handleWaMessages - outbound bookkeeping", () => {
  test("maps an outbound message to its org and team", async () => {
    await callHandleWaMessages({ type: "send", teamId: "team-1", messageType: "CAMPAIGN" });

    expect(m.createWaMessageOrgTeamMap).toHaveBeenCalledWith({
      teamId: "team-1",
      messageId: "msg-1",
      orgId: "org-1",
      isAutomedMessage: false,
      type: "CAMPAIGN",
      externalApi: false,
    });
  });

  test.each([
    ["an empty team id", ""],
    ["a whitespace-only team id", "   "],
  ])("stores %s as no team", async (_name, teamId) => {
    await callHandleWaMessages({ type: "send", teamId });

    expect(m.createWaMessageOrgTeamMap.mock.calls[0][0].teamId).toBeNull();
  });

  test("does not map inbound messages to a team", async () => {
    await callHandleWaMessages({ type: "receive" });

    expect(m.createWaMessageOrgTeamMap).not.toHaveBeenCalled();
  });

  test("records the first reply as the conversation's response time", async () => {
    m.isFirstSend.mockResolvedValue(true);

    await callHandleWaMessages({ type: "send", userId: "user-1" });

    // (conversationId, orgId, data) — the orgId was threaded in for
    const [, , data] = m.updateConversation.mock.calls[0];
    expect(data.firstRespondedAt).toBeInstanceOf(Date);
    expect(data.firstRespondedByUserAt).toBeInstanceOf(Date);
  });

  test("does not credit an automated first reply to a user", async () => {
    m.isFirstSend.mockResolvedValue(true);

    await callHandleWaMessages({ type: "send", userId: undefined });

    expect(m.updateConversation.mock.calls[0][1].firstRespondedByUserAt).toBeUndefined();
  });

  test("records the first human reply after an automated one", async () => {
    m.isFirstSend.mockResolvedValue(false);
    m.isFirstUserSend.mockResolvedValue(true);

    await callHandleWaMessages({ type: "send", userId: "user-1" });

    expect(m.updateConversation).toHaveBeenCalledWith("conv-1", "org-1", {
      firstRespondedByUserAt: expect.any(Date),
    });
  });

  test("leaves response times alone for a later reply", async () => {
    m.isFirstSend.mockResolvedValue(false);
    m.isFirstUserSend.mockResolvedValue(false);

    await callHandleWaMessages({ type: "send" });

    expect(m.updateConversation).not.toHaveBeenCalled();
  });

  test("attaches the resolved template to an outbound template message", async () => {
    m.getTemplate.mockResolvedValue({ data: { name: "order_update" } });

    await callHandleWaMessages({
      type: "send",
      messageBody: { type: "template", template: { name: "order_update", components: [{ a: 1 }] } },
    });

    expect(m.getTemplate).toHaveBeenCalledWith("order_update", "org-1");
    expect(m.addNewWaMessage.mock.calls[0][6]).toEqual([{ a: 1 }]);
  });
});

describe("handleWaMessages - fanning out", () => {
  test("raises the Zapier new-message trigger for inbound messages only", async () => {
    await callHandleWaMessages({ type: "receive", messageId: "wamid-1" });

    expect(m.zapier).toHaveBeenCalledWith(
      "NEW_MESSAGE",
      { NEW_MESSAGE: expect.objectContaining({ messageId: "wamid-1", from: "15550001" }) },
      "org-1",
    );
  });

  test("raises no Zapier trigger for outbound messages", async () => {
    await callHandleWaMessages({ type: "send" });

    expect(m.zapier).not.toHaveBeenCalled();
  });

  test("pushes the message to connected clients, naming the ticket it landed on", async () => {
    await callHandleWaMessages();

    const [orgId, payload, channel] = m.sendViaWs.mock.calls[0];
    expect(orgId).toBe("org-1");
    expect(payload.inbox.contact).toMatchObject({
      id: "contact-1",
      conversationId: "conv-1",
      conversationStatus: "OPEN",
    });
    expect(payload.inbox.message).toEqual(WA_MESSAGE);
    expect(channel).toBe("main");
  });

  test("pushes webchat traffic down the fab channel", async () => {
    await callHandleWaMessages({ platform: PlatformType.WEBCHAT });

    expect(m.sendViaWs.mock.calls[0][2]).toBe("fab");
  });

  test("returns the stored message", async () => {
    await expect(callHandleWaMessages()).resolves.toEqual(WA_MESSAGE);
  });

  // A storage failure is logged and rethrown, so the caller can tell the message was
  // never stored rather than receiving undefined and treating it as a success.
  test("reports a storage failure rather than swallowing it", async () => {
    m.addNewWaMessage.mockRejectedValue(new Error("db down"));

    await expect(callHandleWaMessages()).rejects.toThrow("db down");
    expect(m.sendViaWs).not.toHaveBeenCalled();
  });
});

describe("sendNewWaMessageHandler", () => {
  test("sends a plain text message to the contact's phone", async () => {
    const request = makeRequest({
      params: { contactId: "contact-1" },
      body: {
        type: "text",
        media: [],
        text: { body: "hello" },
        platform: PlatformType.WHATSAPP,
        whatsappSettingsPhoneId: "phone-1",
        teamId: "team-1",
      },
    });
    const reply = makeReply();

    await sendNewWaMessageHandler(request, reply);

    expect(m.createTextMessage).toHaveBeenCalledWith(
      "15550001",
      "",
      "hello",
      PlatformType.WHATSAPP,
    );
    expect(m.sendMessage).toHaveBeenCalled();
    expect(reply.payload).toBe("Message Sent");
  });

  test.each([
    ["Instagram", PlatformType.INSTAGRAM, "ig-1"],
    ["Facebook", PlatformType.FACEBOOK, "ps-1"],
    ["webchat", PlatformType.WEBCHAT, "web-1"],
    ["WhatsApp", PlatformType.WHATSAPP, "15550001"],
  ])("addresses a %s message to the right identifier", async (_name, platform, expected) => {
    const request = makeRequest({
      params: { contactId: "contact-1" },
      body: { type: "text", media: [], text: { body: "hi" }, platform },
    });

    await sendNewWaMessageHandler(request, makeReply());

    expect(m.createTextMessage.mock.calls[0][0]).toBe(expected);
  });

  test("returns 404 without sending when the contact is unknown", async () => {
    m.getContactById.mockResolvedValue(null);
    const reply = makeReply();

    await sendNewWaMessageHandler(
      makeRequest({ params: { contactId: "nope" }, body: { type: "text", media: [] } }),
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.payload).toBe("Contact not found");
    expect(m.sendMessage).not.toHaveBeenCalled();
  });

  test("sends text with attachments as a captioned media message", async () => {
    const request = makeRequest({
      params: { contactId: "contact-1" },
      body: {
        type: "text",
        media: [{ url: "https://f/1.png" }],
        text: { body: "look at this" },
        platform: PlatformType.WHATSAPP,
      },
    });

    await sendNewWaMessageHandler(request, makeReply());

    expect(m.sendMediaMessages).toHaveBeenCalled();
    expect(m.sendMediaMessages.mock.calls[0][5]).toBe("look at this");
    expect(m.sendMessage).not.toHaveBeenCalled();
  });

  test("converts rich-text captions to WhatsApp formatting", async () => {
    const request = makeRequest({
      params: { contactId: "contact-1" },
      body: {
        type: "text",
        media: [{ url: "https://f/1.png" }],
        text: { body: { type: "doc", content: [] } },
        platform: PlatformType.WHATSAPP,
      },
    });

    await sendNewWaMessageHandler(request, makeReply());

    expect(m.parseRichText).toHaveBeenCalled();
    expect(m.sendMediaMessages.mock.calls[0][5]).toBe("parsed-rich-text");
  });

  test("sends a reaction against the message being reacted to", async () => {
    const request = makeRequest({
      params: { contactId: "contact-1" },
      body: {
        type: "reaction",
        reaction: { emoji: "👍", toWaMessageId: "wamid-9", reaction: true },
        platform: PlatformType.WHATSAPP,
      },
    });

    await sendNewWaMessageHandler(request, makeReply());

    expect(m.createReactionMessage).toHaveBeenCalledWith(
      "15550001",
      "wamid-9",
      "👍",
      true,
      PlatformType.WHATSAPP,
    );
    expect(m.sendMessage).toHaveBeenCalled();
  });

  test("sends standalone media", async () => {
    const request = makeRequest({
      params: { contactId: "contact-1" },
      body: {
        type: "media",
        media: [{ url: "https://f/1.png" }],
        platform: PlatformType.WHATSAPP,
      },
    });

    await sendNewWaMessageHandler(request, makeReply());

    expect(m.sendMediaMessages).toHaveBeenCalled();
  });

  test("does nothing for a media message with no attachments", async () => {
    const request = makeRequest({
      params: { contactId: "contact-1" },
      body: { type: "media", media: [], platform: PlatformType.WHATSAPP },
    });
    const reply = makeReply();

    await sendNewWaMessageHandler(request, reply);

    expect(m.sendMediaMessages).not.toHaveBeenCalled();
    expect(reply.payload).toBe("Message Sent");
  });

  test("sends a shared contact card", async () => {
    const request = makeRequest({
      params: { contactId: "contact-1" },
      body: { type: "contact", contacts: [{ name: "Ada" }], platform: PlatformType.WHATSAPP },
    });

    await sendNewWaMessageHandler(request, makeReply());

    expect(m.sendContactMessage).toHaveBeenCalledWith(
      [{ name: "Ada" }],
      "15550001",
      "org-1",
      "user-1",
      undefined,
      undefined,
    );
  });

  test("sends a shared location", async () => {
    // Real request bodies carry `latitude`/`longitude` as strings (matching the
    // `location` Zod schema) — the handler converts them to the numbers Meta's
    // Cloud API (and `WaSendMessageBody["location"]`) actually require.
    const request = makeRequest({
      params: { contactId: "contact-1" },
      body: {
        type: "location",
        location: { latitude: "1", longitude: "2", name: "HQ", address: "1 Main St" },
        platform: PlatformType.WHATSAPP,
      },
    });

    await sendNewWaMessageHandler(request, makeReply());

    expect(m.sendLocationMessage.mock.calls[0][0]).toEqual({
      latitude: 1,
      longitude: 2,
      name: "HQ",
      address: "1 Main St",
    });
  });

  test("returns 500 when sending throws", async () => {
    m.sendMessage.mockRejectedValue(new Error("gateway down"));
    const reply = makeReply();

    await sendNewWaMessageHandler(
      makeRequest({
        params: { contactId: "contact-1" },
        body: { type: "text", media: [], text: { body: "hi" }, platform: PlatformType.WHATSAPP },
      }),
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.payload).toBe("Internal Server Error");
  });
});

describe("getWaMessagesByContactIdHandler", () => {
  test("passes the paging cursor and conversation filter through", async () => {
    m.getWaMessagesByContactId.mockResolvedValue([{ id: "msg-1" }]);
    const reply = makeReply();

    await getWaMessagesByContactIdHandler(
      makeRequest({
        params: { contactId: "contact-1" },
        query: { cursor: "cur-1", phone: "15550001", conversationId: "conv-1" },
      }),
      reply,
    );

    expect(m.getWaMessagesByContactId).toHaveBeenCalledWith(
      "contact-1",
      "cur-1",
      "15550001",
      "conv-1",
    );
    expect(reply.payload).toEqual([{ id: "msg-1" }]);
  });

  test("defaults every optional filter to null (phone defaults to undefined)", async () => {
    m.getWaMessagesByContactId.mockResolvedValue([]);

    await getWaMessagesByContactIdHandler(
      makeRequest({ params: { contactId: "contact-1" }, query: {} }),
      makeReply(),
    );

    // `phone` is `undefined`, not `null`, here: getWaMessagesByContactId's `phone`
    // param only accepts `string | undefined` (matches the query schema's
    // `.optional()`), unlike `cursor`/`conversationId` which explicitly accept `null`.
    expect(m.getWaMessagesByContactId).toHaveBeenCalledWith("contact-1", null, undefined, null);
  });

  test("returns 500 when the lookup throws", async () => {
    m.getWaMessagesByContactId.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getWaMessagesByContactIdHandler(
      makeRequest({ params: { contactId: "contact-1" }, query: {} }),
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(500);
  });
});

describe("markMessagesAsReadHandler", () => {
  test("marks the conversation read for the calling user", async () => {
    m.markMessagesAsRead.mockResolvedValue({ count: 3 });
    const reply = makeReply();

    await markMessagesAsReadHandler(makeRequest({ params: { contactId: "contact-1" } }), reply);

    expect(m.markMessagesAsRead).toHaveBeenCalledWith("contact-1", "user-1");
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("returns 500 when marking fails", async () => {
    m.markMessagesAsRead.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await markMessagesAsReadHandler(makeRequest({ params: { contactId: "contact-1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("clearConversationMentionsHandler", () => {
  test("clears only the calling user's mentions on that conversation", async () => {
    const reply = makeReply();

    await clearConversationMentionsHandler(
      makeRequest({ params: { contactId: "contact-1" }, body: { conversationId: "conv-1" } }),
      reply,
    );

    expect(m.clearMentions).toHaveBeenCalledWith("user-1", "contact-1", "conv-1");
    expect(reply.payload).toEqual({ success: true });
  });

  test("falls back to the whole contact when no conversation is named", async () => {
    await clearConversationMentionsHandler(
      makeRequest({ params: { contactId: "contact-1" }, body: {} }),
      makeReply(),
    );

    expect(m.clearMentions).toHaveBeenCalledWith("user-1", "contact-1", null);
  });

  test("returns 500 when clearing fails", async () => {
    m.clearMentions.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await clearConversationMentionsHandler(
      makeRequest({ params: { contactId: "contact-1" }, body: {} }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("reopenConversationHandler", () => {
  test("reopens the named conversation for the calling user", async () => {
    m.reopenConversation.mockResolvedValue({ id: "conv-1", status: "OPEN" });
    const reply = makeReply();

    await reopenConversationHandler(
      makeRequest({
        params: { contactId: "contact-1" },
        body: { conversationId: "conv-1", messageId: "msg-1" },
      }),
      reply,
    );

    expect(m.reopenConversation).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      "contact-1",
      "conv-1",
      "msg-1",
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("returns 500 when reopening fails", async () => {
    m.reopenConversation.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await reopenConversationHandler(
      makeRequest({ params: { contactId: "contact-1" }, body: {} }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("createPrivateMessageHandler", () => {
  test("stores a plain-text note with the users it mentions", async () => {
    m.extractMentions.mockReturnValue(["alice"]);
    m.createInternalWaMessage.mockResolvedValue({ id: "note-1" });
    const reply = makeReply();

    await createPrivateMessageHandler(
      makeRequest({
        params: { contactId: "contact-1" },
        body: { text: { body: "@alice please look" }, messageId: "msg-1" },
      }),
      reply,
    );

    expect(m.extractMentions).toHaveBeenCalledWith("@alice please look");
    expect(m.createInternalWaMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId: "contact-1",
        privateMessageText: "@alice please look",
        trigerredByUser: "user-1",
        orgId: "org-1",
        exchangeProcess: "privateNote",
        mentionedUsers: ["alice"],
      }),
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("converts a rich-text note before storing it", async () => {
    await createPrivateMessageHandler(
      makeRequest({
        params: { contactId: "contact-1" },
        body: { text: { body: { type: "doc", content: [] } } },
      }),
      makeReply(),
    );

    expect(m.parseRichText).toHaveBeenCalled();
    expect(m.createInternalWaMessage.mock.calls[0][0].privateMessageText).toBe("parsed-rich-text");
  });

  test("passes explicit mention ids straight through", async () => {
    await createPrivateMessageHandler(
      makeRequest({
        params: { contactId: "contact-1" },
        body: { text: { body: "note" }, mentionedUserIds: ["user-9"] },
      }),
      makeReply(),
    );

    expect(m.createInternalWaMessage.mock.calls[0][0].mentionedUserIds).toEqual(["user-9"]);
  });

  test("returns 500 for a note whose body is neither text nor a document", async () => {
    const reply = makeReply();

    await createPrivateMessageHandler(
      makeRequest({ params: { contactId: "contact-1" }, body: { text: { body: 42 } } }),
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(m.createInternalWaMessage).not.toHaveBeenCalled();
  });
});

describe("getMediaFileByMediaId", () => {
  test("streams the file back with its own content type", async () => {
    m.getMediaFile.mockResolvedValue({ data: Buffer.from("bytes"), type: "image/png" });
    const reply = makeReply();

    await getMediaFileByMediaId(makeRequest({ params: { mediaId: "media-1" } }), reply);

    expect(m.getMediaFile).toHaveBeenCalledWith("media-1", "org-1");
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.contentType).toBe("image/png");
  });

  test("returns 404 when the media has no data", async () => {
    m.getMediaFile.mockResolvedValue({ data: null });
    const reply = makeReply();

    await getMediaFileByMediaId(makeRequest({ params: { mediaId: "media-1" } }), reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.payload).toBe("Media not found");
  });

  test("returns 500 when fetching the media throws", async () => {
    m.getMediaFile.mockRejectedValue(new Error("s3 down"));
    const reply = makeReply();

    await getMediaFileByMediaId(makeRequest({ params: { mediaId: "media-1" } }), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
  });
});
