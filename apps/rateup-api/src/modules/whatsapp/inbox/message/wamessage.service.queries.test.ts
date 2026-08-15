import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/prisma.js", () => ({
  default: {
    org: { findUnique: vi.fn() },
    contact: { findMany: vi.fn(), count: vi.fn() },
    conversation: { count: vi.fn() },
    inboxMention: { findMany: vi.fn() },
    waMessage: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  },
  excludeFields: vi.fn(),
}));

vi.mock("../../wa_axios.js", () => ({ callMetaApi: vi.fn() }));
vi.mock("../../settings/wa_settings.service.js", () => ({ getWaSettings: vi.fn() }));
vi.mock("../../settings/wa_channel_access.js", () => ({ getScopedSourceIdentifiers: vi.fn() }));
vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("../../../contact/contact.service.js", () => ({ updateContactById: vi.fn() }));
vi.mock("../../whatsappSurvey/wasurvey.controller.js", () => ({ wait: vi.fn() }));
vi.mock("../../whatsappSurvey/wasurvey.service.js", () => ({ sendMessage: vi.fn() }));
vi.mock("../../whatsappSurvey/wasurvey.utils.js", () => ({
  createAudioMessage: vi.fn(),
  createContactMessage: vi.fn(),
  createDocumentMessage: vi.fn(),
  createLocationMessage: vi.fn(),
  createReplyImageMessage: vi.fn(),
  createVideoMessage: vi.fn(),
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
vi.mock("../../../integrations/external/zapier/zapier.service.js", () => ({
  addZapierTriggerToQueue: vi.fn(),
  ZapierTriggers: { CONTACT_ASSIGN: "CONTACT_ASSIGN" },
}));
vi.mock("@faker-js/faker", () => ({
  faker: {
    datatype: { boolean: vi.fn(() => true) },
    lorem: { sentence: vi.fn(() => "a seeded sentence") },
  },
}));
vi.mock("../../../contact/conversation/conversation.service.js", () => ({
  getConversationById: vi.fn(),
  getLastCreatedConversationForContact: vi.fn(),
  openConversationForContact: vi.fn(),
  resolveClosedByUserId: vi.fn(),
  resolveInboxActor: vi.fn(),
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
  // The tag just needs to be inert here; these tests assert on the values passed
  // alongside the SQL, not on the SQL fragments themselves.
  Prisma: { sql: vi.fn(() => ({})), join: vi.fn(() => ({})), empty: {} },
}));

import prisma from "../../../../utils/prisma.js";
import { getScopedSourceIdentifiers } from "../../settings/wa_channel_access.js";
import { getWaSettings } from "../../settings/wa_settings.service.js";
import { getInboxCountsFromConversations } from "../inboxStats/inboxStats.service.js";
import { getTeamIdsByUserId } from "../../../team/team.service.js";
import { sendMessageQueue } from "../../../../workers/bullmq/queues/index.js";
import { log } from "../../../../utils/logger.js";
import { Role } from "../../../org/org.services.js";
import {
  exportWhatsapChats,
  filterChats,
  generateChatAnalytics,
  generateChatFilterData,
  generateInboxResponse,
  getChatByContactId,
  getContactsCountByInbox,
  getWaMessageLogs,
} from "./wamessage.service.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ByContactIdParams } from "../../../contact/contact.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  org: { findUnique: Mock };
  contact: { findMany: Mock; count: Mock };
  conversation: { count: Mock };
  inboxMention: { findMany: Mock };
  waMessage: { findMany: Mock };
  $queryRaw: Mock;
  $queryRawUnsafe: Mock;
};

const scopeMock = getScopedSourceIdentifiers as unknown as Mock;
const waSettingsMock = getWaSettings as unknown as Mock;
const inboxCountsMock = getInboxCountsFromConversations as unknown as Mock;
const teamIdsMock = getTeamIdsByUserId as unknown as Mock;
const queueAddMock = (sendMessageQueue as unknown as { add: Mock }).add;

/** Run filterChats and hand back the SQL and bind params it produced. */
async function runFilter(filters: Record<string, unknown> = {}, opts: any = {}) {
  db.$queryRawUnsafe.mockResolvedValue([]);
  await filterChats(
    opts.orgId ?? "org-1",
    opts.page ?? 1,
    filters as any,
    opts.userId ?? "user-1",
    opts.role ?? Role.SUPER_ADMIN,
  );
  const [sql, ...params] = db.$queryRawUnsafe.mock.calls[0];
  return { sql: sql as string, params };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});

  // clearAllMocks leaves queued `...Once` values behind, and these three are the
  // mocks tests queue onto; reset them so a leftover cannot bleed into the next test.
  db.$queryRaw.mockReset();
  db.$queryRawUnsafe.mockReset();
  db.contact.findMany.mockReset();

  db.$queryRaw.mockResolvedValue([]);
  db.$queryRawUnsafe.mockResolvedValue([]);
  db.org.findUnique.mockResolvedValue({ waAssignedChatPermission: "All" });
  db.contact.findMany.mockResolvedValue([]);
  db.contact.count.mockResolvedValue(0);
  db.conversation.count.mockResolvedValue(0);
  db.inboxMention.findMany.mockResolvedValue([]);
  db.waMessage.findMany.mockResolvedValue([]);
  scopeMock.mockResolvedValue({ all: true, identifiers: [] });
  teamIdsMock.mockResolvedValue(["team-1"]);
  inboxCountsMock.mockResolvedValue({ all_count: 10, open_count: 6, closed_count: 4 });
  waSettingsMock.mockResolvedValue({ accessToken: "token", phoneId: "pid", phone: "+15550001" });
});

describe("generateChatFilterData", () => {
  test("offers contact groups and campaigns as filter options", async () => {
    db.$queryRaw
      .mockResolvedValueOnce([{ contactTags: [] }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "g1", name: "VIPs" }])
      .mockResolvedValueOnce([{ id: "cam1", name: "Summer sale" }]);

    const result = await generateChatFilterData("org-1");

    expect(result![0]).toEqual({
      group: "Groups",
      items: [{ label: "VIPs", value: "contactGroups|-g1" }],
    });
    expect(result![1]).toEqual({
      group: "Campaigns",
      items: [{ label: "Summer sale", value: "campaigns|-cam1" }],
    });
  });

  test("builds one option group per configured contact tag", async () => {
    db.$queryRaw
      .mockResolvedValueOnce([{ contactTags: ["city"] }])
      .mockResolvedValueOnce([{ tags: { city: "Berlin" } }, { tags: { city: "Paris" } }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await generateChatFilterData("org-1");

    expect(result![2]).toEqual({
      group: "city",
      items: [
        { label: "Berlin", value: "city|-Berlin" },
        { label: "Paris", value: "city|-Paris" },
      ],
    });
  });

  test("lists each distinct tag value only once", async () => {
    db.$queryRaw
      .mockResolvedValueOnce([{ contactTags: ["city"] }])
      .mockResolvedValueOnce([{ tags: { city: "Berlin" } }, { tags: { city: "Berlin" } }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await generateChatFilterData("org-1");

    expect(result![2].items).toHaveLength(1);
  });

  test("returns null when the filter options cannot be built", async () => {
    db.$queryRaw.mockRejectedValue(new Error("db down"));

    await expect(generateChatFilterData("org-1")).resolves.toBeNull();
    expect(log.error).toHaveBeenCalled();
  });
});

describe("filterChats - which tickets the list may show", () => {
  test("hides spam contacts from the ordinary tabs", async () => {
    const { sql } = await runFilter({});

    expect(sql).toContain(`c."isSpam" = FALSE`);
  });

  test("shows only spam contacts on the spam tab, one row each", async () => {
    const { sql } = await runFilter({ spam: true });

    expect(sql).toContain(`c."isSpam" = TRUE`);
    // Contact-grained: the spam tab starts from Contact and laterals to its latest ticket.
    expect(sql).toContain(`FROM "Contact" c`);
    expect(sql).toContain("LEFT JOIN LATERAL");
  });

  test("starts from the ticket for every other tab", async () => {
    const { sql } = await runFilter({});

    expect(sql).toContain(`FROM "Conversation" conv`);
  });

  test("keeps a blocked contact who is also spam on the blocked tab", async () => {
    const { sql } = await runFilter({ blockedUsers: true });

    expect(sql).not.toContain(`c."isSpam" = FALSE`);
    expect(sql).toContain(`c."blockedOnWhatsApp" = TRUE`);
  });

  test("excludes blocked contacts by default", async () => {
    const { sql } = await runFilter({});

    expect(sql).toContain(`c."blockedOnWhatsApp" = FALSE`);
  });
});

describe("filterChats - channel scoping", () => {
  test("does not narrow channels for a super admin", async () => {
    await runFilter({}, { role: Role.SUPER_ADMIN });

    expect(scopeMock).not.toHaveBeenCalled();
  });

  test("narrows to the channels a member may see", async () => {
    scopeMock.mockResolvedValue({ all: false, identifiers: ["15550001"] });

    const { sql, params } = await runFilter({}, { role: Role.MEMBER });

    expect(sql).toContain(`wm."sourceIdentifier" = ANY`);
    expect(params).toContainEqual(["15550001"]);
  });

  test("matches nothing when a member is scoped to no channel at all", async () => {
    scopeMock.mockResolvedValue({ all: false, identifiers: [] });

    const { sql } = await runFilter({}, { role: Role.MEMBER });

    expect(sql).toContain("1 = 0");
  });

  test("applies no channel filter when the member may see them all", async () => {
    scopeMock.mockResolvedValue({ all: true, identifiers: [] });

    const { sql } = await runFilter({}, { role: Role.MEMBER });

    expect(sql).not.toContain("1 = 0");
  });
});

describe("filterChats - tabs and statuses", () => {
  test("limits the New tab to unassigned tickets from the last day", async () => {
    const { sql } = await runFilter({ waMessageAssignStatus: "New" });

    expect(sql).toContain("NOW() - INTERVAL '24 hours'");
    expect(sql).toContain(`conv."closedAt" IS NULL`);
  });

  test("treats every closed status as Addressed when no subset is picked", async () => {
    const { sql, params } = await runFilter({ waMessageAssignStatus: "Addressed" });

    expect(sql).toContain(`conv."closedAt" IS NOT NULL`);
    expect(params).toContainEqual(["CLOSED", "SPAM", "RESOLVED", "UNRESOLVED"]);
  });

  test("matches exactly the closed statuses the user picked", async () => {
    const { sql, params } = await runFilter({
      waMessageAssignStatus: "Addressed",
      status: ["RESOLVED"],
    });

    expect(params).toContainEqual(["RESOLVED"]);
    expect(sql).not.toContain(`OR conv."closedAt" IS NOT NULL`);
  });

  test("requires a live tab's tickets to carry no close stamp", async () => {
    const { sql } = await runFilter({ waMessageAssignStatus: "UnAssigned" });

    expect(sql).toContain(`conv."closedAt" IS NULL`);
  });

  test("does not demand an absent close stamp on a closed tab", async () => {
    const { sql } = await runFilter({ waMessageAssignStatus: "Closed" });

    expect(sql).not.toContain(`conv."closedAt" IS NULL`);
  });

  test("requires an assignment row for the caller on the Mine tab", async () => {
    const { sql, params } = await runFilter({ waMessageAssignStatus: "mine" });

    expect(sql).toContain(`cam."userId" =`);
    expect(sql).toContain(`winb."assignedUserId" =`);
    expect(params).toContain("user-1");
  });

  test("checks both the v2 and the legacy assignment tables", async () => {
    const { sql } = await runFilter({ status: ["ASSIGNED"] });

    expect(sql).toContain(`"ConversationAssignedUserTeamMap"`);
    expect(sql).toContain(`"WaInboxAssign"`);
  });
});

describe("filterChats - narrowing and sorting", () => {
  test("searches names and phone numbers, ignoring spaces in the number", async () => {
    const { sql, params } = await runFilter({ searchTerm: "ada smith" });

    expect(sql).toContain("ILIKE");
    expect(params).toContain("%ada smith%");
    expect(params).toContain("%adasmith%");
  });

  test("skips the tab filters entirely while searching", async () => {
    const { sql } = await runFilter({ searchTerm: "ada", waMessageAssignStatus: "New" });

    expect(sql).not.toContain("NOW() - INTERVAL '24 hours'");
  });

  test("filters by label, lifecycle and favourite", async () => {
    const { sql, params } = await runFilter({
      labels: ["label-1"],
      lifecycle: "life-1",
      favorite: true,
    });

    expect(sql).toContain(`"ContactLabelMap"`);
    expect(sql).toContain(`c."lifecycleId" =`);
    expect(sql).toContain(`conv."isFavorite" = TRUE`);
    expect(params).toContain("life-1");
  });

  test("shows only tickets with an unseen mention for the caller", async () => {
    const { sql } = await runFilter({ mentions: true });

    expect(sql).toContain(`"InboxMention"`);
    expect(sql).toContain(`m."clearedAt" IS NULL`);
  });

  test("narrows to one channel when a phone is picked", async () => {
    const { params } = await runFilter({ phone: "15550001" });

    expect(params).toContain("15550001");
    expect(params).toContain("+15550001");
  });

  test.each([
    ["newest first by default", undefined, "DESC"],
    ["oldest first when asked", "oldest", "ASC"],
    ["oldest customer message first", "oldest_wa_created", "ASC"],
  ])("sorts %s", async (_name, sortBy, direction) => {
    const { sql } = await runFilter(sortBy ? { sortBy } : {});

    expect(sql).toContain(`${direction} NULLS LAST`);
  });

  test("orders by the customer's own clock when asked", async () => {
    const { sql } = await runFilter({ sortBy: "newest_wa_created" });

    expect(sql).toContain(`conv."lastCustomerMessageAt"`);
  });

  test("pages twenty tickets at a time", async () => {
    const { sql, params } = await runFilter({}, { page: 3 });

    expect(sql).toContain("LIMIT 20 OFFSET $2");
    expect(params[1]).toBe(40);
  });
});

describe("filterChats - shaping the result", () => {
  test("returns an empty list when nothing matches", async () => {
    db.$queryRawUnsafe.mockResolvedValue([]);

    await expect(filterChats("org-1", 1, {} as any, "user-1", Role.SUPER_ADMIN)).resolves.toEqual(
      [],
    );
  });

  test("attaches each ticket's recent messages and last-message summary", async () => {
    db.$queryRawUnsafe.mockResolvedValue([
      {
        conversationId: "conv-1",
        lastMessageBody: { exchangeProcess: "receive" },
        lastMessageWaCreatedAt: "2026-07-27",
        lastMessagePlatform: "WHATSAPP",
        lastMessageSourceIdentifier: "phone-1",
        lastMessageDeletedAt: null,
        lastReceivedMetadata: { a: 1 },
      },
    ]);
    db.$queryRaw.mockResolvedValue([
      { id: "m1", conversationId: "conv-1", senderName: "Ada", senderProfilePhoto: null },
    ]);

    const [row] = await filterChats("org-1", 1, {} as any, "user-1", Role.SUPER_ADMIN);

    expect(row.lastMessage).toMatchObject({ sourcePlatform: "WHATSAPP" });
    expect(row.metadata).toEqual({ a: 1 });
    expect(row.messages).toHaveLength(1);
    expect(row.messages[0].sender).toEqual({ name: "Ada", profilePhoto: null });
  });

  test("leaves the summary null for a ticket with no messages yet", async () => {
    db.$queryRawUnsafe.mockResolvedValue([{ conversationId: "conv-1", lastMessageBody: null }]);

    const [row] = await filterChats("org-1", 1, {} as any, "user-1", Role.SUPER_ADMIN);

    expect(row.lastMessage).toBeNull();
    expect(row.messages).toEqual([]);
  });

  test("returns an empty list and logs when the query fails", async () => {
    db.$queryRawUnsafe.mockRejectedValue(new Error("bad parameter"));

    await expect(filterChats("org-1", 1, {} as any, "user-1", Role.SUPER_ADMIN)).resolves.toEqual(
      [],
    );
    expect(log.error).toHaveBeenCalled();
  });
});

describe("exportWhatsapChats", () => {
  async function runExport(constraints: any, limit?: number, offset?: number) {
    db.$queryRawUnsafe.mockResolvedValue([]);
    await exportWhatsapChats("org-1", constraints, {} as any, limit, offset);
    return db.$queryRawUnsafe.mock.calls[0][0] as string;
  }

  test("exports the org's chats, oldest first", async () => {
    const sql = await runExport({});

    expect(sql).toContain(`c."orgId" = $1::uuid`);
    expect(sql).toContain(`ORDER BY\n      wm."createdAt" ASC`);
    expect(db.$queryRawUnsafe.mock.calls[0][1]).toBe("org-1");
  });

  test("covers the whole of the last day in a between-dates export", async () => {
    const sql = await runExport({
      date: { type: "between", between: { from: "2026-07-01", to: "2026-07-27" } },
    });

    expect(sql).toContain(`wm."createdAt" >= '2026-07-01'`);
    // The upper bound rolls to the next day so the final day is included.
    expect(sql).toContain(`wm."createdAt" < '2026-07-28'`);
  });

  test.each([
    ["before, exclusive", { type: "before", before: "2026-07-27" }, "<"],
    ["before, inclusive", { type: "before", before: "2026-07-27", inclusive: true }, "<="],
    ["after, exclusive", { type: "after", after: "2026-07-01" }, ">"],
    ["after, inclusive", { type: "after", after: "2026-07-01", inclusive: true }, ">="],
  ])("respects a %s constraint", async (_name, date, operator) => {
    const sql = await runExport({ date });

    expect(sql).toContain(`${operator} '2026-07`);
  });

  test("matches a single day exactly", async () => {
    const sql = await runExport({ date: { type: "on", on: "2026-07-27" } });

    expect(sql).toContain(`= '2026-07-27'`);
  });

  test("limits the export to customer replies when asked", async () => {
    const sql = await runExport({ repliesOnly: true });

    expect(sql).toContain(`'exchangeProcess' = 'receive'`);
  });

  test("withholds the content of a message the customer revoked", async () => {
    const sql = await runExport({});

    expect(sql).toContain("This message was deleted");
    expect(sql).toContain(`wm."deletedAt" IS NOT NULL`);
  });

  test("pages when a limit is given", async () => {
    const sql = await runExport({}, 5000, 10000);

    expect(sql).toContain("LIMIT 5000 OFFSET 10000");
  });

  test("exports everything when no limit is given", async () => {
    const sql = await runExport({});

    expect(sql).not.toContain("LIMIT");
  });
});

describe("getContactsCountByInbox", () => {
  beforeEach(() => {
    db.$queryRaw
      .mockResolvedValueOnce([{ new_assigned_count: 2, new_unassigned_count: 5 }])
      .mockResolvedValueOnce([{ teamId: "team-1", assignedCount: 3 }])
      .mockResolvedValueOnce([{ count: 4 }]);
    db.conversation.count.mockResolvedValue(6);
    db.contact.count.mockResolvedValue(1);
  });

  test("reports the badge for every inbox tab", async () => {
    const result = await getContactsCountByInbox("org-1", "user-1", "ADMIN");

    expect(result).toMatchObject({
      new: 5,
      newAssigned: 2,
      newUnassigned: 5,
      assignedToMe: 4,
      mine: 4,
      spam: 1,
      favourite: 6,
      open: 6,
      closed: 4,
      total: 10,
    });
  });

  test("counts unassigned for the New badge so it matches the New list", async () => {
    const result = await getContactsCountByInbox("org-1", "user-1", "ADMIN");

    expect(result.new).toBe(result.newUnassigned);
    expect(result.new).not.toBe(result.newAssigned);
  });

  test("counts spam per contact, not per ticket", async () => {
    await getContactsCountByInbox("org-1", "user-1", "ADMIN");

    expect(db.contact.count).toHaveBeenCalledWith({ where: { orgId: "org-1", isSpam: true } });
  });

  test("excludes blocked and spam contacts from the favourite badge", async () => {
    await getContactsCountByInbox("org-1", "user-1", "ADMIN");

    expect(db.conversation.count).toHaveBeenCalledWith({
      where: {
        isFavorite: true,
        contact: { orgId: "org-1", blockedOnWhatsApp: false, isSpam: false },
      },
    });
  });

  test("counts one mention per ticket", async () => {
    db.inboxMention.findMany.mockResolvedValue([
      { conversationId: "conv-1", contactId: "contact-1" },
      { conversationId: "conv-1", contactId: "contact-1" },
      { conversationId: "conv-2", contactId: "contact-1" },
    ]);

    const result = await getContactsCountByInbox("org-1", "user-1", "ADMIN");

    expect(result.mentions).toBe(2);
  });

  // A mention written before threading has no conversationId and belongs to the contact.
  test("counts an un-threaded mention once for the whole contact", async () => {
    db.inboxMention.findMany.mockResolvedValue([
      { conversationId: null, contactId: "contact-1" },
      { conversationId: null, contactId: "contact-1" },
    ]);

    const result = await getContactsCountByInbox("org-1", "user-1", "ADMIN");

    expect(result.mentions).toBe(1);
  });

  test("reports zero for Mine when the query yields no row", async () => {
    db.$queryRaw.mockReset();
    db.$queryRaw
      .mockResolvedValueOnce([{ new_assigned_count: 0, new_unassigned_count: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    db.conversation.count.mockResolvedValue(0);
    db.contact.count.mockResolvedValue(0);
    db.inboxMention.findMany.mockResolvedValue([]);
    inboxCountsMock.mockResolvedValue({ all_count: 0, open_count: 0, closed_count: 0 });

    const result = await getContactsCountByInbox("org-1", "user-1", "ADMIN");

    expect(result.mine).toBe(0);
  });
});

describe("generateChatAnalytics", () => {
  test("returns the headline counts alongside the per-agent workload", async () => {
    db.$queryRaw
      .mockResolvedValueOnce([{ newChatCount: 3, waMessageCount: 120 }])
      .mockResolvedValueOnce([{ userId: "user-9", assignCount: 7, userName: "Ada" }]);

    const result = await generateChatAnalytics("org-1");

    expect(result).toMatchObject({ newChatCount: 3, waMessageCount: 120 });
    expect(result.assignedUserCounts).toEqual([
      { userId: "user-9", assignCount: 7, userName: "Ada" },
    ]);
  });

  test("still returns the workload list when the headline query is empty", async () => {
    db.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await expect(generateChatAnalytics("org-1")).resolves.toEqual({ assignedUserCounts: [] });
  });
});

describe("getChatByContactId", () => {
  function makeRes() {
    const res: any = {
      payload: undefined,
      statusCode: undefined,
      status: vi.fn((c: number) => {
        res.statusCode = c;
        return res;
      }),
      send: vi.fn((p: unknown) => {
        res.payload = p;
        return res;
      }),
    };
    return res;
  }

  test("returns the contact's webchat history oldest first", async () => {
    db.waMessage.findMany.mockResolvedValue([{ id: "m1" }]);
    const res = makeRes();

    await getChatByContactId(
      { params: { contactId: "contact-1" } } as unknown as FastifyRequest<{
        Params: ByContactIdParams;
      }>,
      res as unknown as FastifyReply,
    );

    expect(db.waMessage.findMany).toHaveBeenCalledWith({
      where: { contactId: "contact-1", sourcePlatform: "WEBCHAT" },
      orderBy: { waCreatedAt: "asc" },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("returns 500 when the history cannot be read", async () => {
    db.waMessage.findMany.mockRejectedValue(new Error("db down"));
    const res = makeRes();

    await getChatByContactId(
      { params: { contactId: "contact-1" } } as unknown as FastifyRequest<{
        Params: ByContactIdParams;
      }>,
      res as unknown as FastifyReply,
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.payload).toEqual({ error: "Failed to retrieve chat" });
  });
});

describe("generateInboxResponse", () => {
  test("queues the requested number of seeded messages per contact", async () => {
    db.contact.findMany.mockResolvedValue([
      { id: "c1", name: "Ada", phone: "15550001" },
      { id: "c2", name: "Grace", phone: "15550002" },
    ]);

    await generateInboxResponse(
      { numberOfContacts: 2, messagesPerContact: 3 } as any,
      "org-1",
      "user-1",
    );

    expect(queueAddMock).toHaveBeenCalledTimes(6);
    expect(queueAddMock.mock.calls[0][1]).toMatchObject({
      contactId: "c1",
      message: "a seeded sentence",
    });
  });

  test("passes the org's WhatsApp credentials to the queued job", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c1", name: "Ada", phone: "15550001" }]);

    await generateInboxResponse({ numberOfContacts: 1 } as any, "org-1", "user-1");

    expect(queueAddMock.mock.calls[0][1].options).toMatchObject({
      accessToken: "token",
      phoneId: "pid",
      sourceIdentifier: "15550001",
      orgId: "org-1",
    });
  });

  test("defaults to five contacts and one message each", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c1", name: "Ada", phone: "15550001" }]);

    await generateInboxResponse({} as any, "org-1", "user-1");

    expect(db.contact.findMany.mock.calls[0][0].take).toBe(5);
    expect(queueAddMock).toHaveBeenCalledTimes(1);
  });

  test("retries from the start when the random offset lands past the last contact", async () => {
    db.contact.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "c1", name: "Ada", phone: "15550001" }]);

    await generateInboxResponse({ numberOfContacts: 1 } as any, "org-1", "user-1");

    expect(db.contact.findMany).toHaveBeenCalledTimes(2);
    expect(db.contact.findMany.mock.calls[1][0].skip).toBeUndefined();
    expect(queueAddMock).toHaveBeenCalledTimes(1);
  });

  test("queues nothing when the org has no contacts", async () => {
    db.contact.findMany.mockResolvedValue([]);

    await generateInboxResponse({ numberOfContacts: 5 } as any, "org-1", "user-1");

    expect(queueAddMock).not.toHaveBeenCalled();
  });
});

describe("getWaMessageLogs", () => {
  test("reports the page alongside the total matching the filters", async () => {
    db.$queryRaw
      .mockResolvedValueOnce([{ count: 42n }])
      .mockResolvedValueOnce([{ id: "m1" }])
      .mockResolvedValueOnce([{ id: "m1", phone: "15550001", status: "sent" }]);

    const result = await getWaMessageLogs("org-1", [], "all", "all", "all", 25, 50);

    expect(result.data).toEqual([{ id: "m1", phone: "15550001", status: "sent" }]);
    expect(result.pagination).toEqual({
      total: 42,
      limit: 25,
      offset: 50,
      pageIndex: 2,
      pageSize: 25,
    });
  });

  test("skips the detail query entirely when nothing matches", async () => {
    db.$queryRaw.mockResolvedValueOnce([{ count: 0n }]).mockResolvedValueOnce([]);

    const result = await getWaMessageLogs("org-1");

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
  });

  test("reports a zero total when the count query yields no row", async () => {
    db.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await getWaMessageLogs("org-1");

    expect(result.pagination.total).toBe(0);
  });

  test("defaults to the first page of twenty-five", async () => {
    db.$queryRaw.mockResolvedValueOnce([{ count: 5n }]).mockResolvedValueOnce([]);

    const result = await getWaMessageLogs("org-1");

    expect(result.pagination).toMatchObject({ limit: 25, offset: 0, pageIndex: 0 });
  });
});
