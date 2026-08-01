import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/prisma.js", () => {
  const tx = {
    contact: { update: vi.fn() },
    conversation: { updateMany: vi.fn() },
    conversationAssignedUserTeamMap: { updateMany: vi.fn() },
    waInboxAssign: { deleteMany: vi.fn() },
  };
  return {
    default: {
      __tx: tx,
      waMessage: { create: vi.fn() },
      waInboxAssign: {
        findMany: vi.fn(),
        update: vi.fn(),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      orgMember: { findUnique: vi.fn() },
      userAssignedCount: { upsert: vi.fn() },
      conversation: { updateMany: vi.fn() },
      conversationAssignedUserTeamMap: { findMany: vi.fn() },
      contact: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      inboxMention: { updateMany: vi.fn(), createMany: vi.fn() },
      user: { findUnique: vi.fn(), findMany: vi.fn() },
      $transaction: vi.fn(async (cb: (client: unknown) => Promise<unknown>) => cb(tx)),
      $executeRawUnsafe: vi.fn(),
    },
    excludeFields: vi.fn(),
  };
});

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
vi.mock("@faker-js/faker", () => ({ faker: {} }));
vi.mock("../../../contact/conversation/conversation.service.js", () => ({
  getConversationById: vi.fn(),
  getLastCreatedConversationForContact: vi.fn(),
  openConversationForContact: vi.fn(),
  resolveClosedByUserId: vi.fn(() => "user-1"),
  resolveInboxActor: vi.fn(() => ({ source: "user", userId: "user-1" })),
  setInboxStatus: vi.fn(),
  updateConversationAssignees: vi.fn(),
}));
vi.mock("../../../../utils/redisConnection.js", () => ({
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
import { updateContactById } from "../../../contact/contact.service.js";
import { getNotificationSettings } from "../../../notification/notification.service.js";
import { addZapierTriggerToQueue } from "../../../integrations/external/zapier/zapier.service.js";
import {
  getConversationById,
  getLastCreatedConversationForContact,
  openConversationForContact,
  resolveInboxActor,
  setInboxStatus,
  updateConversationAssignees,
} from "../../../contact/conversation/conversation.service.js";
import { notificationQueue } from "../../../../utils/redisConnection.js";
import { WaMessageAssignStatus } from "../../../../types/enums.js";
import {
  assignWaMessageToUser,
  clearMentionsForConversation,
  createInternalWaMessage,
  deleteAssignedUsersforContact,
  getAssignedUserForContact,
  getAssignedUsersCountForContactByTeam,
  markMessagesAsRead,
  reopenConversation,
  setContactSpam,
  setConversationFavorite,
} from "./wamessage.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  __tx: {
    contact: { update: Mock };
    conversation: { updateMany: Mock };
    conversationAssignedUserTeamMap: { updateMany: Mock };
    waInboxAssign: { deleteMany: Mock };
  };
  waMessage: { create: Mock };
  waInboxAssign: {
    findMany: Mock;
    update: Mock;
    createMany: Mock;
    deleteMany: Mock;
    count: Mock;
  };
  orgMember: { findUnique: Mock };
  userAssignedCount: { upsert: Mock };
  conversation: { updateMany: Mock };
  conversationAssignedUserTeamMap: { findMany: Mock };
  contact: { findFirst: Mock; findUnique: Mock; update: Mock };
  inboxMention: { updateMany: Mock; createMany: Mock };
  user: { findUnique: Mock; findMany: Mock };
  $transaction: Mock;
  $executeRawUnsafe: Mock;
};
const tx = db.__tx;

const updateContactMock = updateContactById as unknown as Mock;
const getLastConversationMock = getLastCreatedConversationForContact as unknown as Mock;
const getConversationByIdMock = getConversationById as unknown as Mock;
const openConversationMock = openConversationForContact as unknown as Mock;
const updateAssigneesMock = updateConversationAssignees as unknown as Mock;
const setInboxStatusMock = setInboxStatus as unknown as Mock;
const notificationSettingsMock = getNotificationSettings as unknown as Mock;
const zapierMock = addZapierTriggerToQueue as unknown as Mock;
const queueAddMock = (notificationQueue as unknown as { add: Mock }).add;
const resolveActorMock = resolveInboxActor as unknown as Mock;

const CONTACT = { id: "contact-1", orgId: "org-1", name: "Ada" };
const OPEN_CONVERSATION = { id: "conv-1", number: 7, status: WaMessageAssignStatus.UNASSIGNED };

function assignee(userId: string, teamId = "team-1") {
  return { userId, teamId };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});

  db.waInboxAssign.findMany.mockResolvedValue([]);
  db.waInboxAssign.createMany.mockResolvedValue({ count: 1 });
  db.waInboxAssign.deleteMany.mockResolvedValue({ count: 0 });
  db.waInboxAssign.count.mockResolvedValue(2);
  db.waInboxAssign.update.mockResolvedValue({});
  db.userAssignedCount.upsert.mockResolvedValue({});
  db.waMessage.create.mockResolvedValue({ id: "internal-1" });
  db.conversation.updateMany.mockResolvedValue({ count: 1 });
  db.conversationAssignedUserTeamMap.findMany.mockResolvedValue([]);
  db.contact.findUnique.mockResolvedValue(CONTACT);
  db.contact.findFirst.mockResolvedValue({ id: "contact-1", isSpam: false });
  db.user.findUnique.mockResolvedValue({ id: "user-1", name: "Grace" });
  db.user.findMany.mockResolvedValue([{ id: "user-9", name: "Ada" }]);
  db.$transaction.mockImplementation(async (cb: (client: unknown) => Promise<unknown>) => cb(tx));

  updateContactMock.mockResolvedValue(CONTACT);
  getLastConversationMock.mockResolvedValue(OPEN_CONVERSATION);
  openConversationMock.mockResolvedValue({ ...OPEN_CONVERSATION, id: "conv-new" });
  notificationSettingsMock.mockResolvedValue({ waMessageAssignNotification: true });
  resolveActorMock.mockReturnValue({ source: "user", userId: "user-1" });
});

describe("assignWaMessageToUser - adding people", () => {
  test("records the new assignee and bumps their workload counter", async () => {
    await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9")] } as any,
      "org-1",
      "user-1",
    );

    expect(db.waInboxAssign.createMany).toHaveBeenCalledWith({
      data: [{ contactId: "contact-1", assignedUserId: "user-9", teamId: "team-1" }],
      skipDuplicates: true,
    });
    expect(db.userAssignedCount.upsert.mock.calls[0][0].update).toEqual({
      assignCount: { increment: 1 },
    });
  });

  test("puts the contact into the assigned state", async () => {
    await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9")] } as any,
      "org-1",
      "user-1",
    );

    expect(updateContactMock).toHaveBeenCalledWith("contact-1", {
      waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
    });
  });

  test("moves an existing assignee to a new team without re-counting them", async () => {
    db.waInboxAssign.findMany.mockResolvedValue([{ assignedUserId: "user-9", teamId: "team-old" }]);

    await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9", "team-new")] } as any,
      "org-1",
      "user-1",
    );

    expect(db.waInboxAssign.update.mock.calls[0][0].data).toEqual({ teamId: "team-new" });
    expect(db.userAssignedCount.upsert).not.toHaveBeenCalled();
  });

  test("drops anyone left out of the incoming list", async () => {
    db.waInboxAssign.findMany.mockResolvedValue([{ assignedUserId: "user-old", teamId: "team-1" }]);

    await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9")] } as any,
      "org-1",
      "user-1",
    );

    expect(db.waInboxAssign.deleteMany).toHaveBeenCalledWith({
      where: { contactId: "contact-1", assignedUserId: { notIn: ["user-9"] } },
    });
  });
});

describe("assignWaMessageToUser - only assigning people who are online", () => {
  test.each([
    ["online", "online"],
    ["busy", "busy"],
  ])("assigns a %s agent", async (_name, status) => {
    db.orgMember.findUnique.mockResolvedValue({ status });

    await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9")], assignIfOnline: true } as any,
      "org-1",
      "user-1",
    );

    expect(db.waInboxAssign.createMany.mock.calls[0][0].data).toHaveLength(1);
  });

  test("refuses with a 400 when the agent is offline", async () => {
    db.orgMember.findUnique.mockResolvedValue({ status: "offline" });

    await expect(
      assignWaMessageToUser(
        { contactId: "contact-1", assignees: [assignee("user-9")], assignIfOnline: true } as any,
        "org-1",
        "user-1",
      ),
    ).rejects.toMatchObject({ message: "User is offline and cannot be assigned", statusCode: 400 });
  });

  test("does not check availability unless asked to", async () => {
    await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9")] } as any,
      "org-1",
      "user-1",
    );

    expect(db.orgMember.findUnique).not.toHaveBeenCalled();
  });
});

describe("assignWaMessageToUser - what the thread records", () => {
  test("writes a single reassignment note when people are swapped", async () => {
    db.waInboxAssign.findMany.mockResolvedValue([{ assignedUserId: "user-old", teamId: "team-1" }]);

    await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9")] } as any,
      "org-1",
      "user-1",
    );

    expect(db.waMessage.create).toHaveBeenCalledTimes(1);
    const body = db.waMessage.create.mock.calls[0][0].data.messageBody;
    expect(body.internal.assignStatus).toBe("REASSIGNED");
  });

  test("writes an assigned note when people are only added", async () => {
    await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9")] } as any,
      "org-1",
      "user-1",
    );

    expect(db.waMessage.create.mock.calls[0][0].data.messageBody.internal.assignStatus).toBe(
      WaMessageAssignStatus.ASSIGNED,
    );
  });

  test("writes an unassigned note when everyone is removed", async () => {
    db.waInboxAssign.findMany.mockResolvedValue([{ assignedUserId: "user-old", teamId: "team-1" }]);

    await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [] } as any,
      "org-1",
      "user-1",
    );

    expect(db.waMessage.create.mock.calls[0][0].data.messageBody.internal.assignStatus).toBe(
      WaMessageAssignStatus.UNASSIGNED,
    );
  });

  test("attributes an unattended assignment to RateUp", async () => {
    await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9")] } as any,
      "org-1",
      undefined,
    );

    const body = db.waMessage.create.mock.calls[0][0].data.messageBody;
    expect(body.internal.triggeredByUser).toEqual({ id: null, name: "RateUp" });
  });
});

describe("assignWaMessageToUser - which ticket it lands on", () => {
  test("assigns onto the live ticket when there is one", async () => {
    const result = await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9")] } as any,
      "org-1",
      "user-1",
    );

    expect(openConversationMock).not.toHaveBeenCalled();
    expect(updateAssigneesMock).toHaveBeenCalledWith(
      "conv-1",
      { assignees: [assignee("user-9")] },
      "user-1",
    );
    expect(result.conversation).toEqual({ id: "conv-1", number: 7, status: "UNASSIGNED" });
  });

  test("opens a successor ticket when the last one is closed", async () => {
    getLastConversationMock.mockResolvedValue({
      id: "conv-old",
      status: WaMessageAssignStatus.CLOSED,
    });

    const result = await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9")] } as any,
      "org-1",
      "user-1",
    );

    expect(openConversationMock).toHaveBeenCalledWith(
      "contact-1",
      "org-1",
      WaMessageAssignStatus.ASSIGNED,
    );
    expect(result.conversation!.id).toBe("conv-new");
  });

  test("opens a ticket when the contact has never had one", async () => {
    getLastConversationMock.mockResolvedValue(null);

    await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9")] } as any,
      "org-1",
      "user-1",
    );

    expect(openConversationMock).toHaveBeenCalled();
  });
});

describe("assignWaMessageToUser - telling people about it", () => {
  test("notifies a newly assigned agent who wants notifications", async () => {
    await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9")] } as any,
      "org-1",
      "user-1",
    );

    expect(queueAddMock).toHaveBeenCalledWith("notification", {
      systemNotificationData: expect.objectContaining({
        userId: "user-9",
        orgId: "org-1",
        subSource: "chat-assigned",
      }),
    });
  });

  test("stays quiet for an agent who turned the notification off", async () => {
    notificationSettingsMock.mockResolvedValue({ waMessageAssignNotification: false });

    await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9")] } as any,
      "org-1",
      "user-1",
    );

    expect(queueAddMock).not.toHaveBeenCalled();
  });

  test("raises the Zapier assignment trigger for the org", async () => {
    await assignWaMessageToUser(
      { contactId: "contact-1", assignees: [assignee("user-9")] } as any,
      "org-1",
      "user-1",
    );

    expect(zapierMock).toHaveBeenCalledWith(
      "CONTACT_ASSIGN",
      { CONTACT_ASSIGN: { contact: CONTACT, newAssignees: [assignee("user-9")] } },
      "org-1",
    );
  });
});

describe("reopenConversation", () => {
  test("carries the people still on the ticket over to the successor", async () => {
    getConversationByIdMock.mockResolvedValue({ id: "conv-old", status: "CLOSED" });
    db.conversationAssignedUserTeamMap.findMany.mockResolvedValue([
      { userId: "user-9", teamId: "team-1", lastRemovedAt: null },
    ]);

    await reopenConversation("org-1", "user-1", "contact-1", "conv-old");

    expect(db.waInboxAssign.createMany).toHaveBeenCalled();
    expect(updateContactMock).toHaveBeenCalledWith("contact-1", {
      waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
    });
  });

  test("falls back to whoever was revoked when nobody is still on it", async () => {
    getConversationByIdMock.mockResolvedValue({ id: "conv-old", status: "CLOSED" });
    db.conversationAssignedUserTeamMap.findMany.mockResolvedValue([
      { userId: "user-9", teamId: "team-1", lastRemovedAt: new Date() },
    ]);

    await reopenConversation("org-1", "user-1", "contact-1", "conv-old");

    expect(db.waInboxAssign.createMany.mock.calls[0][0].data[0].assignedUserId).toBe("user-9");
  });

  test("reopens unassigned when the ticket never had anyone on it", async () => {
    getConversationByIdMock.mockResolvedValue({
      id: "conv-old",
      status: WaMessageAssignStatus.CLOSED,
    });
    db.conversationAssignedUserTeamMap.findMany.mockResolvedValue([]);

    const result = await reopenConversation("org-1", "user-1", "contact-1", "conv-old");

    expect(openConversationMock).toHaveBeenCalledWith(
      "contact-1",
      "org-1",
      WaMessageAssignStatus.UNASSIGNED,
    );
    expect(setInboxStatusMock).toHaveBeenCalledWith("contact-1", WaMessageAssignStatus.UNASSIGNED, {
      source: "user",
      userId: "user-1",
    });
    expect(result.assignees).toEqual([]);
  });

  test("keeps a ticket that is still live rather than opening another", async () => {
    getConversationByIdMock.mockResolvedValue({ ...OPEN_CONVERSATION, id: "conv-live" });
    db.conversationAssignedUserTeamMap.findMany.mockResolvedValue([]);

    const result = await reopenConversation("org-1", "user-1", "contact-1", "conv-live");

    expect(openConversationMock).not.toHaveBeenCalled();
    expect(result.conversation!.id).toBe("conv-live");
  });

  test("uses the contact's latest ticket when none is named", async () => {
    db.conversationAssignedUserTeamMap.findMany.mockResolvedValue([]);

    await reopenConversation("org-1", "user-1", "contact-1");

    expect(getLastConversationMock).toHaveBeenCalledWith("contact-1");
    expect(getConversationByIdMock).not.toHaveBeenCalled();
  });
});

describe("assignment lookups", () => {
  test("lists who a contact is assigned to, with their names", async () => {
    db.waInboxAssign.findMany.mockResolvedValue([{ assignedUserId: "user-9" }]);

    await getAssignedUserForContact("contact-1");

    expect(db.waInboxAssign.findMany).toHaveBeenCalledWith({
      where: { contactId: "contact-1" },
      include: { assignedUser: { select: { name: true } } },
    });
  });

  test("counts a contact's assignees within one team", async () => {
    const result = await getAssignedUsersCountForContactByTeam("contact-1", "team-1");

    expect(db.waInboxAssign.count).toHaveBeenCalledWith({
      where: { contactId: "contact-1", teamId: "team-1" },
    });
    expect(result).toBe(2);
  });

  test("clears every assignee from a contact", async () => {
    await deleteAssignedUsersforContact("contact-1");

    expect(db.waInboxAssign.deleteMany).toHaveBeenCalledWith({
      where: { contactId: "contact-1" },
    });
  });
});

describe("setConversationFavorite", () => {
  test("favourites a ticket belonging to the caller's org", async () => {
    const result = await setConversationFavorite("org-1", "conv-1", true);

    expect(db.conversation.updateMany).toHaveBeenCalledWith({
      where: { id: "conv-1", contact: { orgId: "org-1" } },
      data: { isFavorite: true },
    });
    expect(result).toEqual({ success: true, isFavorite: true });
  });

  test("reports failure when the ticket is not the caller's to favourite", async () => {
    db.conversation.updateMany.mockResolvedValue({ count: 0 });

    await expect(setConversationFavorite("org-1", "conv-other", true)).resolves.toEqual({
      success: false,
      isFavorite: true,
    });
  });
});

describe("setContactSpam - marking", () => {
  test("flags the contact and closes them out of the inbox", async () => {
    await setContactSpam("org-1", "contact-1", true, "user-1");

    expect(tx.contact.update.mock.calls[0][0].data).toMatchObject({
      isSpam: true,
      waMessageAssignStatus: WaMessageAssignStatus.CLOSED,
      spamMarkedBy: "user-1",
    });
  });

  test("closes every still-open ticket, not just the latest", async () => {
    await setContactSpam("org-1", "contact-1", true, "user-1");

    expect(tx.conversation.updateMany.mock.calls[0][0]).toMatchObject({
      where: { contactId: "contact-1", closedAt: null },
      data: expect.objectContaining({ status: WaMessageAssignStatus.CLOSED, closeReason: "SPAM" }),
    });
  });

  test("revokes assignees rather than deleting the record of them", async () => {
    await setContactSpam("org-1", "contact-1", true, "user-1");

    expect(tx.conversationAssignedUserTeamMap.updateMany.mock.calls[0][0].data).toMatchObject({
      lastRemovedBy: "user-1",
    });
    expect(tx.waInboxAssign.deleteMany).toHaveBeenCalledWith({ where: { contactId: "contact-1" } });
  });

  test("marks the close as automated when no person did it", async () => {
    resolveActorMock.mockReturnValue({ source: "automation" });

    await setContactSpam("org-1", "contact-1", true);

    expect(tx.conversation.updateMany.mock.calls[0][0].data.closedByAutomation).toBe(true);
  });

  test("notes the event on the thread", async () => {
    await setContactSpam("org-1", "contact-1", true, "user-1");

    const body = db.waMessage.create.mock.calls[0][0].data.messageBody;
    expect(body.internal.text.body).toBe("marked this contact as spam");
  });
});

describe("setContactSpam - unmarking", () => {
  test("clears the flag without reopening the closed tickets", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "contact-1", isSpam: true });

    await setContactSpam("org-1", "contact-1", false, "user-1");

    expect(db.contact.update.mock.calls[0][0].data).toEqual({
      isSpam: false,
      spamMarkedAt: null,
      spamMarkedBy: null,
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test("notes the reversal on the thread", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "contact-1", isSpam: true });

    await setContactSpam("org-1", "contact-1", false, "user-1");

    expect(db.waMessage.create.mock.calls[0][0].data.messageBody.internal.text.body).toBe(
      "marked this contact as not spam",
    );
  });
});

describe("setContactSpam - nothing to do", () => {
  test("reports failure for a contact outside the caller's org", async () => {
    db.contact.findFirst.mockResolvedValue(null);

    const result = await setContactSpam("org-other", "contact-1", true, "user-1");

    expect(result).toEqual({ success: false, isSpam: false });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test("does no work when the contact is already in that state", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "contact-1", isSpam: true });

    const result = await setContactSpam("org-1", "contact-1", true, "user-1");

    expect(result).toEqual({ success: true, isSpam: true });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.waMessage.create).not.toHaveBeenCalled();
  });
});

describe("markMessagesAsRead", () => {
  test("adds the reader to the unread inbound messages only", async () => {
    await markMessagesAsRead("contact-1", "user-1");

    const [sql, contactId, userId] = db.$executeRawUnsafe.mock.calls[0];
    expect(sql).toContain(`'receive'`);
    expect(sql).toContain("readUsers");
    expect(contactId).toBe("contact-1");
    expect(userId).toBe("user-1");
  });
});

describe("clearMentionsForConversation", () => {
  test("clears the user's unseen mentions on one ticket", async () => {
    await clearMentionsForConversation("user-1", "contact-1", "conv-1");

    const where = db.inboxMention.updateMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ mentionedUserId: "user-1", clearedAt: null });
    expect(where.OR).toEqual([
      { conversationId: "conv-1" },
      { conversationId: null, contactId: "contact-1" },
    ]);
  });

  test("clears every mention on the contact when no ticket is named", async () => {
    await clearMentionsForConversation("user-1", "contact-1");

    expect(db.inboxMention.updateMany.mock.calls[0][0].where).toMatchObject({
      mentionedUserId: "user-1",
      contactId: "contact-1",
    });
  });

  test("stamps the moment they were cleared", async () => {
    await clearMentionsForConversation("user-1", "contact-1");

    expect(db.inboxMention.updateMany.mock.calls[0][0].data.clearedAt).toBeInstanceOf(Date);
  });
});

describe("createInternalWaMessage - system notes", () => {
  test("names who a chat was assigned to", async () => {
    db.user.findMany.mockResolvedValue([{ id: "user-9", name: "Ada" }]);

    await createInternalWaMessage({
      contactId: "contact-1",
      waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
      assignedUsers: [assignee("user-9")],
      trigerredByUser: "user-1",
      messageId: "msg-1",
    });

    expect(db.waMessage.create.mock.calls[0][0].data.messageBody.internal.text.body).toBe(
      "Chat assigned to Ada",
    );
  });

  test("falls back to a generic line when the names cannot be resolved", async () => {
    await createInternalWaMessage({
      contactId: "contact-1",
      waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
      trigerredByUser: "user-1",
      messageId: "msg-1",
    });

    expect(db.waMessage.create.mock.calls[0][0].data.messageBody.internal.text.body).toBe(
      "Assigned this chat",
    );
  });

  test("names who a chat was revoked from", async () => {
    await createInternalWaMessage({
      contactId: "contact-1",
      waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED,
      assignedUsers: [assignee("user-9")],
      trigerredByUser: "user-1",
      messageId: "msg-1",
    });

    expect(db.waMessage.create.mock.calls[0][0].data.messageBody.internal.text.body).toBe(
      "Chat revoked from Ada",
    );
  });

  test("names both sides of a reassignment", async () => {
    db.user.findMany.mockResolvedValue([
      { id: "user-9", name: "Ada" },
      { id: "user-old", name: "Grace" },
    ]);

    await createInternalWaMessage({
      contactId: "contact-1",
      waMessageAssignStatus: "REASSIGNED",
      assignedUsers: { added: [assignee("user-9")], removed: [assignee("user-old")] },
      trigerredByUser: "user-1",
      messageId: "msg-1",
    });

    expect(db.waMessage.create.mock.calls[0][0].data.messageBody.internal.text.body).toBe(
      "Chat reassigned from Grace to Ada",
    );
  });

  test("says a close came from automation when nobody triggered it", async () => {
    await createInternalWaMessage({
      contactId: "contact-1",
      waMessageAssignStatus: WaMessageAssignStatus.CLOSED,
      trigerredByUser: "Automation",
      messageId: "msg-1",
    });

    expect(db.waMessage.create.mock.calls[0][0].data.messageBody.internal.text.body).toBe(
      "marked this chat as closed by automation",
    );
  });

  test("labels a close a person made", async () => {
    await createInternalWaMessage({
      contactId: "contact-1",
      waMessageAssignStatus: WaMessageAssignStatus.CLOSED,
      trigerredByUser: "user-1",
      messageId: "msg-1",
    });

    expect(db.waMessage.create.mock.calls[0][0].data.messageBody.internal.text.body).toBe(
      "marked this chat as closed",
    );
  });

  test("files the note against the contact's latest ticket", async () => {
    await createInternalWaMessage({
      contactId: "contact-1",
      waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
      trigerredByUser: "user-1",
      messageId: "msg-1",
    });

    expect(db.waMessage.create.mock.calls[0][0].data.conversationId).toBe("conv-1");
  });
});

describe("createInternalWaMessage - private notes", () => {
  const privateNote = {
    contactId: "contact-1",
    exchangeProcess: "privateNote" as const,
    orgId: "org-1",
    privateMessageText: "@Ada please look",
    trigerredByUser: "user-1",
    messageId: "msg-1",
  };

  test("stores the note against the contact's ticket", async () => {
    db.user.findMany.mockResolvedValue([]);

    await createInternalWaMessage({ ...privateNote });

    const data = db.waMessage.create.mock.calls[0][0].data;
    expect(data.messageBody.exchangeProcess).toBe("privateNote");
    expect(data.messageBody.privateNote.text.body).toBe("@Ada please look");
  });

  test("prefers mention ids the client resolved over matching on names", async () => {
    await createInternalWaMessage({
      ...privateNote,
      mentionedUserIds: ["user-9"],
      mentionedUsers: ["Ada"],
    });

    expect(db.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["user-9"] } },
      select: { id: true, name: true },
    });
  });

  test("falls back to matching mentions by name", async () => {
    await createInternalWaMessage({ ...privateNote, mentionedUsers: ["Ada"] });

    expect(db.user.findMany).toHaveBeenCalledWith({
      where: { name: { in: ["Ada"] } },
      select: { id: true, name: true },
    });
  });

  test("records a queryable mention and notifies the person named", async () => {
    await createInternalWaMessage({ ...privateNote, mentionedUsers: ["Ada"] });

    expect(db.inboxMention.createMany).toHaveBeenCalledWith({
      data: [
        {
          orgId: "org-1",
          contactId: "contact-1",
          conversationId: "conv-1",
          mentionedUserId: "user-9",
          messageId: "internal-1",
        },
      ],
    });
    expect(queueAddMock).toHaveBeenCalledWith("notification", {
      systemNotificationData: expect.objectContaining({ userId: "user-9", subSource: "mentioned" }),
    });
  });

  test("writes no mention rows for a note that names nobody", async () => {
    db.user.findMany.mockResolvedValue([]);

    await createInternalWaMessage({ ...privateNote });

    expect(db.inboxMention.createMany).not.toHaveBeenCalled();
    expect(queueAddMock).not.toHaveBeenCalled();
  });

  test("refuses a private note with no org to notify within", async () => {
    await expect(createInternalWaMessage({ ...privateNote, orgId: undefined })).rejects.toThrow(
      "orgId is required to create notifications",
    );
  });

  test("refuses a private note against an unknown contact", async () => {
    db.contact.findUnique.mockResolvedValue(null);

    await expect(createInternalWaMessage({ ...privateNote })).rejects.toThrow("Contact not found");
  });
});
