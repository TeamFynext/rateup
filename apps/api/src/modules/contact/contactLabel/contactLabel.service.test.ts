import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    contact: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    contactLabel: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    contactLabelMap: { createMany: vi.fn(), deleteMany: vi.fn() },
  },
}));

import prisma from "../../../utils/prisma.js";
import {
  assignLabelsToContact,
  assignLabelsToContacts,
  createContactLabel,
  deleteContactLabel,
  getContactLabelById,
  getContactLabelsByOrgId,
  getContactsWithLabels,
  updateContactLabel,
} from "./contactLabel.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  contact: Record<string, Mock>;
  contactLabel: Record<string, Mock>;
  contactLabelMap: Record<string, Mock>;
};

const ORG = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  db.contact.findFirst.mockResolvedValue({ id: "c1" });
  db.contact.findUnique.mockResolvedValue(null);
  db.contact.findMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
  db.contactLabel.findMany.mockResolvedValue([]);
  db.contactLabel.findFirst.mockResolvedValue(null);
});

describe("createContactLabel", () => {
  test("creates the label against the caller's org", async () => {
    await createContactLabel(ORG, { name: "VIP" });

    expect(db.contactLabel.create).toHaveBeenCalledWith({ data: { name: "VIP", orgId: ORG } });
  });
});

describe("getContactLabelsByOrgId", () => {
  test("lists the org's labels newest first, with their usage counts", async () => {
    await getContactLabelsByOrgId(ORG);

    const call = db.contactLabel.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ orgId: ORG });
    expect(call.orderBy).toEqual({ createdAt: "desc" });
    expect(call.include._count.select.contactLabels).toBe(true);
  });
});

describe("getContactLabelById", () => {
  test("matches the label id and the org together", async () => {
    await getContactLabelById("l1", ORG);

    expect(db.contactLabel.findFirst.mock.calls[0][0].where).toEqual({ id: "l1", orgId: ORG });
  });

  test("returns null for a label that belongs to another org", async () => {
    expect(await getContactLabelById("l1", ORG)).toBeNull();
  });
});

describe("updateContactLabel / deleteContactLabel", () => {
  test("an update is scoped to the org as well as the label id", async () => {
    await updateContactLabel("l1", ORG, { name: "New" } as any);

    expect(db.contactLabel.update.mock.calls[0][0].where).toEqual({ id: "l1", orgId: ORG });
  });

  test("a delete is scoped to the org as well as the label id", async () => {
    await deleteContactLabel("l1", ORG);

    expect(db.contactLabel.delete).toHaveBeenCalledWith({ where: { id: "l1", orgId: ORG } });
  });
});

// ===========================================================================
// assignLabelsToContact
// ===========================================================================

describe("assignLabelsToContact", () => {
  test("replaces the whole label set rather than adding to it", async () => {
    db.contactLabel.findMany.mockResolvedValue([{ id: "l1" }]);

    await assignLabelsToContact("c1", ["l1"], ORG);

    expect(db.contactLabelMap.deleteMany).toHaveBeenCalledWith({ where: { contactId: "c1" } });
    expect(db.contactLabelMap.createMany).toHaveBeenCalledWith({
      data: [{ contactId: "c1", labelId: "l1" }],
    });
  });

  test("only writes labels that belong to the caller's org", async () => {
    db.contactLabel.findMany.mockResolvedValue([{ id: "l1" }]);

    await assignLabelsToContact("c1", ["l1", "l-other-org"], ORG);

    expect(db.contactLabel.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ["l1", "l-other-org"] },
      orgId: ORG,
    });
    expect(db.contactLabelMap.createMany.mock.calls[0][0].data).toEqual([
      { contactId: "c1", labelId: "l1" },
    ]);
  });

  test("writes nothing when none of the requested labels are the org's", async () => {
    db.contactLabel.findMany.mockResolvedValue([]);

    await assignLabelsToContact("c1", ["l-other-org"], ORG);

    expect(db.contactLabelMap.createMany).not.toHaveBeenCalled();
  });

  test("an empty label list clears the contact's labels", async () => {
    await assignLabelsToContact("c1", [], ORG);

    expect(db.contactLabelMap.deleteMany).toHaveBeenCalled();
    expect(db.contactLabel.findMany).not.toHaveBeenCalled();
    expect(db.contactLabelMap.createMany).not.toHaveBeenCalled();
  });

  test("touches nothing for a contact belonging to another org", async () => {
    db.contact.findFirst.mockResolvedValue(null);

    const res = await assignLabelsToContact("c-other-org", [], ORG);

    expect(db.contactLabelMap.deleteMany).not.toHaveBeenCalled();
    expect(db.contactLabelMap.createMany).not.toHaveBeenCalled();
    expect(res).toBeNull();
  });

  test("resolves the contact against the caller's org first", async () => {
    await assignLabelsToContact("c1", [], ORG);

    expect(db.contact.findFirst.mock.calls[0][0].where).toEqual({ id: "c1", orgId: ORG });
  });

  test("returns the contact with its new labels attached", async () => {
    db.contact.findFirst
      .mockResolvedValueOnce({ id: "c1" })
      .mockResolvedValueOnce({ id: "c1", ContactLabelMap: [] });

    expect(await assignLabelsToContact("c1", [], ORG)).toEqual({ id: "c1", ContactLabelMap: [] });
    expect(db.contact.findFirst.mock.calls[1][0].where).toEqual({ id: "c1", orgId: ORG });
  });
});

// ===========================================================================
// assignLabelsToContacts (bulk)
// ===========================================================================

describe("assignLabelsToContacts", () => {
  test("clears the labels of every listed contact first", async () => {
    db.contactLabel.findMany.mockResolvedValue([{ id: "l1" }]);

    await assignLabelsToContacts(["c1", "c2"], ["l1"], ORG);

    expect(db.contactLabelMap.deleteMany).toHaveBeenCalledWith({
      where: { contactId: { in: ["c1", "c2"] } },
    });
  });

  test("writes the cross product of contacts and valid labels", async () => {
    db.contactLabel.findMany.mockResolvedValue([{ id: "l1" }, { id: "l2" }]);

    await assignLabelsToContacts(["c1", "c2"], ["l1", "l2"], ORG);

    expect(db.contactLabelMap.createMany).toHaveBeenCalledWith({
      data: [
        { contactId: "c1", labelId: "l1" },
        { contactId: "c1", labelId: "l2" },
        { contactId: "c2", labelId: "l1" },
        { contactId: "c2", labelId: "l2" },
      ],
      skipDuplicates: true,
    });
  });

  test("only writes labels that belong to the caller's org", async () => {
    db.contactLabel.findMany.mockResolvedValue([]);

    await assignLabelsToContacts(["c1"], ["l-other-org"], ORG);

    expect(db.contactLabelMap.createMany).not.toHaveBeenCalled();
  });

  test("touches nothing for contacts belonging to another org", async () => {
    db.contact.findMany.mockResolvedValue([]);

    await assignLabelsToContacts(["c-other-org"], [], ORG);

    expect(db.contactLabelMap.deleteMany).not.toHaveBeenCalled();
  });

  test("acts only on the ids the caller's org actually owns", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c1" }]);
    db.contactLabel.findMany.mockResolvedValue([{ id: "l1" }]);

    await assignLabelsToContacts(["c1", "c-other-org"], ["l1"], ORG);

    expect(db.contact.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ["c1", "c-other-org"] },
      orgId: ORG,
    });
    expect(db.contactLabelMap.deleteMany).toHaveBeenCalledWith({
      where: { contactId: { in: ["c1"] } },
    });
    expect(db.contactLabelMap.createMany.mock.calls[0][0].data).toEqual([
      { contactId: "c1", labelId: "l1" },
    ]);
  });

  test("reports what it did", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c1" }]);
    db.contactLabel.findMany.mockResolvedValue([{ id: "l1" }]);

    await expect(assignLabelsToContacts(["c1", "c-other-org"], ["l1"], ORG)).resolves.toEqual({
      updated: 1,
      skipped: 1,
      labelsApplied: 1,
    });
  });

  test("reports a clear with no labels applied", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c1" }]);

    await expect(assignLabelsToContacts(["c1"], [], ORG)).resolves.toEqual({
      updated: 1,
      skipped: 0,
      labelsApplied: 0,
    });
  });
});

// ===========================================================================
// getContactsWithLabels
// ===========================================================================

describe("getContactsWithLabels", () => {
  test("lists the org's contacts when no label filter is given", async () => {
    await getContactsWithLabels(ORG);

    expect(db.contact.findMany.mock.calls[0][0].where).toEqual({ orgId: ORG });
  });

  test("treats an empty label list as no filter", async () => {
    await getContactsWithLabels(ORG, []);

    expect(db.contact.findMany.mock.calls[0][0].where).toEqual({ orgId: ORG });
  });

  // On Contact the label relation is named `ContactLabelMap` (`contactLabels` is the
  // relation on *ContactLabel*). It used to filter on the latter, which prisma rejects
  // outright, so filtering this endpoint by label never worked.
  test("filters on the Contact side of the label join", async () => {
    await getContactsWithLabels(ORG, ["l1"]);

    const where = db.contact.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty("contactLabels");
    expect(where.ContactLabelMap).toEqual({ some: { labelId: { in: ["l1"] } } });
  });

  test("returns each contact with its labels expanded", async () => {
    db.contact.findMany.mockResolvedValue([
      { id: "c1", ContactLabelMap: [{ label: { id: "l1" } }] },
    ]);

    expect(await getContactsWithLabels(ORG)).toEqual([
      { id: "c1", ContactLabelMap: [{ label: { id: "l1" } }] },
    ]);
  });
});
