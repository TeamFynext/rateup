import { beforeEach, describe, expect, test, vi } from "vitest";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/rateLimit.js", () => ({ rateLimit: () => async () => {} }));

/**
 * A two-org world. The fakes honour the org filters they are given, so a query that forgot
 * to scope would find the other org's rows and the cross-tenant tests would fail.
 */
const ORG = "org-1";
const G1 = "11111111-1111-4111-8111-111111111111";
const G_OTHER = "22222222-2222-4222-8222-222222222222";
const C1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const C2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const C_OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const TEAM = "33333333-3333-4333-8333-333333333333";

const GROUPS = [
  { id: G1, orgId: ORG },
  { id: G_OTHER, orgId: "org-2" },
];
const CONTACTS = [
  { id: C1, orgId: ORG, phone: "919000000001" },
  { id: C2, orgId: ORG, phone: "919000000002" },
  { id: C_OTHER, orgId: "org-2", phone: "919000000009" },
];

type Where = Record<string, any>;

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    contactGroup: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    contact: { findMany: vi.fn() },
    contactCustomField: { findMany: vi.fn() },
  },
}));
vi.mock("../../../modules/contact/contact.service.js", () => ({
  createMultipleContacts: vi.fn(),
}));
vi.mock("../../../modules/contact/contactGroup/contactGroup.service.js", async () => {
  const errors = await vi.importActual<
    typeof import("../../../modules/contact/contactGroup/contactGroup.errors.js")
  >("../../../modules/contact/contactGroup/contactGroup.errors.js");
  return {
    ContactGroupNotFoundError: errors.ContactGroupNotFoundError,
    addExistingContactsToGroup: vi.fn(),
    createContactGroup: vi.fn(),
    removeContactsFromGroup: vi.fn(),
  };
});

import prisma from "../../../utils/prisma.js";
import { createMultipleContacts } from "../../../modules/contact/contact.service.js";
import {
  addExistingContactsToGroup,
  ContactGroupNotFoundError,
  createContactGroup,
  removeContactsFromGroup,
} from "../../../modules/contact/contactGroup/contactGroup.service.js";
import { externalErrorHandler } from "../../shared/errors.js";
import { externalContactGroupRoutes } from "./contactGroups.route.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  contactGroup: Record<"findFirst" | "findMany" | "updateMany" | "deleteMany", Mock>;
  contact: { findMany: Mock };
  contactCustomField: { findMany: Mock };
};

const groupRow = (id: string, createdAt = "2026-01-01T00:00:00.000Z") => ({
  id,
  name: "VIPs",
  icon: null,
  tags: { vip: true },
  teamId: TEAM,
  type: "NORMAL",
  createdAt: new Date(createdAt),
  _count: { contacts: 2 },
  // Internal / unrelated columns a careless spread would leak.
  team: { orgId: ORG, name: "Main" },
  campaignParticipants: [{ id: "cp-1" }],
});

const contactRow = (id: string, phone: string) => ({
  id,
  name: "Ann",
  phone,
  email: null,
  external_id: null,
  source: "external",
  consent: true,
  createdAt: new Date("2026-01-02T00:00:00.000Z"),
  ContactLabelMap: [],
  customFields: [],
  chatbotId: "bot-9",
  lastReceivedMetadata: { secret: true },
  waMessageAssignStatus: "OPEN",
  orgId: ORG,
});

const inOrg = (where: Where, group: { id: string; orgId: string }) =>
  where.id === group.id && where.team?.orgId === group.orgId;

async function buildApp() {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(externalErrorHandler);
  app.addHook("preHandler", async (request) => {
    (request as { user?: unknown }).user = { orgId: ORG, role: "SUPER_ADMIN" };
  });
  await app.register(externalContactGroupRoutes);
  await app.ready();
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.contactGroup.findFirst.mockImplementation(async ({ where }: { where: Where }) => {
    const g = GROUPS.find((g) => inOrg(where, g));
    return g ? groupRow(g.id) : null;
  });
  db.contactGroup.updateMany.mockImplementation(async ({ where }: { where: Where }) => ({
    count: GROUPS.filter((g) => inOrg(where, g)).length,
  }));
  db.contactGroup.deleteMany.mockImplementation(async ({ where }: { where: Where }) => ({
    count: GROUPS.filter((g) => inOrg(where, g)).length,
  }));
  db.contact.findMany.mockImplementation(async ({ where }: { where: Where }) =>
    CONTACTS.filter(
      (c) =>
        c.orgId === where.orgId &&
        (!where.id?.in || where.id.in.includes(c.id)) &&
        (!where.phone?.in || where.phone.in.includes(c.phone)),
    ),
  );
  db.contactCustomField.findMany.mockResolvedValue([]);
});

describe("responses are allowlisted", () => {
  test("a group carries no internal columns", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/${G1}` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: G1,
      name: "VIPs",
      icon: null,
      tags: { vip: true },
      teamId: TEAM,
      type: "NORMAL",
      createdAt: "2026-01-01T00:00:00.000Z",
      memberCount: 2,
    });
  });

  test("a group's contacts carry no inbox columns", async () => {
    db.contact.findMany.mockResolvedValueOnce([contactRow(C1, "919000000001")]);
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/${G1}/contacts` });

    expect(res.statusCode).toBe(200);
    for (const leaked of ["chatbotId", "lastReceivedMetadata", "waMessageAssignStatus", "orgId"]) {
      expect(res.payload).not.toContain(leaked);
    }
    expect(res.json().data[0]).toMatchObject({ id: C1, phone: "919000000001", labels: [] });
    // Members are read through the contact's own org as well as the group's.
    expect(db.contact.findMany.mock.calls[0][0].where).toMatchObject({
      orgId: ORG,
      contactGroups: { some: { contactGroupId: G1 } },
    });
  });
});

describe("another org's group is a 404", () => {
  test.each([
    ["GET", `/${G_OTHER}`, undefined],
    ["GET", `/${G_OTHER}/contacts`, undefined],
    ["PATCH", `/${G_OTHER}`, { name: "x" }],
    ["DELETE", `/${G_OTHER}`, undefined],
    ["POST", `/${G_OTHER}/contacts`, { contactIds: [C1] }],
    ["POST", `/${G_OTHER}/contacts/remove`, { contactIds: [C1] }],
    ["POST", `/${G_OTHER}/contacts/import`, { contacts: [{ phone: "+919000000001" }] }],
  ] as const)("%s %s", async (method, url, payload) => {
    const app = await buildApp();
    const res = await app.inject({ method, url, payload });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: { code: "contact_group_not_found" } });
    expect(addExistingContactsToGroup).not.toHaveBeenCalled();
    expect(removeContactsFromGroup).not.toHaveBeenCalled();
    expect(createMultipleContacts).not.toHaveBeenCalled();
  });

  test("the group vanishing mid-request is still a 404", async () => {
    (addExistingContactsToGroup as Mock).mockRejectedValue(new ContactGroupNotFoundError());
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${G1}/contacts`,
      payload: { contactIds: [C1] },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("contact_group_not_found");
  });
});

describe("adding contacts", () => {
  test("another org's contact id is refused, not added", async () => {
    (addExistingContactsToGroup as Mock).mockResolvedValue({ added: 1, skipped: 0 });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${G1}/contacts`,
      payload: { contactIds: [C1, C_OTHER] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ added: 1, alreadyMembers: 0, notFound: [C_OTHER] });
    expect(addExistingContactsToGroup).toHaveBeenCalledWith(G1, [C1], undefined, ORG);
  });

  test("contacts already in the group, and repeated ids, are counted rather than a 500", async () => {
    (addExistingContactsToGroup as Mock).mockResolvedValue({ added: 0, skipped: 0 });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${G1}/contacts`,
      payload: { contactIds: [C1, C2, C1] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ added: 0, alreadyMembers: 2, notFound: [] });
    expect(addExistingContactsToGroup).toHaveBeenCalledWith(G1, [C1, C2], undefined, ORG);
  });

  test("only foreign ids: nothing is written", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${G1}/contacts`,
      payload: { contactIds: [C_OTHER] },
    });
    expect(res.json()).toEqual({ added: 0, alreadyMembers: 0, notFound: [C_OTHER] });
    expect(addExistingContactsToGroup).not.toHaveBeenCalled();
  });
});

describe("removing contacts", () => {
  test("answers the count and dedupes ids", async () => {
    (removeContactsFromGroup as Mock).mockResolvedValue({ count: 1 });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${G1}/contacts/remove`,
      payload: { contactIds: [C1, C1] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ removed: 1 });
    expect(removeContactsFromGroup).toHaveBeenCalledWith(G1, ORG, [C1]);
  });
});

describe("importing contacts", () => {
  test("creates the unknown, reuses the known, and collapses repeated phones", async () => {
    (createMultipleContacts as Mock).mockResolvedValue([{ id: "new-1", phone: "919000000003" }]);
    (addExistingContactsToGroup as Mock).mockResolvedValue({ added: 1, skipped: 0 });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${G1}/contacts/import`,
      payload: {
        contacts: [
          { phone: "+91 90000 00001", name: "Known" },
          { phone: "+919000000003", name: "New" },
          { phone: 919000000003, name: "Repeat" },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      created: 1,
      existing: 1,
      added: 1,
      alreadyMembers: 1,
      contacts: [
        { phone: "919000000001", contactId: C1, status: "existing", reason: null },
        { phone: "919000000003", contactId: "new-1", status: "created", reason: null },
      ],
    });
    const [toCreate, orgId] = (createMultipleContacts as Mock).mock.calls[0];
    expect(orgId).toBe(ORG);
    expect(toCreate).toEqual([
      expect.objectContaining({ phone: "919000000003", name: "New", source: "external" }),
    ]);
    // Nothing the dashboard bulk create would trust without an org check is passed.
    expect(toCreate[0]).not.toHaveProperty("labels");
    expect(toCreate[0]).not.toHaveProperty("contactGroupIds");
    expect(addExistingContactsToGroup).toHaveBeenCalledWith(G1, [C1, "new-1"], undefined, ORG);
  });

  test("every contact already a member is a 200", async () => {
    (addExistingContactsToGroup as Mock).mockResolvedValue({ added: 0, skipped: 0 });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${G1}/contacts/import`,
      payload: { contacts: [{ phone: "+919000000001" }, { phone: "+919000000002" }] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ created: 0, existing: 2, added: 0, alreadyMembers: 2 });
    expect(createMultipleContacts).not.toHaveBeenCalled();
  });

  test("a row the create skips is reported, not a 500", async () => {
    (createMultipleContacts as Mock).mockResolvedValue([]);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${G1}/contacts/import`,
      payload: { contacts: [{ phone: "+919000000005", externalId: "ext-1" }] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().contacts).toEqual([
      { phone: "919000000005", contactId: null, status: "failed", reason: "external_id_conflict" },
    ]);
  });

  test("a custom field slug from outside the org is a 400", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${G1}/contacts/import`,
      payload: { contacts: [{ phone: "+919000000005", customFields: { tier: "gold" } }] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatchObject({
      code: "validation_failed",
      details: { unknownCustomFields: ["tier"] },
    });
    expect(db.contactCustomField.findMany.mock.calls[0][0].where.orgId).toBe(ORG);
  });
});

describe("validation", () => {
  test.each([
    ["GET", "/not-a-uuid", undefined],
    ["PATCH", `/${G1}`, {}],
    ["POST", "/", { name: "x", teamId: "nope" }],
    ["POST", `/${G1}/contacts`, { contactIds: [] }],
    ["POST", `/${G1}/contacts`, { contactIds: ["nope"] }],
    [
      "POST",
      `/${G1}/contacts`,
      { contactIds: Array.from({ length: 1001 }, () => crypto.randomUUID()) },
    ],
    ["POST", `/${G1}/contacts/import`, { contacts: [{ phone: "12" }] }],
    [
      "POST",
      `/${G1}/contacts/import`,
      { contacts: Array.from({ length: 1001 }, () => ({ phone: "+919000000001" })) },
    ],
    ["GET", "/?limit=500", undefined],
  ] as const)("%s %s", async (method, url, payload) => {
    const app = await buildApp();
    const res = await app.inject({ method, url, payload });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("validation_failed");
  });
});

describe("pagination", () => {
  test("fetches limit + 1, hands back a cursor, and honours it", async () => {
    db.contactGroup.findMany.mockResolvedValueOnce([
      groupRow("44444444-4444-4444-8444-444444444443", "2026-01-03T00:00:00.000Z"),
      groupRow("44444444-4444-4444-8444-444444444442", "2026-01-02T00:00:00.000Z"),
      groupRow("44444444-4444-4444-8444-444444444441", "2026-01-01T00:00:00.000Z"),
    ]);
    const app = await buildApp();
    const first = await app.inject({ method: "GET", url: "/?limit=2&search=vip" });

    expect(first.statusCode).toBe(200);
    const page = first.json();
    expect(page.data).toHaveLength(2);
    expect(page.data[0]).not.toHaveProperty("memberCount");
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(db.contactGroup.findMany.mock.calls[0][0]).toMatchObject({
      take: 3,
      where: { team: { orgId: ORG }, name: { contains: "vip", mode: "insensitive" } },
    });

    db.contactGroup.findMany.mockResolvedValueOnce([]);
    const second = await app.inject({
      method: "GET",
      url: `/?limit=2&cursor=${page.nextCursor}`,
    });
    expect(second.json()).toEqual({ data: [], nextCursor: null });
    expect(db.contactGroup.findMany.mock.calls[1][0].where.OR).toEqual([
      { createdAt: { lt: new Date("2026-01-02T00:00:00.000Z") } },
      {
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
        id: { lt: "44444444-4444-4444-8444-444444444442" },
      },
    ]);
  });

  test("a forged cursor is a 400", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/${G1}/contacts?cursor=garbage` });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("cursor_invalid");
  });
});

describe("group writes", () => {
  test("create answers 201 with the presented group", async () => {
    (createContactGroup as Mock).mockResolvedValue(groupRow(G1));
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/",
      payload: { name: "VIPs", teamId: TEAM },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: G1, memberCount: 0 });
    expect(res.payload).not.toContain("campaignParticipants");
    expect((createContactGroup as Mock).mock.calls[0]).toEqual([
      { name: "VIPs", teamId: TEAM, type: "NORMAL" },
      ORG,
    ]);
  });

  test("another org's team is a 404 team_not_found", async () => {
    (createContactGroup as Mock).mockRejectedValue(new ContactGroupNotFoundError("Team not found"));
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/",
      payload: { name: "x", teamId: TEAM },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("team_not_found");
  });

  test("a duplicate name is a 409", async () => {
    (createContactGroup as Mock).mockRejectedValue(
      Object.assign(new Error("unique"), { code: "P2002", meta: { modelName: "ContactGroup" } }),
    );
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/",
      payload: { name: "x", teamId: TEAM },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("contact_group_already_exists");
  });

  test("patch clears tags with null and answers the group", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "PATCH", url: `/${G1}`, payload: { tags: null } });
    expect(res.statusCode).toBe(200);
    const { where, data } = db.contactGroup.updateMany.mock.calls[0][0];
    expect(where).toEqual({ id: G1, team: { orgId: ORG } });
    expect(data.tags).not.toBeNull();
    expect(data.tags).toBeDefined();
  });

  test("delete answers 204 with no body", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: `/${G1}` });
    expect(res.statusCode).toBe(204);
    expect(res.payload).toBe("");
  });
});
