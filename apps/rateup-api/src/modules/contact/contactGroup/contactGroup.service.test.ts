import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    contact: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    contactGroup: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    contactGroupMap: {
      createManyAndReturn: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../integrations/external/zapier/zapier.service.js", () => ({
  addZapierTriggerToQueue: vi.fn(),
  ZapierTriggers: { CONTACT_ADDED_TO_GROUP: "contact_added_to_group" },
}));

vi.mock("../../../../generated/prisma/client.js", () => ({
  ContactGroupType: { NORMAL: "NORMAL", LOYALTY: "LOYALTY" },
}));

import prisma from "../../../utils/prisma.js";
import { addZapierTriggerToQueue } from "../../integrations/external/zapier/zapier.service.js";
import {
  addExistingContactsToGroup,
  addExistingContactsToMultipleGroups,
  addNewContactsToGroup,
  createContactGroup,
  deleteContactGroup,
  deleteManyContactGroups,
  getContactGroupById,
  getContactGroupByNameAndTeam,
  getContactGroupsByContactId,
  getContactGroupsByOrgId,
  getContactGroupsByTeamId,
  getContactsByContactGroupId,
  getContactsByContactGroupIdWithPagination,
  removeContactsFromGroup,
  updateContactGroup,
  updateContactGroupsForContact,
} from "./contactGroup.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  contact: Record<string, Mock>;
  contactGroup: Record<string, Mock>;
  contactGroupMap: Record<string, Mock>;
};

const ORG = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  db.contact.findMany.mockResolvedValue([]);
  db.contact.findUnique.mockResolvedValue(null);
  db.contact.count.mockResolvedValue(0);
  db.contactGroup.findUnique.mockResolvedValue({ id: "g1", name: "VIPs" });
  db.contactGroup.findMany.mockResolvedValue([]);
  db.contactGroupMap.createManyAndReturn.mockResolvedValue([]);
  db.contactGroupMap.findMany.mockResolvedValue([]);
  db.contactGroupMap.deleteMany.mockResolvedValue({ count: 0 });
});

// ===========================================================================
// reads
// ===========================================================================

describe("getContactGroupById", () => {
  // NOTE: the lookup is by id alone; nothing ties the group to the caller's org.
  // See issues.txt 18.24.
  test("fetches by id with no org restriction, including the member count", async () => {
    await getContactGroupById("g1");

    const call = db.contactGroup.findUnique.mock.calls[0][0];
    expect(call.where).toEqual({ id: "g1" });
    expect(call.include._count.select.contacts).toBe(true);
  });
});

describe("getContactGroupsByTeamId", () => {
  // NOTE: the team id comes straight off the query string and is never checked
  // against the caller's org. See issues.txt 18.24.
  test("lists a team's normal groups without checking the team's org", async () => {
    await getContactGroupsByTeamId("t1");

    expect(db.contactGroup.findMany.mock.calls[0][0].where).toEqual({
      teamId: "t1",
      type: "NORMAL",
    });
  });
});

describe("getContactGroupsByOrgId", () => {
  test("lists every group belonging to the org's teams", async () => {
    await getContactGroupsByOrgId(ORG);

    expect(db.contactGroup.findMany.mock.calls[0][0].where).toEqual({
      team: { orgId: ORG },
      type: undefined,
    });
  });

  test("narrows to a single group type when one is asked for", async () => {
    await getContactGroupsByOrgId(ORG, "LOYALTY" as any);

    expect(db.contactGroup.findMany.mock.calls[0][0].where.type).toBe("LOYALTY");
  });
});

describe("getContactGroupByNameAndTeam", () => {
  test("uses the name+team unique key", async () => {
    await getContactGroupByNameAndTeam("VIPs", "t1");

    expect(db.contactGroup.findUnique).toHaveBeenCalledWith({
      where: { group_name_team_id_unique: { name: "VIPs", teamId: "t1" } },
    });
  });
});

describe("getContactsByContactGroupId", () => {
  test("unwraps the join rows to plain contacts", async () => {
    db.contactGroup.findUnique.mockResolvedValue({
      contacts: [{ contact: { id: "c1" } }, { contact: { id: "c2" } }],
    });

    expect(await getContactsByContactGroupId("g1")).toEqual([{ id: "c1" }, { id: "c2" }]);
  });

  // NOTE: an id that matches no group returns null and `.contacts` is read off it
  // immediately. See issues.txt 18.25.
  test("throws for a group id that does not exist", async () => {
    db.contactGroup.findUnique.mockResolvedValue(null);

    await expect(getContactsByContactGroupId("nope")).rejects.toThrow(TypeError);
  });
});

// ===========================================================================
// getContactsByContactGroupIdWithPagination
// ===========================================================================

describe("getContactsByContactGroupIdWithPagination", () => {
  beforeEach(() => {
    db.contactGroup.findUnique.mockResolvedValue({ contacts: [{ contact: { id: "c1" } }] });
  });

  function memberFilter() {
    return db.contactGroup.findUnique.mock.calls[0][0].include.contacts.where.contact;
  }

  test("returns the group's contacts alongside the total", async () => {
    db.contact.count.mockResolvedValue(5);

    expect(await getContactsByContactGroupIdWithPagination("g1")).toEqual({
      group: [{ id: "c1" }],
      totalCount: 5,
    });
  });

  test("counts only contacts that are in the group", async () => {
    await getContactsByContactGroupIdWithPagination("g1");

    expect(db.contact.count.mock.calls[0][0].where.contactGroups).toEqual({
      some: { contactGroupId: "g1" },
    });
  });

  test("applies no filter at all when nothing was asked for", async () => {
    await getContactsByContactGroupIdWithPagination("g1", {} as any);

    expect(memberFilter()).toEqual({});
  });

  test("a search matches either the name or the phone", async () => {
    await getContactsByContactGroupIdWithPagination("g1", { search: "ann" } as any);

    expect(memberFilter().OR).toEqual([
      { name: { contains: "ann", mode: "insensitive" } },
      { phone: { contains: "ann", mode: "insensitive" } },
    ]);
  });

  test("the consent filter compares against a real boolean", async () => {
    await getContactsByContactGroupIdWithPagination("g1", { consent: "false" } as any);

    expect(memberFilter().OR).toEqual([{ consent: { equals: false } }]);
  });

  // NOTE: prisma's operator is `equals`; `equal` is not a filter it knows, so a
  // createdAt filter is rejected outright. The same typo appears in the campaign
  // participants filter (issues.txt 17.9). See issues.txt 18.26.
  test("a createdAt filter is built with a misspelled prisma operator", async () => {
    await getContactsByContactGroupIdWithPagination("g1", { createdAt: "2026-01-01" } as any);

    expect(memberFilter().OR).toEqual([
      { createdAt: { equal: "2026-01-01", mode: "insensitive" } },
    ]);
  });

  // NOTE: the page is filtered with OR but the total is counted with AND, so the
  // number above the table and the rows inside it disagree whenever more than
  // one filter is set. See issues.txt 18.27.
  test("the page uses OR while the total count uses AND", async () => {
    await getContactsByContactGroupIdWithPagination("g1", {
      name: "ann",
      consent: "true",
    } as any);

    expect(memberFilter()).toHaveProperty("OR");
    expect(db.contact.count.mock.calls[0][0].where.AND).toEqual([
      { name: { contains: "ann", mode: "insensitive" } },
      { consent: { equals: true } },
    ]);
  });

  test("pages through the membership with the requested size", async () => {
    await getContactsByContactGroupIdWithPagination("g1", { page: 2, limit: 25 } as any);

    const members = db.contactGroup.findUnique.mock.calls[0][0].include.contacts;
    expect(members).toMatchObject({ take: 25, skip: 50 });
  });

  test("sorts the membership by a contact column in the requested direction", async () => {
    await getContactsByContactGroupIdWithPagination("g1", { sort: "name", desc: "desc" } as any);

    expect(db.contactGroup.findUnique.mock.calls[0][0].include.contacts.orderBy).toEqual({
      contact: { name: "desc" },
    });
  });

  test("throws for a group id that does not exist", async () => {
    db.contactGroup.findUnique.mockResolvedValue(null);

    await expect(getContactsByContactGroupIdWithPagination("nope")).rejects.toThrow(TypeError);
  });
});

// ===========================================================================
// writes
// ===========================================================================

describe("createContactGroup", () => {
  // NOTE: the teamId comes from the request body and is written unchecked, so a
  // group can be created inside another org's team. See issues.txt 18.24.
  test("writes exactly the fields it was given, teamId included", async () => {
    await createContactGroup({
      name: "VIPs",
      icon: "star",
      teamId: "t1",
      type: "NORMAL",
      tags: ["a"],
    } as any);

    expect(db.contactGroup.create).toHaveBeenCalledWith({
      data: { name: "VIPs", icon: "star", teamId: "t1", type: "NORMAL", tags: ["a"] },
    });
  });
});

describe("addNewContactsToGroup", () => {
  test("refuses when the group does not exist", async () => {
    db.contactGroup.findUnique.mockResolvedValue(null);

    await expect(addNewContactsToGroup("nope", [] as any, ORG)).rejects.toThrow(
      "Contact group not found",
    );
  });

  test("drops rows whose phone number is not real before looking them up", async () => {
    await addNewContactsToGroup(
      "g1",
      [
        { name: "Ann", phone: "919876543210" },
        { name: "Bad", phone: "12" },
      ] as any,
      ORG,
    );

    expect(db.contact.findMany.mock.calls[0][0].where).toEqual({
      phone: { in: ["919876543210"] },
      orgId: ORG,
    });
  });

  // The lookup is org-scoped, so a phone that belongs to another org's contact
  // simply does not come back and is never added to the group.
  test("only ever resolves phone numbers inside the caller's org", async () => {
    await addNewContactsToGroup("g1", [{ name: "Ann", phone: "919876543210" }] as any, ORG);

    expect(db.contact.findMany.mock.calls[0][0].where.orgId).toBe(ORG);
  });

  test("maps the resolved contacts into the group", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);

    await addNewContactsToGroup("g1", [{ name: "Ann", phone: "919876543210" }] as any, ORG);

    expect(db.contactGroupMap.createManyAndReturn).toHaveBeenCalledWith({
      skipDuplicates: true,
      data: [
        { contactId: "c1", contactGroupId: "g1" },
        { contactId: "c2", contactGroupId: "g1" },
      ],
    });
  });

  test("announces only the memberships that were newly created", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    db.contactGroupMap.createManyAndReturn.mockResolvedValue([
      { contactId: "c1", contactGroupId: "g1" },
    ]);

    await addNewContactsToGroup("g1", [{ name: "Ann", phone: "919876543210" }] as any, ORG);

    expect(addZapierTriggerToQueue).toHaveBeenCalledTimes(1);
    expect(addZapierTriggerToQueue).toHaveBeenCalledWith(
      "contact_added_to_group",
      { contact_added_to_group: { contactId: "c1", contactGroupId: "g1" } },
      ORG,
    );
  });

  // NOTE: the function ends after the trigger loop with no return, so the
  // handler that assigns its result always sends an empty body.
  // See issues.txt 18.28.
  test("returns nothing at all", async () => {
    expect(await addNewContactsToGroup("g1", [] as any, ORG)).toBeUndefined();
  });
});

describe("addExistingContactsToGroup", () => {
  test("refuses when the group does not exist", async () => {
    db.contactGroup.findUnique.mockResolvedValue(null);

    await expect(addExistingContactsToGroup("nope", ["c1"], false, ORG)).rejects.toThrow(
      "Contact group not found",
    );
  });

  // NOTE: the source carries an explicit `TODO: check if contactIds belong to the
  // same team? FIXME:` — the ids are written straight into the join table, so any
  // contact id at all can be pulled into a group. See issues.txt 18.24.
  test("writes every contact id it is given without checking who owns them", async () => {
    await addExistingContactsToGroup("g1", ["c1", "c-other-org"], false, ORG);

    expect(db.contactGroupMap.createManyAndReturn).toHaveBeenCalledWith({
      skipDuplicates: true,
      data: [
        { contactId: "c1", contactGroupId: "g1" },
        { contactId: "c-other-org", contactGroupId: "g1" },
      ],
    });
    expect(db.contact.findMany).not.toHaveBeenCalled();
  });

  test("announces each new membership against the caller's org", async () => {
    db.contactGroupMap.createManyAndReturn.mockResolvedValue([{ contactId: "c1" }]);

    await addExistingContactsToGroup("g1", ["c1"], false, ORG);

    expect((addZapierTriggerToQueue as Mock).mock.calls[0][2]).toBe(ORG);
  });
});

describe("addExistingContactsToMultipleGroups", () => {
  test("adds a contact to each requested group", async () => {
    await addExistingContactsToMultipleGroups(["c1"], ["g1", "g2"], ORG);

    expect(db.contactGroupMap.createManyAndReturn).toHaveBeenCalledTimes(2);
  });

  test("skips a contact that is already in the group", async () => {
    db.contactGroupMap.findMany.mockResolvedValue([{ contactId: "c1", contactGroupId: "g1" }]);

    await addExistingContactsToMultipleGroups(["c1"], ["g1"], ORG);

    expect(db.contactGroupMap.createManyAndReturn).not.toHaveBeenCalled();
  });

  test("adds only the contacts that are not yet members", async () => {
    db.contactGroupMap.findMany.mockResolvedValue([{ contactId: "c1", contactGroupId: "g1" }]);

    await addExistingContactsToMultipleGroups(["c1", "c2"], ["g1"], ORG);

    expect(db.contactGroupMap.createManyAndReturn.mock.calls[0][0].data).toEqual([
      { contactId: "c2", contactGroupId: "g1" },
    ]);
  });

  test("does nothing for an empty group list", async () => {
    expect(await addExistingContactsToMultipleGroups(["c1"], [], ORG)).toEqual([]);
    expect(db.contactGroupMap.findMany).not.toHaveBeenCalled();
  });

  // NOTE: unlike the other two writers this one omits `skipDuplicates`, so a
  // membership created between the read and the write raises a unique-constraint
  // error instead of being ignored. See issues.txt 18.29.
  test("writes without skipDuplicates, unlike its two siblings", async () => {
    await addExistingContactsToMultipleGroups(["c1"], ["g1"], ORG);

    expect(db.contactGroupMap.createManyAndReturn.mock.calls[0][0]).not.toHaveProperty(
      "skipDuplicates",
    );
  });
});

describe("updateContactGroup / deleteContactGroup / deleteManyContactGroups", () => {
  // NOTE: all three take ids straight from the request with no org restriction.
  // See issues.txt 18.24.
  test("an update is keyed on the group id alone", async () => {
    await updateContactGroup("g1", { name: "New" } as any);

    expect(db.contactGroup.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { name: "New" },
    });
  });

  test("a delete is keyed on the group id alone", async () => {
    await deleteContactGroup("g1");

    expect(db.contactGroup.delete).toHaveBeenCalledWith({ where: { id: "g1" } });
  });

  test("a bulk delete removes every id it is given", async () => {
    await deleteManyContactGroups(["g1", "g2"]);

    expect(db.contactGroup.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["g1", "g2"] } },
    });
  });
});

describe("removeContactsFromGroup", () => {
  test("removes only the named contacts from the named group", async () => {
    await removeContactsFromGroup("g1", ["c1", "c2"] as any);

    expect(db.contactGroupMap.deleteMany).toHaveBeenCalledWith({
      where: { contactGroupId: "g1", contactId: { in: ["c1", "c2"] } },
    });
  });
});

// ===========================================================================
// per-contact group membership
// ===========================================================================

describe("getContactGroupsByContactId", () => {
  test("scopes the lookup through the contact's org", async () => {
    db.contactGroupMap.findMany.mockResolvedValue([{ contactGroup: { id: "g1" } }]);

    const res = await getContactGroupsByContactId("c1", ORG);

    expect(db.contactGroupMap.findMany.mock.calls[0][0].where).toEqual({
      contactId: "c1",
      contact: { orgId: ORG },
    });
    expect(res).toEqual([{ id: "g1" }]);
  });
});

describe("updateContactGroupsForContact", () => {
  test("refuses a contact that belongs to another org", async () => {
    db.contact.findUnique.mockResolvedValue({ orgId: "other-org" });

    expect(await updateContactGroupsForContact("c1", ["g1"], [], ORG)).toEqual({
      added: [],
      removed: [],
    });
    expect(db.contactGroupMap.createManyAndReturn).not.toHaveBeenCalled();
  });

  test("refuses a contact that does not exist", async () => {
    db.contact.findUnique.mockResolvedValue(null);

    expect(await updateContactGroupsForContact("nope", ["g1"], [], ORG)).toEqual({
      added: [],
      removed: [],
    });
  });

  test("removes the requested memberships and reports the groups it left", async () => {
    db.contact.findUnique.mockResolvedValue({ orgId: ORG });
    db.contactGroupMap.findMany.mockResolvedValue([{ contactGroup: { id: "g1", name: "VIPs" } }]);

    const res = await updateContactGroupsForContact("c1", [], ["g1"], ORG);

    expect(db.contactGroupMap.deleteMany).toHaveBeenCalledWith({
      where: { contactId: "c1", contactGroupId: { in: ["g1"] } },
    });
    expect(res.removed).toEqual([{ id: "g1", name: "VIPs" }]);
  });

  test("does not issue a delete when the contact was in none of those groups", async () => {
    db.contact.findUnique.mockResolvedValue({ orgId: ORG });
    db.contactGroupMap.findMany.mockResolvedValue([]);

    await updateContactGroupsForContact("c1", [], ["g1"], ORG);

    expect(db.contactGroupMap.deleteMany).not.toHaveBeenCalled();
  });

  // This is the one group writer that does validate the target groups' org.
  test("adds only groups that belong to the caller's org", async () => {
    db.contact.findUnique.mockResolvedValue({ orgId: ORG });
    db.contactGroup.findMany.mockResolvedValue([{ id: "g1" }]);

    await updateContactGroupsForContact("c1", ["g1", "g-other-org"], [], ORG);

    expect(db.contactGroup.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ["g1", "g-other-org"] },
      team: { orgId: ORG },
    });
    expect(db.contactGroupMap.createManyAndReturn.mock.calls[0][0].data).toEqual([
      { contactId: "c1", contactGroupId: "g1" },
    ]);
  });

  test("writes nothing when none of the requested groups survive the org check", async () => {
    db.contact.findUnique.mockResolvedValue({ orgId: ORG });
    db.contactGroup.findMany.mockResolvedValue([]);

    const res = await updateContactGroupsForContact("c1", ["g-other-org"], [], ORG);

    expect(db.contactGroupMap.createManyAndReturn).not.toHaveBeenCalled();
    expect(res.added).toEqual([]);
  });

  test("adds and removes in a single call", async () => {
    db.contact.findUnique.mockResolvedValue({ orgId: ORG });
    db.contactGroupMap.findMany.mockResolvedValue([{ contactGroup: { id: "g-old" } }]);
    db.contactGroup.findMany.mockResolvedValue([{ id: "g-new" }]);
    db.contactGroupMap.createManyAndReturn.mockResolvedValue([{ contactGroupId: "g-new" }]);

    const res = await updateContactGroupsForContact("c1", ["g-new"], ["g-old"], ORG);

    expect(res).toEqual({ added: [{ contactGroupId: "g-new" }], removed: [{ id: "g-old" }] });
  });
});
