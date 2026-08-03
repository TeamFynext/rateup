import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    contact: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    team: { findFirst: vi.fn() },
    contactGroup: {
      create: vi.fn(),
      findFirst: vi.fn(),
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
  team: Record<string, Mock>;
  contactGroup: Record<string, Mock>;
  contactGroupMap: Record<string, Mock>;
};

const ORG = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  db.contact.findMany.mockResolvedValue([]);
  db.contact.findUnique.mockResolvedValue(null);
  db.contact.count.mockResolvedValue(0);
  // Every group read is scoped through `team: { orgId }` now, so it is findFirst
  // rather than findUnique.
  db.contactGroup.findFirst.mockResolvedValue({ id: "g1", name: "VIPs" });
  db.contactGroup.findUnique.mockResolvedValue({ id: "g1", name: "VIPs" });
  db.team.findFirst.mockResolvedValue({ id: "t1" });
  db.contactGroup.findMany.mockResolvedValue([]);
  db.contactGroupMap.createManyAndReturn.mockResolvedValue([]);
  db.contactGroupMap.findMany.mockResolvedValue([]);
  db.contactGroupMap.deleteMany.mockResolvedValue({ count: 0 });
});

// ===========================================================================
// reads
// ===========================================================================

describe("getContactGroupById", () => {
  // The lookup was by id alone, with nothing tying the group to the caller's org
  // — and a group is the unit campaigns send to, so reading one hands over the
  // names and phone numbers it holds.
  test("fetches by id within the caller's org, including the member count", async () => {
    await getContactGroupById("g1", ORG);

    const call = db.contactGroup.findFirst.mock.calls[0][0];
    expect(call.where).toEqual({ id: "g1", team: { orgId: ORG } });
    expect(call.include._count.select.contacts).toBe(true);
  });

  test("reports nothing for a group belonging to another org", async () => {
    db.contactGroup.findFirst.mockResolvedValue(null);

    await expect(getContactGroupById("g-other-org", ORG)).resolves.toBeNull();
  });
});

describe("getContactGroupsByTeamId", () => {
  // The team id came straight off the query string and was never checked against
  // the caller's org, so one team id enumerated that team's groups.
  test("lists a team's normal groups only within the caller's org", async () => {
    await getContactGroupsByTeamId("t1", ORG);

    expect(db.contactGroup.findMany.mock.calls[0][0].where).toEqual({
      teamId: "t1",
      team: { orgId: ORG },
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
    db.contactGroup.findFirst.mockResolvedValue({
      contacts: [{ contact: { id: "c1" } }, { contact: { id: "c2" } }],
    });

    expect(await getContactsByContactGroupId("g1", ORG)).toEqual([{ id: "c1" }, { id: "c2" }]);
  });

  // Fixed: an id that matches no group used to return null and crash reading
  // `.contacts` off it. Now throws a clear, descriptive error instead of a
  // bare TypeError.
  test("throws for a group id that does not exist", async () => {
    db.contactGroup.findFirst.mockResolvedValue(null);

    await expect(getContactsByContactGroupId("nope", ORG)).rejects.toThrow(
      "Contact group nope not found",
    );
  });
});

// ===========================================================================
// getContactsByContactGroupIdWithPagination
// ===========================================================================

describe("getContactsByContactGroupIdWithPagination", () => {
  beforeEach(() => {
    db.contactGroup.findFirst.mockResolvedValue({ contacts: [{ contact: { id: "c1" } }] });
  });

  function memberFilter() {
    return db.contactGroup.findFirst.mock.calls[0][0].include.contacts.where.contact;
  }

  test("returns the group's contacts alongside the total", async () => {
    db.contact.count.mockResolvedValue(5);

    expect(await getContactsByContactGroupIdWithPagination("g1", ORG)).toEqual({
      group: [{ id: "c1" }],
      totalCount: 5,
    });
  });

  test("counts only contacts that are in the group", async () => {
    await getContactsByContactGroupIdWithPagination("g1", ORG);

    expect(db.contact.count.mock.calls[0][0].where.contactGroups).toEqual({
      some: { contactGroupId: "g1" },
    });
  });

  test("applies no filter at all when nothing was asked for", async () => {
    await getContactsByContactGroupIdWithPagination("g1", ORG, {} as any);

    expect(memberFilter()).toEqual({});
  });

  test("a search matches either the name or the phone", async () => {
    await getContactsByContactGroupIdWithPagination("g1", ORG, { search: "ann" } as any);

    expect(memberFilter().AND).toEqual([
      {
        OR: [
          { name: { contains: "ann", mode: "insensitive" } },
          { phone: { contains: "ann", mode: "insensitive" } },
        ],
      },
    ]);
  });

  test("the consent filter compares against a real boolean", async () => {
    await getContactsByContactGroupIdWithPagination("g1", ORG, { consent: "false" } as any);

    expect(memberFilter().AND).toEqual([{ consent: { equals: false } }]);
  });

  // Previously built `{ equal: "...", mode: "insensitive" }`, which prisma rejects
  // outright — `equal` is not an operator and a DateTime column takes no text mode.
  test("a createdAt filter compares against a real date", async () => {
    await getContactsByContactGroupIdWithPagination("g1", ORG, { createdAt: "2026-01-01" } as any);

    expect(memberFilter().AND).toEqual([{ createdAt: { equals: new Date("2026-01-01") } }]);
  });

  // The page was filtered with OR while the total was counted with AND, so with
  // two or more filters the table showed the union and the number above it
  // reported the intersection — more rows than the count claimed existed, and
  // paging past `totalCount / limit` silently dropped the remainder. One condition
  // now, and it ANDs: a filter is meant to narrow.
  test("the page and the total count use the same condition, ANDed", async () => {
    await getContactsByContactGroupIdWithPagination("g1", ORG, {
      name: "ann",
      consent: "true",
    } as any);

    const expected = [
      { name: { contains: "ann", mode: "insensitive" } },
      { consent: { equals: true } },
    ];
    expect(memberFilter()).toEqual({ AND: expected });
    expect(db.contact.count.mock.calls[0][0].where.AND).toEqual(expected);
  });

  test("pages through the membership with the requested size", async () => {
    await getContactsByContactGroupIdWithPagination("g1", ORG, { page: 2, limit: 25 } as any);

    const members = db.contactGroup.findFirst.mock.calls[0][0].include.contacts;
    expect(members).toMatchObject({ take: 25, skip: 50 });
  });

  test("sorts the membership by a contact column in the requested direction", async () => {
    await getContactsByContactGroupIdWithPagination("g1", ORG, {
      sort: "name",
      desc: "desc",
    } as any);

    expect(db.contactGroup.findFirst.mock.calls[0][0].include.contacts.orderBy).toEqual({
      contact: { name: "desc" },
    });
  });

  // Fixed: previously returned null and crashed reading `.contacts` off it
  // with a bare TypeError; now throws a clear, descriptive error.
  test("throws for a group id that does not exist", async () => {
    db.contactGroup.findFirst.mockResolvedValue(null);

    await expect(getContactsByContactGroupIdWithPagination("nope", ORG)).rejects.toThrow(
      "Contact group nope not found",
    );
  });
});

// ===========================================================================
// writes
// ===========================================================================

describe("createContactGroup", () => {
  // The teamId comes from the request body and was written unchecked, so a group
  // could be created inside another org's team — where it then appears in that
  // org's UI and can be sent to.
  test("writes the fields it was given once the team is the caller's", async () => {
    await createContactGroup(
      { name: "VIPs", icon: "star", teamId: "t1", type: "NORMAL", tags: ["a"] } as any,
      ORG,
    );

    expect(db.team.findFirst.mock.calls[0][0].where).toEqual({ id: "t1", orgId: ORG });
    expect(db.contactGroup.create).toHaveBeenCalledWith({
      data: { name: "VIPs", icon: "star", teamId: "t1", type: "NORMAL", tags: ["a"] },
    });
  });

  test("refuses a team belonging to another org", async () => {
    db.team.findFirst.mockResolvedValue(null);

    await expect(
      createContactGroup({ name: "planted", teamId: "t-other-org" } as any, ORG),
    ).rejects.toThrow("Team not found");
    expect(db.contactGroup.create).not.toHaveBeenCalled();
  });
});

describe("addNewContactsToGroup", () => {
  test("refuses when the group does not exist", async () => {
    db.contactGroup.findFirst.mockResolvedValue(null);

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

  // It ended after the trigger loop with no return, so the endpoint answered 200
  // with an empty body and the caller could not tell how many contacts were
  // actually added — the interesting number, since rows with an invalid phone are
  // dropped silently.
  test("reports how many it added and how many phones were not real", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c1" }]);
    db.contactGroupMap.createManyAndReturn.mockResolvedValue([{ contactId: "c1" }]);

    await expect(
      addNewContactsToGroup(
        "g1",
        [
          { name: "Ann", phone: "919876543210" },
          { name: "Bad", phone: "12" },
        ] as any,
        ORG,
      ),
    ).resolves.toEqual({ added: 1, invalidPhones: 1 });
  });
});

describe("addExistingContactsToGroup", () => {
  test("refuses when the group does not exist", async () => {
    db.contactGroup.findFirst.mockResolvedValue(null);

    await expect(addExistingContactsToGroup("nope", ["c1"], false, ORG)).rejects.toThrow(
      "Contact group not found",
    );
  });

  // The sharpest instance of 18.24. The source carried a bare `TODO: check if
  // contactIds belong to the same team? / FIXME:` and wrote the ids straight into
  // the join table, so contacts could be pushed across the org boundary into a
  // list that would later be messaged.
  test("writes only the contact ids the caller's org owns", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c1" }]);

    await addExistingContactsToGroup("g1", ["c1", "c-other-org"], false, ORG);

    expect(db.contact.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ["c1", "c-other-org"] },
      orgId: ORG,
    });
    expect(db.contactGroupMap.createManyAndReturn).toHaveBeenCalledWith({
      skipDuplicates: true,
      data: [{ contactId: "c1", contactGroupId: "g1" }],
    });
  });

  test("reports how many it added and how many it skipped", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c1" }]);
    db.contactGroupMap.createManyAndReturn.mockResolvedValue([{ contactId: "c1" }]);

    await expect(
      addExistingContactsToGroup("g1", ["c1", "c-other-org"], false, ORG),
    ).resolves.toEqual({ added: 1, skipped: 1 });
  });

  test("announces each new membership against the caller's org", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c1" }]);
    db.contactGroupMap.createManyAndReturn.mockResolvedValue([{ contactId: "c1" }]);

    await addExistingContactsToGroup("g1", ["c1"], false, ORG);

    expect((addZapierTriggerToQueue as Mock).mock.calls[0][2]).toBe(ORG);
  });
});

describe("addExistingContactsToMultipleGroups", () => {
  beforeEach(() => {
    db.contactGroup.findMany.mockResolvedValue([{ id: "g1" }, { id: "g2" }]);
  });

  test("adds a contact to each requested group", async () => {
    await addExistingContactsToMultipleGroups(["c1"], ["g1", "g2"], ORG);

    expect(db.contactGroupMap.createManyAndReturn).toHaveBeenCalledTimes(2);
  });

  // Every group id came straight off the request body.
  test("writes only into groups the caller's org owns", async () => {
    db.contactGroup.findMany.mockResolvedValue([{ id: "g1" }]);

    await addExistingContactsToMultipleGroups(["c1"], ["g1", "g-other-org"], ORG);

    expect(db.contactGroup.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ["g1", "g-other-org"] },
      team: { orgId: ORG },
    });
    expect(db.contactGroupMap.createManyAndReturn).toHaveBeenCalledTimes(1);
    expect(db.contactGroupMap.createManyAndReturn.mock.calls[0][0].data).toEqual([
      { contactId: "c1", contactGroupId: "g1" },
    ]);
  });

  test("does nothing for an empty group list", async () => {
    db.contactGroup.findMany.mockResolvedValue([]);

    expect(await addExistingContactsToMultipleGroups(["c1"], [], ORG)).toEqual([]);
    expect(db.contactGroupMap.createManyAndReturn).not.toHaveBeenCalled();
  });

  // Unlike its two siblings this one omitted `skipDuplicates` and instead read the
  // existing memberships and filtered them out. That read-then-write is not
  // atomic: two concurrent requests adding the same contact to the same group both
  // saw it as absent, and the second raised a unique-constraint error that failed
  // the whole request — which, because createContact calls this without awaiting
  // it (18.2), surfaced as an unhandled rejection.
  test("relies on skipDuplicates rather than a read-then-write", async () => {
    await addExistingContactsToMultipleGroups(["c1"], ["g1"], ORG);

    expect(db.contactGroupMap.findMany).not.toHaveBeenCalled();
    expect(db.contactGroupMap.createManyAndReturn.mock.calls[0][0].skipDuplicates).toBe(true);
  });
});

describe("updateContactGroup / deleteContactGroup / deleteManyContactGroups", () => {
  // All three took ids straight from the request with no org restriction, so a
  // group id was enough to rename or delete another org's group.
  test("an update is scoped to the caller's org", async () => {
    await updateContactGroup("g1", ORG, { name: "New" } as any);

    expect(db.contactGroup.update).toHaveBeenCalledWith({
      where: { id: "g1", team: { orgId: ORG } },
      data: { name: "New" },
    });
  });

  test("a delete is scoped to the caller's org", async () => {
    await deleteContactGroup("g1", ORG);

    expect(db.contactGroup.delete).toHaveBeenCalledWith({
      where: { id: "g1", team: { orgId: ORG } },
    });
  });

  test("a bulk delete removes only the ids the caller's org owns", async () => {
    await deleteManyContactGroups(["g1", "g2"], ORG);

    expect(db.contactGroup.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["g1", "g2"] }, team: { orgId: ORG } },
    });
  });
});

describe("removeContactsFromGroup", () => {
  test("removes only the named contacts from a group the caller's org owns", async () => {
    await removeContactsFromGroup("g1", ORG, ["c1", "c2"] as any);

    expect(db.contactGroupMap.deleteMany).toHaveBeenCalledWith({
      where: {
        contactGroupId: "g1",
        contactGroup: { team: { orgId: ORG } },
        contactId: { in: ["c1", "c2"] },
      },
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
