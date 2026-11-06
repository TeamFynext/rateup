import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/prisma.js", () => ({
  default: {
    inboxAutomation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    contact: { findMany: vi.fn() },
  },
  excludeFields: vi.fn(),
}));

vi.mock("../../../contact/contact.service.js", () => ({ updateContactById: vi.fn() }));

vi.mock("../../../../../generated/prisma/client.js", () => ({
  InboxAutomationCondition: { ASSIGNED: "ASSIGNED", UNASSIGNED: "UNASSIGNED" },
  Prisma: {},
}));

import prisma from "../../../../utils/prisma.js";
import { updateContactById } from "../../../contact/contact.service.js";
import { WaMessageAssignStatus } from "../../../../types/enums.js";
import {
  deleteInboxAutomation,
  enableInboxAutomation,
  getInboxAutomation,
  runInboxAutomationCron,
  updateInboxAutomation,
} from "./inboxautomation.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  inboxAutomation: {
    findFirst: Mock;
    findMany: Mock;
    create: Mock;
    update: Mock;
    deleteMany: Mock;
  };
  contact: { findMany: Mock };
};

const updateContactMock = updateContactById as unknown as Mock;

const ASSIGNED = "ASSIGNED" as any;
const UNASSIGNED = "UNASSIGNED" as any;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});

  db.inboxAutomation.findFirst.mockResolvedValue(null);
  db.inboxAutomation.findMany.mockResolvedValue([]);
  db.inboxAutomation.create.mockResolvedValue({ id: "automation-1" });
  db.inboxAutomation.update.mockResolvedValue({ id: "automation-1" });
  db.inboxAutomation.deleteMany.mockResolvedValue({ count: 1 });
  db.contact.findMany.mockResolvedValue([]);
});

describe("enableInboxAutomation", () => {
  test("creates a rule that closes idle conversations after a day", async () => {
    await enableInboxAutomation("org-1", ASSIGNED);

    expect(db.inboxAutomation.create).toHaveBeenCalledWith({
      data: {
        org: { connect: { id: "org-1" } },
        condition: ASSIGNED,
        active: true,
        action: "CLOSE",
        closeAfterHours: 24,
      },
    });
  });

  test("switches an existing rule back on instead of creating a second one", async () => {
    db.inboxAutomation.findFirst.mockResolvedValue({ id: "automation-1", active: false });

    await enableInboxAutomation("org-1", ASSIGNED);

    expect(db.inboxAutomation.create).not.toHaveBeenCalled();
    expect(db.inboxAutomation.update).toHaveBeenCalledWith({
      where: { id: "automation-1" },
      data: { active: true },
    });
  });

  test("leaves an already-active rule untouched", async () => {
    const active = { id: "automation-1", active: true };
    db.inboxAutomation.findFirst.mockResolvedValue(active);

    const result = await enableInboxAutomation("org-1", ASSIGNED);

    expect(result).toBe(active);
    expect(db.inboxAutomation.update).not.toHaveBeenCalled();
    expect(db.inboxAutomation.create).not.toHaveBeenCalled();
  });

  test("looks for the rule within the caller's org only", async () => {
    await enableInboxAutomation("org-1", UNASSIGNED);

    expect(db.inboxAutomation.findFirst).toHaveBeenCalledWith({
      where: { orgId: "org-1", condition: UNASSIGNED },
    });
  });
});

describe("getInboxAutomation", () => {
  test("returns the single rule for a named condition", async () => {
    db.inboxAutomation.findFirst.mockResolvedValue({ id: "automation-1" });

    const result = await getInboxAutomation("org-1", ASSIGNED);

    expect(db.inboxAutomation.findFirst).toHaveBeenCalledWith({
      where: { orgId: "org-1", condition: ASSIGNED },
    });
    expect(result).toEqual({ id: "automation-1" });
  });

  test("returns every rule in the org when no condition is named", async () => {
    db.inboxAutomation.findMany.mockResolvedValue([{ id: "a1" }, { id: "a2" }]);

    const result = await getInboxAutomation("org-1");

    expect(db.inboxAutomation.findMany).toHaveBeenCalledWith({ where: { orgId: "org-1" } });
    expect(result).toHaveLength(2);
  });
});

describe("updateInboxAutomation", () => {
  test("applies only the fields the caller actually sent", async () => {
    db.inboxAutomation.findFirst.mockResolvedValue({ id: "automation-1" });

    await updateInboxAutomation("org-1", ASSIGNED, { closeAfterHours: 48 });

    expect(db.inboxAutomation.update).toHaveBeenCalledWith({
      where: { id: "automation-1" },
      data: { closeAfterHours: 48 },
    });
  });

  test("can turn a rule off without disturbing its other settings", async () => {
    db.inboxAutomation.findFirst.mockResolvedValue({ id: "automation-1" });

    await updateInboxAutomation("org-1", ASSIGNED, { active: false });

    expect(db.inboxAutomation.update).toHaveBeenCalledWith({
      where: { id: "automation-1" },
      data: { active: false },
    });
  });

  test("creates the rule when the org has none for that condition yet", async () => {
    await updateInboxAutomation("org-1", UNASSIGNED, { active: true, closeAfterHours: 12 });

    expect(db.inboxAutomation.create).toHaveBeenCalledWith({
      data: {
        active: true,
        closeAfterHours: 12,
        condition: UNASSIGNED,
        org: { connect: { id: "org-1" } },
      },
    });
  });

  test("keeps a zero-hour setting rather than mistaking it for absent", async () => {
    db.inboxAutomation.findFirst.mockResolvedValue({ id: "automation-1" });

    await updateInboxAutomation("org-1", ASSIGNED, { closeAfterHours: 0 });

    expect(db.inboxAutomation.update.mock.calls[0][0].data).toEqual({ closeAfterHours: 0 });
  });

  test("issues an empty update when the caller sends nothing", async () => {
    db.inboxAutomation.findFirst.mockResolvedValue({ id: "automation-1" });

    await updateInboxAutomation("org-1", ASSIGNED, {} as any);

    expect(db.inboxAutomation.update).toHaveBeenCalledWith({
      where: { id: "automation-1" },
      data: {},
    });
  });
});

describe("deleteInboxAutomation", () => {
  test("removes the org's rule for that condition", async () => {
    await deleteInboxAutomation("org-1", ASSIGNED);

    expect(db.inboxAutomation.deleteMany).toHaveBeenCalledWith({
      where: { orgId: "org-1", condition: ASSIGNED },
    });
  });
});

describe("runInboxAutomationCron", () => {
  test("does nothing when no rule is switched on", async () => {
    await runInboxAutomationCron();

    expect(db.inboxAutomation.findMany).toHaveBeenCalledWith({ where: { active: true } });
    expect(db.contact.findMany).not.toHaveBeenCalled();
    expect(updateContactMock).not.toHaveBeenCalled();
  });

  test("closes an idle conversation, attributing it to the automation", async () => {
    db.inboxAutomation.findMany.mockResolvedValue([
      { id: "a1", orgId: "org-1", condition: "ASSIGNED", closeAfterHours: 24 },
    ]);
    db.contact.findMany.mockResolvedValue([{ id: "contact-1", orgId: "org-1" }]);

    await runInboxAutomationCron();

    expect(updateContactMock).toHaveBeenCalledWith(
      "contact-1",
      "org-1",
      { waMessageAssignStatus: WaMessageAssignStatus.CLOSED },
      "RateUp",
      undefined,
      { source: "automation" },
    );
  });

  test("only considers conversations in the state the rule watches", async () => {
    db.inboxAutomation.findMany.mockResolvedValue([
      { id: "a1", orgId: "org-1", condition: "ASSIGNED", closeAfterHours: 24 },
    ]);

    await runInboxAutomationCron();

    expect(db.contact.findMany.mock.calls[0][0].where).toMatchObject({
      orgId: "org-1",
      waMessageAssignStatus: "ASSIGNED",
    });
  });

  // Anything that is not the ASSIGNED rule sweeps UNASSIGNED conversations.
  test("treats any other condition as the unassigned sweep", async () => {
    db.inboxAutomation.findMany.mockResolvedValue([
      { id: "a1", orgId: "org-1", condition: "UNASSIGNED", closeAfterHours: 24 },
    ]);

    await runInboxAutomationCron();

    expect(db.contact.findMany.mock.calls[0][0].where.waMessageAssignStatus).toBe("UNASSIGNED");
  });

  test("measures idleness from the rule's own window", async () => {
    db.inboxAutomation.findMany.mockResolvedValue([
      { id: "a1", orgId: "org-1", condition: "ASSIGNED", closeAfterHours: 2 },
    ]);
    const before = Date.now();

    await runInboxAutomationCron();

    const cutoff: Date = db.contact.findMany.mock.calls[0][0].where.createdAt.lt;
    const hoursBack = (before - cutoff.getTime()) / (60 * 60 * 1000);
    expect(hoursBack).toBeGreaterThanOrEqual(2);
    expect(hoursBack).toBeLessThan(2.01);
  });

  test("falls back to a day when the rule names no window", async () => {
    db.inboxAutomation.findMany.mockResolvedValue([
      { id: "a1", orgId: "org-1", condition: "ASSIGNED", closeAfterHours: null },
    ]);
    const before = Date.now();

    await runInboxAutomationCron();

    const cutoff: Date = db.contact.findMany.mock.calls[0][0].where.createdAt.lt;
    const hoursBack = (before - cutoff.getTime()) / (60 * 60 * 1000);
    expect(hoursBack).toBeGreaterThanOrEqual(24);
    expect(hoursBack).toBeLessThan(24.01);
  });

  test("requires both the last inbound and last outbound message to be old", async () => {
    db.inboxAutomation.findMany.mockResolvedValue([
      { id: "a1", orgId: "org-1", condition: "ASSIGNED", closeAfterHours: 24 },
    ]);

    await runInboxAutomationCron();

    const where = db.contact.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { lastReceivedMessageTimeStamp: null },
      { lastReceivedMessageTimeStamp: { lt: where.createdAt.lt } },
    ]);
    expect(where.AND[0].OR).toEqual([
      { lastSentMessageTimeStamp: null },
      { lastSentMessageTimeStamp: { lt: where.createdAt.lt } },
    ]);
  });

  test("keeps closing the rest when one conversation fails to close", async () => {
    db.inboxAutomation.findMany.mockResolvedValue([
      { id: "a1", orgId: "org-1", condition: "ASSIGNED", closeAfterHours: 24 },
    ]);
    db.contact.findMany.mockResolvedValue([
      { id: "contact-1", orgId: "org-1" },
      { id: "contact-2", orgId: "org-1" },
    ]);
    updateContactMock.mockRejectedValueOnce(new Error("row locked"));

    await runInboxAutomationCron();

    expect(updateContactMock).toHaveBeenCalledTimes(2);
    expect(updateContactMock.mock.calls[1][0]).toBe("contact-2");
  });

  test("sweeps every active rule across every org", async () => {
    db.inboxAutomation.findMany.mockResolvedValue([
      { id: "a1", orgId: "org-1", condition: "ASSIGNED", closeAfterHours: 24 },
      { id: "a2", orgId: "org-2", condition: "UNASSIGNED", closeAfterHours: 6 },
    ]);
    db.contact.findMany
      .mockResolvedValueOnce([{ id: "contact-1", orgId: "org-1" }])
      .mockResolvedValueOnce([{ id: "contact-2", orgId: "org-1" }]);

    await runInboxAutomationCron();

    expect(db.contact.findMany).toHaveBeenCalledTimes(2);
    expect(db.contact.findMany.mock.calls[1][0].where.orgId).toBe("org-2");
    expect(updateContactMock).toHaveBeenCalledTimes(2);
  });
});
