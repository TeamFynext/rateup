import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../note/note.service.js", () => ({
  createNote: vi.fn(),
  editNote: vi.fn(),
  deleteNote: vi.fn(),
}));
vi.mock("./assignOwner.service.js", () => ({ assignConversationOwner: vi.fn() }));
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
  handleWaReceivedImages: vi.fn(async (b: unknown) => b),
  returnAppropriateTimeStamp: vi.fn(async () => "2026-07-27T09:00:00Z"),
}));
vi.mock("../../whatsappSurvey/wasurvey.utils.js", () => ({
  createReactionMessage: vi.fn(),
  createTextMessage: vi.fn(),
  parseToWhatsAppFormat: vi.fn(),
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
vi.mock("../../metering/meteredConversation.service.js", () => ({
  recordMessageInWindow: vi.fn(async () => ({ conversationId: "metered-1", opened: true })),
}));
vi.mock("./inboundNotify.js", () => ({ notifyInboundMessage: vi.fn() }));
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
vi.mock("hucre", () => ({
  XlsxStreamWriter: vi.fn(function (this: any) {
    this.addObject = vi.fn();
    this.finish = vi.fn(async () => Buffer.from("xlsx-bytes"));
  }),
}));
vi.mock("hucre/xlsx", () => ({ writeXlsx: vi.fn(async () => Buffer.from("xlsx-bytes")) }));
vi.mock("../../../../../generated/prisma/client.js", () => ({
  PlatformType: {
    WHATSAPP: "WHATSAPP",
    INSTAGRAM: "INSTAGRAM",
    FACEBOOK: "FACEBOOK",
    WEBCHAT: "WEBCHAT",
    INTERNAL: "INTERNAL",
  },
  MetaAgentThreadOwner: { AI: "AI", STAFF: "STAFF" },
  Prisma: {},
}));
vi.mock("../../../metaAgent/metaAgent.threadOwner.js", () => ({
  setMetaAgentThreadOwner: vi.fn(),
}));

import {
  assignWaMessageToUser,
  exportWhatsapChats,
  filterChats,
  generateChatAnalytics,
  generateChatFilterData,
  generateInboxResponse,
  getAssignedUserForContact,
  getContactsCountByInbox,
  getWaMessageLogs,
  setContactSpam,
  setConversationFavorite,
} from "./wamessage.service.js";
import { blockWhatsappUser, unblockWhatsappUser } from "../../whatsappSurvey/wasurvey.service.js";
import { writeXlsx } from "hucre/xlsx";
import { assignConversationOwner } from "./assignOwner.service.js";
import {
  assignWaMessageHandler,
  blockWhatsappUserHandler,
  bulkAssignWaMessageHandler,
  exportWaMessageLogsHandler,
  exportWhatsappChatsHandler,
  generateChatAnalyticsHandler,
  generateChatFilterDataHandler,
  generateInboxResponseHandler,
  getAssignedUserForContactHandler,
  getContactsCountByInboxTabHandler,
  getFilteredContactsHandler,
  getWaMessageLogsHandler,
  setContactFavoriteHandler,
  setContactSpamHandler,
  unblockWhatsappUserHandler,
} from "./wamessage.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  assign: assignWaMessageToUser as unknown as Mock,
  exportChats: exportWhatsapChats as unknown as Mock,
  filterChats: filterChats as unknown as Mock,
  analytics: generateChatAnalytics as unknown as Mock,
  filterData: generateChatFilterData as unknown as Mock,
  inboxResponse: generateInboxResponse as unknown as Mock,
  assignedUser: getAssignedUserForContact as unknown as Mock,
  counts: getContactsCountByInbox as unknown as Mock,
  logs: getWaMessageLogs as unknown as Mock,
  setSpam: setContactSpam as unknown as Mock,
  setFavorite: setConversationFavorite as unknown as Mock,
  block: blockWhatsappUser as unknown as Mock,
  unblock: unblockWhatsappUser as unknown as Mock,
  writeXlsx: writeXlsx as unknown as Mock,
};

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    headers: {} as Record<string, string>,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    status: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    type: vi.fn(() => reply),
    header: vi.fn((k: string, v: string) => {
      reply.headers[k] = v;
      return reply;
    }),
    send: vi.fn((p?: unknown) => {
      reply.payload = p;
      return reply;
    }),
  };
  return reply;
}

const ACTOR = {
  orgId: "org-1",
  userId: "user-1",
  scope: { all: false, teamIds: [], inbox: "all" },
} as any;

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    params: {},
    body: {},
    query: {},
    userId: "user-1",
    user: { orgId: "org-1", userId: "user-1", role: "ADMIN" },
    actor: ACTOR,
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("assignWaMessageHandler", () => {
  test("assigns the conversation on behalf of the calling user", async () => {
    m.assign.mockResolvedValue({ success: true });
    const reply = makeReply();
    const body = { contactId: "contact-1", assignees: ["user-9"] };

    await assignWaMessageHandler(makeRequest({ body }), reply);

    expect(m.assign).toHaveBeenCalledWith(body, "org-1", "user-1");
    expect(reply.payload).toEqual({ success: true });
  });

  // Answers 500 itself rather than letting the failure escape to Fastify's error
  // handler, consistent with every neighbouring handler.
  test("answers 500 when the service fails", async () => {
    m.assign.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await assignWaMessageHandler(makeRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.payload).toBe("Internal Server Error");
  });
});

describe("bulkAssignWaMessageHandler", () => {
  test("assigns every named conversation to the same person", async () => {
    m.assign.mockResolvedValue({ success: true });
    const reply = makeReply();

    await bulkAssignWaMessageHandler(
      makeRequest({
        body: { contactIds: ["c1", "c2", "c3"], assignee: "user-9", messageId: "msg-1" },
      }),
      reply,
    );

    expect(m.assign).toHaveBeenCalledTimes(3);
    expect(m.assign.mock.calls[0][0]).toEqual({
      contactId: "c1",
      assignees: ["user-9"],
      assignIfOnline: false,
      messageId: "msg-1",
    });
    expect(reply.payload).toMatchObject({
      message: "Chats assigned successfully",
      assignedCount: 3,
    });
  });

  test("hands each chat to the team's next member when given a team", async () => {
    const ownerMock = assignConversationOwner as unknown as ReturnType<typeof vi.fn>;
    ownerMock.mockResolvedValue({ assignees: [{ userId: "u2", teamId: "team-1" }] });
    const reply = makeReply();

    await bulkAssignWaMessageHandler(
      makeRequest({ body: { contactIds: ["c1", "c2"], teamId: "team-1" } }),
      reply,
    );

    expect(ownerMock).toHaveBeenCalledTimes(2);
    expect(ownerMock).toHaveBeenCalledWith({ contactId: "c1", teamId: "team-1" }, ACTOR);
    expect(m.assign).not.toHaveBeenCalled();
    expect(reply.payload.assignedCount).toBe(2);
  });

  test("honours the assign-if-online flag when given", async () => {
    m.assign.mockResolvedValue({});

    await bulkAssignWaMessageHandler(
      makeRequest({ body: { contactIds: ["c1"], assignee: "user-9", assignIfOnline: true } }),
      makeReply(),
    );

    expect(m.assign.mock.calls[0][0].assignIfOnline).toBe(true);
  });

  test("reports success with a zero count for an empty list", async () => {
    const reply = makeReply();

    await bulkAssignWaMessageHandler(
      makeRequest({ body: { contactIds: [], assignee: "user-9" } }),
      reply,
    );

    expect(m.assign).not.toHaveBeenCalled();
    expect(reply.payload.assignedCount).toBe(0);
  });

  // The loop is guarded per contact, so one failure no longer abandons the rest and the
  // caller can see exactly which conversations were assigned.
  test("carries on with the remaining conversations when one assignment fails", async () => {
    m.assign
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error("locked"))
      .mockResolvedValueOnce({ success: true });
    const reply = makeReply();

    await bulkAssignWaMessageHandler(
      makeRequest({ body: { contactIds: ["c1", "c2", "c3"], assignee: "user-9" } }),
      reply,
    );

    expect(m.assign).toHaveBeenCalledTimes(3);
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toMatchObject({
      message: "Assigned 2 of 3 chats",
      assignedCount: 2,
      failedCount: 1,
    });
  });

  test("names the contact that failed and the reason", async () => {
    m.assign
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error("locked"))
      .mockResolvedValueOnce({ success: true });
    const reply = makeReply();

    await bulkAssignWaMessageHandler(
      makeRequest({ body: { contactIds: ["c1", "c2", "c3"], assignee: "user-9" } }),
      reply,
    );

    expect(reply.payload.results).toEqual([
      { contactId: "c1", success: true, result: { success: true } },
      { contactId: "c2", success: false, error: "locked" },
      { contactId: "c3", success: true, result: { success: true } },
    ]);
  });

  test("falls back to a generic message when the failure has none", async () => {
    m.assign.mockRejectedValue({});
    const reply = makeReply();

    await bulkAssignWaMessageHandler(
      makeRequest({ body: { contactIds: ["c1"], assignee: "user-9" } }),
      reply,
    );

    expect(reply.payload.results[0]).toMatchObject({
      contactId: "c1",
      success: false,
      error: "Something went wrong",
    });
  });
});

describe("getAssignedUserForContactHandler", () => {
  test("returns who the conversation is assigned to", async () => {
    m.assignedUser.mockResolvedValue({ userId: "user-9" });
    const reply = makeReply();

    await getAssignedUserForContactHandler(makeRequest({ params: { contactId: "c1" } }), reply);

    expect(m.assignedUser).toHaveBeenCalledWith("c1");
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("returns 500 when the lookup throws", async () => {
    m.assignedUser.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getAssignedUserForContactHandler(makeRequest({ params: { contactId: "c1" } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("getContactsCountByInboxTabHandler", () => {
  test("counts the tabs for the caller's org, user and scope", async () => {
    m.counts.mockResolvedValue({ NEW: 2, ASSIGNED: 5 });
    const reply = makeReply();

    await getContactsCountByInboxTabHandler(makeRequest(), reply);

    expect(m.counts).toHaveBeenCalledWith("org-1", "user-1", ACTOR);
    expect(reply.payload).toEqual({ NEW: 2, ASSIGNED: 5 });
  });

  test("returns 500 when counting throws", async () => {
    m.counts.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getContactsCountByInboxTabHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("blocking and unblocking", () => {
  test("blocks the listed numbers and answers 200 with no body", async () => {
    m.block.mockResolvedValue({ success: true });
    const reply = makeReply();

    await blockWhatsappUserHandler(
      makeRequest({ body: { phoneNumbersList: ["15550001"] } }),
      reply,
    );

    expect(m.block).toHaveBeenCalledWith("org-1", ["15550001"]);
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toBeUndefined();
  });

  test("passes a refusal from WhatsApp back as a 400", async () => {
    m.block.mockResolvedValue({ success: false, reason: "not allowed" });
    const reply = makeReply();

    await blockWhatsappUserHandler(
      makeRequest({ body: { phoneNumbersList: ["15550001"] } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.payload).toEqual({ success: false, reason: "not allowed" });
  });

  test("returns 500 when blocking throws", async () => {
    m.block.mockRejectedValue(new Error("gateway down"));
    const reply = makeReply();

    await blockWhatsappUserHandler(makeRequest({ body: { phoneNumbersList: [] } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });

  test("unblocks the listed numbers", async () => {
    m.unblock.mockResolvedValue({ success: true });
    const reply = makeReply();

    await unblockWhatsappUserHandler(
      makeRequest({ body: { phoneNumbersList: ["15550001"] } }),
      reply,
    );

    expect(m.unblock).toHaveBeenCalledWith("org-1", ["15550001"]);
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("passes an unblock refusal back as a 400", async () => {
    m.unblock.mockResolvedValue({ success: false });
    const reply = makeReply();

    await unblockWhatsappUserHandler(makeRequest({ body: { phoneNumbersList: [] } }), reply);

    expect(reply.code).toHaveBeenCalledWith(400);
  });
});

describe("setContactSpamHandler", () => {
  test("marks the contact as spam, recording who did it", async () => {
    m.setSpam.mockResolvedValue({ success: true });
    const reply = makeReply();

    await setContactSpamHandler(
      makeRequest({ body: { contactId: "c1", isSpam: true, messageId: "msg-1" } }),
      reply,
    );

    expect(m.setSpam).toHaveBeenCalledWith("org-1", "c1", true, "user-1", "msg-1");
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("takes a contact back out of spam", async () => {
    m.setSpam.mockResolvedValue({ success: true });

    await setContactSpamHandler(
      makeRequest({ body: { contactId: "c1", isSpam: false } }),
      makeReply(),
    );

    expect(m.setSpam.mock.calls[0][2]).toBe(false);
  });

  test("returns 404 when the contact does not exist", async () => {
    m.setSpam.mockResolvedValue({ success: false });
    const reply = makeReply();

    await setContactSpamHandler(
      makeRequest({ body: { contactId: "missing", isSpam: true } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.payload).toEqual({ success: false, message: "Contact not found" });
  });

  test("returns 500 when marking throws", async () => {
    m.setSpam.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await setContactSpamHandler(makeRequest({ body: { contactId: "c1", isSpam: true } }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("setContactFavoriteHandler", () => {
  test("favourites the named conversation", async () => {
    m.setFavorite.mockResolvedValue({ success: true });
    const reply = makeReply();

    await setContactFavoriteHandler(
      makeRequest({ body: { conversationId: "conv-1", isFavorite: true } }),
      reply,
    );

    expect(m.setFavorite).toHaveBeenCalledWith("org-1", "conv-1", true);
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  test("returns 404 when the conversation does not exist", async () => {
    m.setFavorite.mockResolvedValue({ success: false });
    const reply = makeReply();

    await setContactFavoriteHandler(
      makeRequest({ body: { conversationId: "missing", isFavorite: true } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.payload).toEqual({ success: false, message: "Conversation not found" });
  });

  test("returns 500 when favouriting throws", async () => {
    m.setFavorite.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await setContactFavoriteHandler(makeRequest({ body: {} }), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("generateChatFilterDataHandler", () => {
  test("returns the filter options for the caller's org", async () => {
    m.filterData.mockResolvedValue({ teams: [], agents: [] });
    const reply = makeReply();

    await generateChatFilterDataHandler(makeRequest(), reply);

    expect(m.filterData).toHaveBeenCalledWith("org-1");
    expect(reply.status).toHaveBeenCalledWith(200);
  });

  test("answers 500 when the service yields nothing", async () => {
    m.filterData.mockResolvedValue(null);
    const reply = makeReply();

    await generateChatFilterDataHandler(makeRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
  });

  test("answers 500 when the lookup throws", async () => {
    m.filterData.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await generateChatFilterDataHandler(makeRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.payload).toBe("Internal Server Error");
  });
});

describe("getFilteredContactsHandler", () => {
  const filterData = encodeURIComponent(JSON.stringify({ status: ["NEW"] }));

  test("decodes the filter and scopes the query to the caller", async () => {
    m.filterChats.mockResolvedValue([{ id: "c1" }]);
    const reply = makeReply();

    await getFilteredContactsHandler(makeRequest({ query: { page: "2", filterData } }), reply);

    expect(m.filterChats).toHaveBeenCalledWith("org-1", 2, { status: ["NEW"] }, "user-1", ACTOR);
    expect(reply.payload).toEqual({ rows: [{ id: "c1" }], nextOffset: 3 });
  });

  test("stops paging when a page comes back empty", async () => {
    m.filterChats.mockResolvedValue([]);
    const reply = makeReply();

    await getFilteredContactsHandler(makeRequest({ query: { page: "1", filterData } }), reply);

    expect(reply.payload).toEqual({ rows: [], nextOffset: null });
  });

  test("treats a missing result as an empty page", async () => {
    m.filterChats.mockResolvedValue(null);
    const reply = makeReply();

    await getFilteredContactsHandler(makeRequest({ query: { page: "1", filterData } }), reply);

    expect(reply.payload).toEqual({ rows: [], nextOffset: null });
  });

  test("returns 500 for a filter that is not valid JSON", async () => {
    const reply = makeReply();

    await getFilteredContactsHandler(
      makeRequest({ query: { page: "1", filterData: "not-json" } }),
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(m.filterChats).not.toHaveBeenCalled();
  });

  test("returns 500 when filtering throws", async () => {
    m.filterChats.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getFilteredContactsHandler(makeRequest({ query: { page: "1", filterData } }), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
  });
});

describe("analytics and AI reply", () => {
  test("returns the org's chat analytics", async () => {
    m.analytics.mockResolvedValue({ total: 10 });
    const reply = makeReply();

    await generateChatAnalyticsHandler(makeRequest(), reply);

    expect(m.analytics).toHaveBeenCalledWith("org-1");
    expect(reply.status).toHaveBeenCalledWith(200);
  });

  test("returns 500 when analytics throws", async () => {
    m.analytics.mockRejectedValue(new Error("boom"));
    const reply = makeReply();

    await generateChatAnalyticsHandler(makeRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
  });

  test("generates a suggested reply for the caller", async () => {
    m.inboxResponse.mockResolvedValue({ text: "Sorry about that!" });
    const reply = makeReply();
    const body = { contactId: "c1", tone: "friendly" };

    await generateInboxResponseHandler(makeRequest({ body }), reply);

    expect(m.inboxResponse).toHaveBeenCalledWith(body, "org-1", "user-1");
    expect(reply.payload).toEqual({ text: "Sorry about that!" });
  });

  test("returns 500 when generating the reply throws", async () => {
    m.inboxResponse.mockRejectedValue(new Error("model down"));
    const reply = makeReply();

    await generateInboxResponseHandler(makeRequest({ body: {} }), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
  });
});

describe("getWaMessageLogsHandler", () => {
  test("splits the date range and pages the results", async () => {
    m.logs.mockResolvedValue({ data: [], total: 0 });
    const reply = makeReply();

    await getWaMessageLogsHandler(
      makeRequest({
        query: {
          dateRange: "2026-07-01,2026-07-27",
          status: "failed",
          source: "campaign",
          team: "team-1",
          searchQuery: "order",
          pageIndex: "2",
          pageSize: "50",
        },
      }),
      reply,
    );

    expect(m.logs).toHaveBeenCalledWith(
      "org-1",
      ["2026-07-01", "2026-07-27"],
      "failed",
      "campaign",
      "team-1",
      50,
      100,
      "order",
    );
  });

  test("defaults the filters and the first page", async () => {
    m.logs.mockResolvedValue({ data: [] });

    await getWaMessageLogsHandler(makeRequest({ query: {} }), makeReply());

    expect(m.logs).toHaveBeenCalledWith("org-1", [], "all", "all", "all", 25, 0, undefined);
  });

  test("returns 500 when fetching logs throws", async () => {
    m.logs.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getWaMessageLogsHandler(makeRequest({ query: {} }), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({
      error: "An error occurred while fetching the message logs.",
    });
  });
});

describe("exportWaMessageLogsHandler", () => {
  const row = {
    createdAt: "2026-07-27T09:00:00.000Z",
    phone: "15550001",
    status: "sent",
    sourceMessage: "CAMPAIGN",
    messageType: "TEMPLATE",
    messagePreview: "Your order shipped",
    logs: { attempt: 1 },
  };

  test("asks for one large page rather than paging", async () => {
    m.logs.mockResolvedValue({ data: [] });

    await exportWaMessageLogsHandler(makeRequest({ query: {} }), makeReply());

    expect(m.logs.mock.calls[0][5]).toBe(50000);
    expect(m.logs.mock.calls[0][6]).toBe(0);
  });

  test("writes the rows into a spreadsheet and offers it as a download", async () => {
    m.logs.mockResolvedValue({ data: [row] });
    const reply = makeReply();

    await exportWaMessageLogsHandler(makeRequest({ query: {} }), reply);

    const sheet = m.writeXlsx.mock.calls[0][0].sheets[0];
    expect(sheet.name).toBe("Message_Logs");
    expect(sheet.data[0]).toMatchObject({
      phone: "15550001",
      status: "sent",
      type: "TEMPLATE",
      message: "Your order shipped",
    });
    expect(reply.headers["Content-Disposition"]).toBe("attachment; filename=message_logs.xlsx");
  });

  test("presents the source in title case", async () => {
    m.logs.mockResolvedValue({ data: [row] });

    await exportWaMessageLogsHandler(makeRequest({ query: {} }), makeReply());

    expect(m.writeXlsx.mock.calls[0][0].sheets[0].data[0].source).toBe("Campaign");
  });

  test("labels a row with no source as an export", async () => {
    m.logs.mockResolvedValue({ data: [{ ...row, sourceMessage: null }] });

    await exportWaMessageLogsHandler(makeRequest({ query: {} }), makeReply());

    expect(m.writeXlsx.mock.calls[0][0].sheets[0].data[0].source).toBe("Export");
  });

  test("flattens log newlines and caps the cell length", async () => {
    const longLogs = { note: "x".repeat(40000), multi: "a\nb" };
    m.logs.mockResolvedValue({ data: [{ ...row, logs: longLogs }] });

    await exportWaMessageLogsHandler(makeRequest({ query: {} }), makeReply());

    const cell = m.writeXlsx.mock.calls[0][0].sheets[0].data[0].logs;
    expect(cell.length).toBeLessThanOrEqual(32000);
    expect(cell).not.toContain("\n");
  });

  test("leaves blank cells for a row with nothing in it", async () => {
    m.logs.mockResolvedValue({ data: [{}] });

    await exportWaMessageLogsHandler(makeRequest({ query: {} }), makeReply());

    expect(m.writeXlsx.mock.calls[0][0].sheets[0].data[0]).toMatchObject({
      timestamp: "",
      phone: "",
      status: "",
      message: "",
      logs: "",
    });
  });

  test("returns 500 when the export throws", async () => {
    m.logs.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await exportWaMessageLogsHandler(makeRequest({ query: {} }), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({
      error: "An error occurred while exporting the message logs.",
    });
  });
});

describe("exportWhatsappChatsHandler", () => {
  // The shape the Inbox export form sends: every date field, unused ones empty.
  const formValues = (date: Record<string, unknown>) => ({
    date: {
      type: "between",
      inclusive: false,
      between: { from: "", to: "" },
      before: "",
      after: "",
      on: "",
      ...date,
    },
    repliesOnly: false,
  });
  const validConstraints = formValues({ between: { from: "2026-07-01", to: "2026-07-27" } });
  const constraints = encodeURIComponent(JSON.stringify(validConstraints));
  const filterData = encodeURIComponent(JSON.stringify({ status: ["NEW"] }));

  test.each([
    ["an injected date", formValues({ type: "on", on: "2026-07-27' OR 1=1 --" })],
    ["a date with a time", formValues({ type: "before", before: "2026-07-27T00:00:00Z" })],
    ["the chosen date left empty", formValues({ type: "after" })],
    ["an unknown date type", formValues({ type: "sometime" })],
    ["a missing date", { repliesOnly: false }],
  ])("refuses constraints with %s", async (_name, value) => {
    const reply = makeReply();

    await exportWhatsappChatsHandler(
      makeRequest({
        query: { constraints: encodeURIComponent(JSON.stringify(value)), filterData },
      }),
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(m.exportChats).not.toHaveBeenCalled();
  });

  test("refuses constraints that are not JSON", async () => {
    const reply = makeReply();

    await exportWhatsappChatsHandler(
      makeRequest({ query: { constraints: "not-json", filterData } }),
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(m.exportChats).not.toHaveBeenCalled();
  });

  test("refuses to export without constraints", async () => {
    const reply = makeReply();

    await exportWhatsappChatsHandler(makeRequest({ query: {} }), reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.payload).toBe("Constraints not provided");
    expect(m.exportChats).not.toHaveBeenCalled();
  });

  test("exports a single short page and offers it as a download", async () => {
    m.exportChats.mockResolvedValue([
      { date: "2026-07-27", from: "15550001", name: "Ada", sendbody: "hello" },
    ]);
    const reply = makeReply();

    await exportWhatsappChatsHandler(makeRequest({ query: { constraints, filterData } }), reply);

    expect(m.exportChats).toHaveBeenCalledWith(
      "org-1",
      validConstraints,
      { status: ["NEW"] },
      5000,
      0,
    );
    expect(reply.headers["Content-Disposition"]).toBe("attachment; filename=export.xlsx");
  });

  test("keeps paging until a page comes back short", async () => {
    const fullPage = Array.from({ length: 5000 }, (_, i) => ({
      date: "d",
      from: "f",
      name: `n${i}`,
    }));
    m.exportChats.mockResolvedValueOnce(fullPage).mockResolvedValueOnce([{ date: "d" }]);

    await exportWhatsappChatsHandler(
      makeRequest({ query: { constraints, filterData } }),
      makeReply(),
    );

    expect(m.exportChats).toHaveBeenCalledTimes(2);
    expect(m.exportChats.mock.calls[1][4]).toBe(5000);
  });
});
