import { beforeEach, describe, expect, test, vi } from "vitest";

// The pure helpers (conversationStatusData, resolveInboxActor) already have a
// suite in conversation.service.test.ts, which stubs prisma as an empty object.
// This file covers everything that actually talks to the database.

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    contact: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    conversation: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    conversationAssignedUserTeamMap: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    waMessage: { findMany: vi.fn(), deleteMany: vi.fn() },
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  },
}));

vi.mock("../../stats/stats.service.js", () => ({ incrementConversationCount: vi.fn() }));

vi.mock("../../whatsapp/inbox/inboxStats/inboxStats.service.js", () => ({
  mapStatusToField: vi.fn((status: string) => (status ? `${status.toLowerCase()}Count` : null)),
  transitionInboxStat: vi.fn(),
}));

import prisma from "../../../utils/prisma.js";
import { incrementConversationCount } from "../../stats/stats.service.js";
import { transitionInboxStat } from "../../whatsapp/inbox/inboxStats/inboxStats.service.js";
import { CloseReason, WaMessageAssignStatus } from "../../../types/enums.js";
import {
  checkIfFirstSendMessageInConversation,
  checkIfFirstUserSendMessageInConversation,
  createConversation,
  deleteConversation,
  deleteConversations,
  getActiveConversationForContact,
  getAvargeResponseTimeofTodyaInEveryHour,
  getConversationById,
  getConversationOnAccountDistribution,
  getConversationOverview,
  getConversationsByContactId,
  getLastCreatedConversationForContact,
  getOverAllQuickStatsOfConversations,
  getResolvedConversationWeeklyStats,
  getStaffDetailedConversationAnalytics,
  getTeamDetailedMetrics,
  mirrorConversationStatusTx,
  openConversationForContact,
  setConversationSubjectIfBlank,
  setInboxStatus,
  updateClosedConversationStatus,
  updateConversation,
  updateConversationAssignees,
} from "./conversation.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  contact: Record<string, Mock>;
  conversation: Record<string, Mock>;
  conversationAssignedUserTeamMap: Record<string, Mock>;
  waMessage: Record<string, Mock>;
  $queryRaw: Mock;
  $queryRawUnsafe: Mock;
  $transaction: Mock;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const USER_ACTOR = { source: "user", userId: USER } as const;

function tx() {
  return {
    contact: db.contact,
    conversation: db.conversation,
    conversationAssignedUserTeamMap: db.conversationAssignedUserTeamMap,
    waMessage: db.waMessage,
    $queryRaw: db.$queryRaw,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation((fn: any) => (typeof fn === "function" ? fn(tx()) : fn));
  db.$queryRaw.mockResolvedValue([]);
  db.$queryRawUnsafe.mockResolvedValue([]);
  db.contact.findUnique.mockResolvedValue(null);
  db.contact.findMany.mockResolvedValue([]);
  db.contact.update.mockResolvedValue({});
  db.conversation.create.mockResolvedValue({ id: "conv-1" });
  db.conversation.findFirst.mockResolvedValue(null);
  db.conversation.findUnique.mockResolvedValue(null);
  db.conversation.findMany.mockResolvedValue([]);
  db.conversation.update.mockResolvedValue({ id: "conv-1" });
  db.waMessage.findMany.mockResolvedValue([]);
  db.waMessage.deleteMany.mockResolvedValue({ count: 0 });
  db.conversation.deleteMany.mockResolvedValue({ count: 0 });
  db.conversationAssignedUserTeamMap.findMany.mockResolvedValue([]);
});

// ===========================================================================
// createConversation / openConversationForContact
// ===========================================================================

describe("createConversation", () => {
  test("connects the conversation to its contact and counts it", async () => {
    await createConversation({ contactId: "c1", orgId: ORG } as any);

    expect(db.conversation.create).toHaveBeenCalledWith({
      data: { contact: { connect: { id: "c1" } }, orgId: ORG },
    });
    expect(incrementConversationCount).toHaveBeenCalledWith(ORG);
  });
});

describe("openConversationForContact", () => {
  test("a contact's first conversation starts at reopen count zero", async () => {
    await openConversationForContact("c1", ORG);

    expect(db.conversation.create.mock.calls[0][0].data).toEqual({
      contactId: "c1",
      orgId: ORG,
      status: WaMessageAssignStatus.UNASSIGNED,
      reopenCount: 0,
    });
  });

  test("a successor carries the reopen counter forward", async () => {
    db.conversation.findFirst.mockResolvedValue({ id: "conv-old", reopenCount: 2 });

    await openConversationForContact("c1", ORG);

    expect(db.conversation.create.mock.calls[0][0].data.reopenCount).toBe(3);
  });

  test("honours an explicit opening status", async () => {
    await openConversationForContact("c1", ORG, WaMessageAssignStatus.ASSIGNED);

    expect(db.conversation.create.mock.calls[0][0].data.status).toBe(
      WaMessageAssignStatus.ASSIGNED,
    );
  });

  test("counts the new conversation against the org", async () => {
    await openConversationForContact("c1", ORG);

    expect(incrementConversationCount).toHaveBeenCalledWith(ORG);
  });
});

// ===========================================================================
// mirrorConversationStatusTx
// ===========================================================================

describe("mirrorConversationStatusTx", () => {
  test("targets the contact's most recent conversation by default", async () => {
    db.conversation.findFirst.mockResolvedValue({ id: "conv-1", status: "ASSIGNED" });

    await mirrorConversationStatusTx(tx(), "c1", WaMessageAssignStatus.CLOSED, USER_ACTOR);

    expect(db.conversation.findFirst.mock.calls[0][0]).toEqual({
      where: { contactId: "c1" },
      orderBy: { createdAt: "desc" },
    });
    expect(db.conversation.update.mock.calls[0][0].where).toEqual({ id: "conv-1" });
  });

  test("targets a named conversation when one is given", async () => {
    db.conversation.findUnique.mockResolvedValue({ id: "conv-9", status: "ASSIGNED" });

    await mirrorConversationStatusTx(tx(), "c1", WaMessageAssignStatus.CLOSED, USER_ACTOR, {
      conversationId: "conv-9",
    });

    expect(db.conversation.findUnique).toHaveBeenCalledWith({ where: { id: "conv-9" } });
    expect(db.conversation.findFirst).not.toHaveBeenCalled();
  });

  test("does nothing for a contact that has no conversation yet", async () => {
    expect(
      await mirrorConversationStatusTx(tx(), "c1", WaMessageAssignStatus.CLOSED, USER_ACTOR),
    ).toBeNull();
    expect(db.conversation.update).not.toHaveBeenCalled();
  });

  // A closed conversation is a finished record: it is left alone and the caller
  // opens a successor instead of resurrecting it.
  test("refuses to reopen a closed conversation in place", async () => {
    db.conversation.findFirst.mockResolvedValue({ id: "conv-1", status: "CLOSED" });

    expect(
      await mirrorConversationStatusTx(tx(), "c1", WaMessageAssignStatus.ASSIGNED, USER_ACTOR),
    ).toBeNull();
    expect(db.conversation.update).not.toHaveBeenCalled();
  });

  test("still allows a closed conversation to move between terminal statuses", async () => {
    db.conversation.findFirst.mockResolvedValue({ id: "conv-1", status: "CLOSED" });

    await mirrorConversationStatusTx(tx(), "c1", WaMessageAssignStatus.RESOLVED, USER_ACTOR);

    expect(db.conversation.update.mock.calls[0][0].data.status).toBe(
      WaMessageAssignStatus.RESOLVED,
    );
  });

  test("writes the full close stamp, not just the status", async () => {
    const now = new Date("2026-05-05T00:00:00.000Z");
    db.conversation.findFirst.mockResolvedValue({ id: "conv-1", status: "ASSIGNED" });

    await mirrorConversationStatusTx(tx(), "c1", WaMessageAssignStatus.CLOSED, USER_ACTOR, {
      now,
      closeReason: CloseReason.SPAM,
    });

    expect(db.conversation.update.mock.calls[0][0].data).toMatchObject({
      status: WaMessageAssignStatus.CLOSED,
      closedAt: now,
      closedBy: USER,
      closeReason: CloseReason.SPAM,
    });
  });
});

// ===========================================================================
// setInboxStatus
// ===========================================================================

describe("setInboxStatus", () => {
  const before = {
    orgId: ORG,
    waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED,
    blockedOnWhatsApp: false,
    lastReceivedMessageTimeStamp: new Date(),
  };

  test("refuses a contact that does not exist", async () => {
    db.contact.findUnique.mockResolvedValue(null);
    db.contact.findMany.mockResolvedValue([]);

    await expect(setInboxStatus("nope", WaMessageAssignStatus.CLOSED, USER_ACTOR)).rejects.toThrow(
      "Contact nope not found",
    );
  });

  test("writes the contact and the conversation in one transaction", async () => {
    db.contact.findUnique.mockResolvedValue(before);
    db.contact.update.mockResolvedValue({ ...before, waMessageAssignStatus: "CLOSED" });
    db.conversation.findFirst.mockResolvedValue({ id: "conv-1", status: "ASSIGNED" });

    await setInboxStatus("c1", WaMessageAssignStatus.CLOSED, USER_ACTOR);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.contact.update).toHaveBeenCalled();
    expect(db.conversation.update).toHaveBeenCalled();
  });

  test("stamps closedAt and closedBy on a terminal status", async () => {
    db.contact.findUnique.mockResolvedValue(before);
    db.contact.update.mockResolvedValue({ ...before, waMessageAssignStatus: "CLOSED" });

    await setInboxStatus("c1", WaMessageAssignStatus.CLOSED, USER_ACTOR);

    const data = db.contact.update.mock.calls[0][0].data;
    expect(data.closedAt).toBeInstanceOf(Date);
    expect(data.closedBy).toBe(USER);
  });

  test("clears the close stamp when moving back to a live status", async () => {
    db.contact.findUnique.mockResolvedValue({ ...before, waMessageAssignStatus: "CLOSED" });
    db.contact.update.mockResolvedValue({ ...before, waMessageAssignStatus: "ASSIGNED" });

    await setInboxStatus("c1", WaMessageAssignStatus.ASSIGNED, USER_ACTOR);

    expect(db.contact.update.mock.calls[0][0].data).toMatchObject({
      closedAt: null,
      closedBy: null,
    });
  });

  test("never writes a non-user actor into closedBy", async () => {
    db.contact.findUnique.mockResolvedValue(before);
    db.contact.update.mockResolvedValue({ ...before, waMessageAssignStatus: "CLOSED" });

    await setInboxStatus("c1", WaMessageAssignStatus.CLOSED, { source: "automation" });

    expect(db.contact.update.mock.calls[0][0].data.closedBy).toBeNull();
  });

  test("moves the inbox counters after the transaction commits", async () => {
    db.contact.findUnique.mockResolvedValue(before);
    db.contact.update.mockResolvedValue({ ...before, waMessageAssignStatus: "ASSIGNED" });

    await setInboxStatus("c1", WaMessageAssignStatus.ASSIGNED, USER_ACTOR);

    expect(transitionInboxStat).toHaveBeenCalledWith(ORG, "unassignedCount", "assignedCount", 1);
  });

  test("leaves the counters alone when the status did not actually change", async () => {
    db.contact.findUnique.mockResolvedValue(before);
    db.contact.update.mockResolvedValue({ ...before });

    await setInboxStatus("c1", WaMessageAssignStatus.UNASSIGNED, USER_ACTOR);

    expect(transitionInboxStat).not.toHaveBeenCalled();
  });

  test("leaves the counters alone for a contact that never received a message", async () => {
    db.contact.findUnique.mockResolvedValue({ ...before, lastReceivedMessageTimeStamp: null });
    db.contact.update.mockResolvedValue({ ...before, waMessageAssignStatus: "ASSIGNED" });

    await setInboxStatus("c1", WaMessageAssignStatus.ASSIGNED, USER_ACTOR);

    expect(transitionInboxStat).not.toHaveBeenCalled();
  });

  test("leaves the counters alone for a blocked contact", async () => {
    db.contact.findUnique.mockResolvedValue(before);
    db.contact.update.mockResolvedValue({
      ...before,
      waMessageAssignStatus: "ASSIGNED",
      blockedOnWhatsApp: true,
    });

    await setInboxStatus("c1", WaMessageAssignStatus.ASSIGNED, USER_ACTOR);

    expect(transitionInboxStat).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// updateConversation and friends
// ===========================================================================

describe("updateConversation", () => {
  test("a status change is expanded into the whole transition, not written bare", async () => {
    await updateConversation("conv-1", ORG, { status: WaMessageAssignStatus.CLOSED } as any);

    const data = db.conversation.update.mock.calls[0][0].data;
    expect(data.status).toBe(WaMessageAssignStatus.CLOSED);
    expect(data.closedAt).toBeInstanceOf(Date);
    expect(data).toHaveProperty("closeReason");
  });

  test("reopening clears the previous close stamp", async () => {
    await updateConversation("conv-1", ORG, { status: WaMessageAssignStatus.ASSIGNED } as any);

    expect(db.conversation.update.mock.calls[0][0].data).toMatchObject({
      closedAt: null,
      closedBy: null,
      resolvedAt: null,
      closeReason: null,
    });
  });

  test("fields the caller passed explicitly win over the derived ones", async () => {
    const closedAt = new Date("2020-01-01T00:00:00.000Z");

    await updateConversation("conv-1", ORG, {
      status: WaMessageAssignStatus.CLOSED,
      closedAt,
    } as any);

    expect(db.conversation.update.mock.calls[0][0].data.closedAt).toBe(closedAt);
  });

  test("attributes the close to a caller-supplied user id", async () => {
    await updateConversation("conv-1", ORG, {
      status: WaMessageAssignStatus.CLOSED,
      closedBy: USER,
    } as any);

    expect(db.conversation.update.mock.calls[0][0].data.closedBy).toBe(USER);
  });

  test("a body with no status is written through untouched", async () => {
    await updateConversation("conv-1", ORG, { subject: "Refund" } as any);

    expect(db.conversation.update.mock.calls[0][0].data).toEqual({ subject: "Refund" });
  });
});

describe("setConversationSubjectIfBlank", () => {
  test("writes a subject when the ticket has none", async () => {
    db.conversation.findUnique.mockResolvedValue({ id: "conv-1", subject: null });

    expect(await setConversationSubjectIfBlank("conv-1", "Refund")).toBe(true);
    expect(db.conversation.update).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: { subject: "Refund" },
    });
  });

  test("never overwrites a subject that is already set", async () => {
    db.conversation.findUnique.mockResolvedValue({ id: "conv-1", subject: "Existing" });

    expect(await setConversationSubjectIfBlank("conv-1", "Refund")).toBe(false);
    expect(db.conversation.update).not.toHaveBeenCalled();
  });

  test("does nothing for a conversation that does not exist", async () => {
    db.conversation.findUnique.mockResolvedValue(null);

    expect(await setConversationSubjectIfBlank("nope", "Refund")).toBe(false);
    expect(db.conversation.update).not.toHaveBeenCalled();
  });
});

describe("getConversationById / deleteConversation", () => {
  /** The contact whose mirror the delete re-derives. */
  function contactBefore(status: string) {
    return {
      id: "c1",
      orgId: ORG,
      waMessageAssignStatus: status,
      blockedOnWhatsApp: false,
      lastReceivedMessageTimeStamp: new Date(),
    };
  }

  test("a read is scoped through the contact's org", async () => {
    await getConversationById("conv-1", ORG);

    expect(db.conversation.findFirst).toHaveBeenCalledWith({
      where: { id: "conv-1", contact: { orgId: ORG } },
    });
  });

  test("a delete takes the ticket's messages with it", async () => {
    db.conversation.findMany.mockResolvedValue([
      { id: "conv-1", contactId: "c1", number: 12, contact: { name: "Ada", phone: "+100" } },
    ]);
    db.contact.findMany.mockResolvedValue([contactBefore(WaMessageAssignStatus.CLOSED)]);
    db.waMessage.deleteMany.mockResolvedValue({ count: 3 });
    // The contact has an older ticket left, so the mirror falls back to it.
    db.conversation.findFirst.mockResolvedValue({
      status: WaMessageAssignStatus.ASSIGNED,
      closedAt: null,
      closedBy: null,
    });
    db.contact.update.mockResolvedValue({
      waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
    });

    const result = await deleteConversation("conv-1", ORG);

    // Scoped through the contact's org on the way in, so the delete itself can
    // address the rows by id.
    expect(db.conversation.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["conv-1"] }, contact: { orgId: ORG } },
      // The contact and ticket number come back so the audit entry can name what
      // was deleted once the rows are gone.
      select: {
        id: true,
        contactId: true,
        number: true,
        contact: { select: { name: true, phone: true } },
      },
    });
    expect(db.waMessage.deleteMany).toHaveBeenCalledWith({
      where: { conversationId: { in: ["conv-1"] } },
    });
    expect(db.conversation.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["conv-1"] } } });
    expect(db.contact.update.mock.calls[0][0].data).toMatchObject({
      waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
    });
    expect(transitionInboxStat).toHaveBeenCalled();
    expect(result).toMatchObject({
      id: "conv-1",
      contactId: "c1",
      deletedMessages: 3,
      remainingConversations: true,
    });
  });

  test("resets the contact's mirror when its last ticket is deleted", async () => {
    db.conversation.findMany.mockResolvedValue([
      { id: "conv-1", contactId: "c1", number: 12, contact: { name: "Ada", phone: "+100" } },
    ]);
    db.contact.findMany.mockResolvedValue([contactBefore(WaMessageAssignStatus.ASSIGNED)]);
    db.conversation.findFirst.mockResolvedValue(null);
    db.contact.update.mockResolvedValue({
      waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED,
    });

    const result = await deleteConversation("conv-1", ORG);

    expect(db.contact.update.mock.calls[0][0].data).toMatchObject({
      waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED,
      closedAt: null,
      closedBy: null,
    });
    expect(result).toMatchObject({ remainingConversations: false });
  });

  test("a ticket from another org is not deleted", async () => {
    db.conversation.findMany.mockResolvedValue([]);

    expect(await deleteConversation("conv-1", ORG)).toBeNull();
    expect(db.waMessage.deleteMany).not.toHaveBeenCalled();
    expect(db.conversation.deleteMany).not.toHaveBeenCalled();
  });
});

describe("deleteConversations", () => {
  test("deletes every ticket the org owns and reconciles each contact once", async () => {
    // Two of the three ids are this org's, and two of them share a contact — so
    // the mirror is re-derived per contact, not per ticket.
    db.conversation.findMany.mockResolvedValue([
      { id: "conv-1", contactId: "c1", number: 1, contact: { name: "Ada", phone: "+100" } },
      { id: "conv-2", contactId: "c1", number: 2, contact: { name: "Ada", phone: "+100" } },
      { id: "conv-3", contactId: "c2", number: 3, contact: { name: null, phone: "+200" } },
    ]);
    db.contact.findMany.mockResolvedValue([]);
    db.waMessage.deleteMany.mockResolvedValue({ count: 7 });
    db.conversation.findFirst.mockResolvedValue(null);
    db.contact.update.mockResolvedValue({
      waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED,
    });

    const result = await deleteConversations(["conv-1", "conv-2", "conv-3", "conv-4"], ORG);

    expect(db.conversation.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["conv-1", "conv-2", "conv-3"] } },
    });
    expect(db.contact.update).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      conversationIds: ["conv-1", "conv-2", "conv-3"],
      contactIds: ["c1", "c2"],
      deletedConversations: 3,
      deletedMessages: 7,
    });
    // Every deleted ticket is described for the audit entry, contact and all.
    expect(result.tickets).toEqual([
      {
        id: "conv-1",
        number: 1,
        contactId: "c1",
        contactName: "Ada",
        contactPhone: "+100",
      },
      {
        id: "conv-2",
        number: 2,
        contactId: "c1",
        contactName: "Ada",
        contactPhone: "+100",
      },
      {
        id: "conv-3",
        number: 3,
        contactId: "c2",
        contactName: null,
        contactPhone: "+200",
      },
    ]);
  });

  test("a selection with nothing the org owns deletes nothing", async () => {
    db.conversation.findMany.mockResolvedValue([]);

    const result = await deleteConversations(["conv-1"], ORG);

    expect(db.waMessage.deleteMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({ deletedConversations: 0, deletedMessages: 0 });
  });
});

describe("updateClosedConversationStatus", () => {
  test("writes the full transition data for the given status", async () => {
    await updateClosedConversationStatus(
      "conv-1",
      WaMessageAssignStatus.RESOLVED,
      USER_ACTOR,
      CloseReason.MANUAL,
    );

    const data = db.conversation.update.mock.calls[0][0].data;
    expect(data.status).toBe(WaMessageAssignStatus.RESOLVED);
    expect(data.resolvedAt).toBeInstanceOf(Date);
    expect(data.closeReason).toBe(CloseReason.MANUAL);
  });
});

// ===========================================================================
// getConversationsByContactId / active conversation
// ===========================================================================

describe("getConversationsByContactId", () => {
  test("scopes the history through the contact's org, newest first", async () => {
    await getConversationsByContactId(ORG, "c1");

    const call = db.conversation.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ contactId: "c1", contact: { orgId: ORG } });
    expect(call.orderBy).toEqual({ createdAt: "desc" });
  });

  test("lists only assignees who have not been removed", async () => {
    await getConversationsByContactId(ORG, "c1");

    expect(db.conversation.findMany.mock.calls[0][0].select.assignedUsers.where).toEqual({
      lastRemovedAt: null,
    });
  });
});

describe("getLastCreatedConversationForContact / getActiveConversationForContact", () => {
  test("the last conversation is the most recently created one", async () => {
    await getLastCreatedConversationForContact("c1");

    expect(db.conversation.findFirst.mock.calls[0][0]).toEqual({
      where: { contactId: "c1" },
      orderBy: { createdAt: "desc" },
    });
  });

  test("a live conversation is the active one", async () => {
    db.conversation.findFirst.mockResolvedValue({ id: "conv-1", status: "ASSIGNED" });

    expect(await getActiveConversationForContact("c1")).toEqual({
      id: "conv-1",
      status: "ASSIGNED",
    });
  });

  test("a closed conversation means there is no active one", async () => {
    db.conversation.findFirst.mockResolvedValue({ id: "conv-1", status: "RESOLVED" });

    expect(await getActiveConversationForContact("c1")).toBeNull();
  });

  test("a contact with no conversations has no active one", async () => {
    expect(await getActiveConversationForContact("c1")).toBeNull();
  });
});

// ===========================================================================
// updateConversationAssignees
// ===========================================================================

describe("updateConversationAssignees", () => {
  test("does nothing at all for an empty assignee list", async () => {
    await updateConversationAssignees("conv-1", { assignees: [] } as any, USER);

    expect(db.conversationAssignedUserTeamMap.findMany).not.toHaveBeenCalled();
    expect(db.conversation.update).not.toHaveBeenCalled();
  });

  test("creates a map row for an assignee who is new to the ticket", async () => {
    await updateConversationAssignees(
      "conv-1",
      { assignees: [{ userId: "u1", teamId: "t1" }] } as any,
      USER,
    );

    const data = db.conversationAssignedUserTeamMap.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      conversationId: "conv-1",
      userId: "u1",
      teamId: "t1",
      lastAssignedBy: USER,
      isAssignedByAutomation: false,
    });
    expect(data.actionHistory[0].action).toBe("assigned");
  });

  test("marks an assignment with no acting user as automation", async () => {
    await updateConversationAssignees(
      "conv-1",
      { assignees: [{ userId: "u1", teamId: "t1" }] } as any,
      undefined,
    );

    expect(
      db.conversationAssignedUserTeamMap.create.mock.calls[0][0].data.isAssignedByAutomation,
    ).toBe(true);
  });

  test("revokes an assignee who is no longer in the list", async () => {
    db.conversationAssignedUserTeamMap.findMany.mockResolvedValue([
      { userId: "u-old", teamId: "t1", actionHistory: [] },
    ]);

    await updateConversationAssignees(
      "conv-1",
      { assignees: [{ userId: "u1", teamId: "t1" }] } as any,
      USER,
    );

    const call = db.conversationAssignedUserTeamMap.update.mock.calls[0][0];
    expect(call.where).toEqual({
      userId_conversationId: { userId: "u-old", conversationId: "conv-1" },
    });
    expect(call.data.lastRemovedBy).toBe(USER);
    expect(call.data.actionHistory.at(-1).action).toBe("assignment-revoked");
  });

  test("moves an existing assignee to a new team", async () => {
    db.conversationAssignedUserTeamMap.findMany.mockResolvedValue([
      { userId: "u1", teamId: "t-old", actionHistory: [] },
    ]);

    await updateConversationAssignees(
      "conv-1",
      { assignees: [{ userId: "u1", teamId: "t-new" }] } as any,
      USER,
    );

    const call = db.conversationAssignedUserTeamMap.update.mock.calls[0][0];
    expect(call.data.teamId).toBe("t-new");
    expect(call.data.actionHistory.at(-1).action).toBe("updated-team");
  });

  test("moves the conversation into the assigned status", async () => {
    await updateConversationAssignees(
      "conv-1",
      { assignees: [{ userId: "u1", teamId: "t1" }] } as any,
      USER,
    );

    expect(db.conversation.update.mock.calls[0][0].data.status).toBe(
      WaMessageAssignStatus.ASSIGNED,
    );
  });

  test("stamps assignedAt only on the ticket's first assignment", async () => {
    db.conversationAssignedUserTeamMap.findMany.mockResolvedValue([
      { userId: "u1", teamId: "t1", actionHistory: [] },
    ]);

    await updateConversationAssignees(
      "conv-1",
      { assignees: [{ userId: "u1", teamId: "t1" }] } as any,
      USER,
    );

    expect(db.conversation.update.mock.calls[0][0].data.assignedAt).toBeUndefined();
  });
});

// ===========================================================================
// first-message checks
// ===========================================================================

describe("checkIfFirstSendMessageInConversation", () => {
  test("an empty thread counts the message as the first", async () => {
    expect(await checkIfFirstSendMessageInConversation("conv-1", "m1")).toBe(true);
  });

  test("looks only at outbound messages, oldest first", async () => {
    await checkIfFirstSendMessageInConversation("conv-1", "m1");

    const call = db.waMessage.findMany.mock.calls[0][0];
    expect(call.where.messageBody).toEqual({ path: ["exchangeProcess"], equals: "send" });
    expect(call.orderBy).toEqual({ waCreatedAt: "asc" });
    expect(call.take).toBe(1);
  });

  test("recognises the earliest outbound message as the first", async () => {
    db.waMessage.findMany.mockResolvedValue([{ id: "m1" }]);

    expect(await checkIfFirstSendMessageInConversation("conv-1", "m1")).toBe(true);
  });

  test("rejects a later message", async () => {
    db.waMessage.findMany.mockResolvedValue([{ id: "m0" }]);

    expect(await checkIfFirstSendMessageInConversation("conv-1", "m1")).toBe(false);
  });
});

describe("checkIfFirstUserSendMessageInConversation", () => {
  test("ignores messages that no human sent", async () => {
    await checkIfFirstUserSendMessageInConversation("conv-1", "m1");

    expect(db.waMessage.findMany.mock.calls[0][0].where.sendBy).toEqual({ not: null });
  });

  test("an empty thread counts the message as the first", async () => {
    expect(await checkIfFirstUserSendMessageInConversation("conv-1", "m1")).toBe(true);
  });
});

// ===========================================================================
// analytics
// ===========================================================================

describe("getConversationOverview", () => {
  test("binds the requested window into the query", async () => {
    db.$queryRaw.mockResolvedValue([{ totalConversations: 3 }]);

    await getConversationOverview(ORG, ["2026-01-01", "2026-01-31"]);

    const bound = db.$queryRaw.mock.calls[0].slice(1);
    expect(bound[0]).toEqual(new Date("2026-01-01"));
    expect(bound.at(-1)).toBe(ORG);
  });

  test("binds both window bounds as undefined when no range is given", async () => {
    db.$queryRaw.mockResolvedValue([{}]);

    await getConversationOverview(ORG, []);

    expect(db.$queryRaw.mock.calls[0][1]).toBeUndefined();
    expect(db.$queryRaw.mock.calls[0][2]).toBeUndefined();
  });

  test("returns the single aggregate row", async () => {
    db.$queryRaw.mockResolvedValue([{ totalConversations: 3, resolutionRate: 50 }]);

    expect(await getConversationOverview(ORG, [])).toEqual({
      totalConversations: 3,
      resolutionRate: 50,
    });
  });

  test("returns the zeroed fallback for an empty result", async () => {
    db.$queryRaw.mockResolvedValue([]);

    expect(await getConversationOverview(ORG, [])).toEqual({
      totalConversations: 0,
      averageResponseTime: 0,
      averageResponseTimeByAgent: 0,
      resolutionRate: 0,
    });
  });
});

describe("getResolvedConversationWeeklyStats", () => {
  test("scopes the weekly counts to the org and returns them as-is", async () => {
    db.$queryRaw.mockResolvedValue([{ weekStart: new Date(), resolvedCount: 4 }]);

    const res = await getResolvedConversationWeeklyStats(ORG);

    expect(db.$queryRaw.mock.calls[0][1]).toBe(ORG);
    expect(res).toEqual([{ weekStart: expect.any(Date), resolvedCount: 4 }]);
  });
});

describe("getAvargeResponseTimeofTodyaInEveryHour", () => {
  test("groups by hour for today and yesterday", async () => {
    await getAvargeResponseTimeofTodyaInEveryHour(ORG, "today", ["2026-01-01", "2026-01-02"]);

    expect(db.$queryRawUnsafe.mock.calls[0][0]).toContain("date_trunc('hour'");
  });

  test("groups by day for any other range", async () => {
    await getAvargeResponseTimeofTodyaInEveryHour(ORG, "last7", ["2026-01-01", "2026-01-08"]);

    expect(db.$queryRawUnsafe.mock.calls[0][0]).toContain("date_trunc('day'");
  });

  test("binds the org and both window bounds as positional parameters", async () => {
    await getAvargeResponseTimeofTodyaInEveryHour(ORG, "today", ["2026-01-01", "2026-01-02"]);

    const [, orgId, start, end] = db.$queryRawUnsafe.mock.calls[0];
    expect(orgId).toBe(ORG);
    expect(start).toEqual(new Date("2026-01-01"));
    expect(end).toEqual(new Date("2026-01-02"));
  });

  test("binds a usable window when the caller supplied no range", async () => {
    await getAvargeResponseTimeofTodyaInEveryHour(ORG, "today", []);

    const [, , start, end] = db.$queryRawUnsafe.mock.calls[0];
    expect(Number.isNaN(start.getTime())).toBe(false);
    expect(Number.isNaN(end.getTime())).toBe(false);
    expect(start.getTime()).toBeLessThan(end.getTime());
  });
});

describe("getConversationOnAccountDistribution", () => {
  test("scopes to the org and binds the window", async () => {
    await getConversationOnAccountDistribution(ORG, ["2026-01-01", "2026-01-31"]);

    // Bound order: orgId, the WEBCHAT platform literal, then the two bounds.
    const bound = db.$queryRaw.mock.calls[0].slice(1);
    expect(bound[0]).toBe(ORG);
    expect(bound.at(-2)).toEqual(new Date("2026-01-01"));
  });

  test("binds undefined bounds when no range is given, letting COALESCE apply", async () => {
    await getConversationOnAccountDistribution(ORG, []);

    const bound = db.$queryRaw.mock.calls[0].slice(1);
    expect(bound.at(-1)).toBeUndefined();
  });
});

describe("getOverAllQuickStatsOfConversations", () => {
  const row = {
    conversationInProgress: 2,
    resolved: 10,
    newConversations: 1,
    staffOnline: 3,
    totalStaff: 5,
    conversationCreatedToday: 2,
    totalConversation: 20,
    resolvedLastWeek: 2,
    resolvedThisWeek: 4,
  };

  test("keeps the raw counters and replaces the weekly ones with a delta", async () => {
    db.$queryRaw.mockResolvedValue([row]);

    const res: any = await getOverAllQuickStatsOfConversations(ORG);

    expect(res).toMatchObject({
      conversationInProgress: 2,
      resolved: 10,
      newConversations: 1,
      staffOnline: 3,
      totalStaff: 5,
    });
    expect(res).not.toHaveProperty("resolvedThisWeek");
    expect(res).not.toHaveProperty("totalConversation");
  });

  test("computes the week-on-week resolution difference", async () => {
    db.$queryRaw.mockResolvedValue([row]);

    // this week: 4/20 = 20%. last week: 2/(20-2) = 11.11%.
    const res: any = await getOverAllQuickStatsOfConversations(ORG);

    expect(res.resolvedRateDifference).toBeCloseTo(20 - 11.11, 2);
  });

  test("reports a zero difference for an org with no conversations", async () => {
    db.$queryRaw.mockResolvedValue([{ ...row, totalConversation: 0 }]);

    expect((await getOverAllQuickStatsOfConversations(ORG)).resolvedRateDifference).toBe(0);
  });

  test("reports a zero difference when every conversation was created today", async () => {
    db.$queryRaw.mockResolvedValue([
      { ...row, totalConversation: 2, conversationCreatedToday: 2, resolvedThisWeek: 0 },
    ]);

    expect((await getOverAllQuickStatsOfConversations(ORG)).resolvedRateDifference).toBe(0);
  });
});

describe("getStaffDetailedConversationAnalytics", () => {
  test("binds the org and the staff member into the query", async () => {
    db.$queryRaw.mockResolvedValue([{ userPerformance: {} }]);

    await getStaffDetailedConversationAnalytics(ORG, USER, 30);

    expect(db.$queryRaw.mock.calls[0].slice(1)).toContain(ORG);
    expect(db.$queryRaw.mock.calls[0].slice(1)).toContain(USER);
  });

  test("returns the single result row", async () => {
    db.$queryRaw.mockResolvedValue([{ userPerformance: { name: "Ann" } }]);

    expect(await getStaffDetailedConversationAnalytics(ORG, USER, 30)).toEqual({
      userPerformance: { name: "Ann" },
    });
  });

  test("throws when the caller did not supply a day count", async () => {
    await expect(
      getStaffDetailedConversationAnalytics(ORG, USER, undefined as unknown as number),
    ).rejects.toThrow(RangeError);
  });
});

describe("getTeamDetailedMetrics", () => {
  test("binds the team and the org into the query", async () => {
    db.$queryRaw.mockResolvedValue([{ teamId: "t1" }]);

    await getTeamDetailedMetrics("t1", ORG, 30);

    const bound = db.$queryRaw.mock.calls[0].slice(1);
    expect(bound).toContain("t1");
    expect(bound).toContain(ORG);
  });

  test("returns the single result row", async () => {
    db.$queryRaw.mockResolvedValue([{ teamId: "t1", activeChats: 4 }]);

    expect(await getTeamDetailedMetrics("t1", ORG, 30)).toEqual({ teamId: "t1", activeChats: 4 });
  });

  test("binds an Invalid Date when the caller supplied no day count", async () => {
    db.$queryRaw.mockResolvedValue([{}]);

    await getTeamDetailedMetrics("t1", ORG, undefined);

    const invalid = db.$queryRaw.mock.calls[0]
      .slice(1)
      .filter((v: unknown) => v instanceof Date && Number.isNaN((v as Date).getTime()));
    expect(invalid.length).toBeGreaterThan(0);
  });
});
