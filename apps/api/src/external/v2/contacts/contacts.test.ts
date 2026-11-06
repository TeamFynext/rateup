import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/rateLimit.js", () => ({ rateLimit: () => async () => {} }));

const db = vi.hoisted(() => {
  const model = () => ({
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  });
  const client = {
    contact: model(),
    contactLabel: model(),
    contactCustomField: model(),
    contactLabelMap: model(),
    contactCustomFieldValue: model(),
    contactIdentity: model(),
    $transaction: vi.fn(),
  };
  return client;
});
vi.mock("../../../utils/prisma.js", () => ({ default: db }));

vi.mock("../../../modules/contact/contact.service.js", () => ({
  createContact: vi.fn(),
  createMultipleContacts: vi.fn(),
  deleteContactById: vi.fn(),
}));
vi.mock("../../../modules/integrations/events/emitIntegrationEvent.js", () => ({
  emitIntegrationEvent: vi.fn(),
}));

import {
  createContact,
  createMultipleContacts,
  deleteContactById,
} from "../../../modules/contact/contact.service.js";
import { emitIntegrationEvent } from "../../../modules/integrations/events/emitIntegrationEvent.js";
import { externalErrorHandler } from "../../shared/errors.js";
import { externalContactRoutes } from "./contacts.route.js";

type Mock = ReturnType<typeof vi.fn>;

const ORG = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";
const LABEL = "33333333-3333-4333-8333-333333333333";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    name: "Ann",
    phone: "919876543210",
    email: "ann@example.com",
    external_id: "crm-1",
    source: "external",
    consent: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ContactLabelMap: [{ label: { id: LABEL, name: "VIP" } }],
    customFields: [{ value: "Gold", field: { slug: "tier" } }],
    identities: [],
    ...overrides,
  };
}

async function buildApp() {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(externalErrorHandler);
  app.addHook("preHandler", async (request) => {
    (request as { user?: unknown }).user = { orgId: ORG, role: "SUPER_ADMIN" };
  });
  await app.register(externalContactRoutes);
  await app.ready();
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  db.contactCustomField.findMany.mockResolvedValue([]);
  db.contactLabel.findMany.mockResolvedValue([]);
});

describe("the response schema is a boundary", () => {
  test("inbox columns on Contact do not reach the partner", async () => {
    db.contact.findFirst.mockResolvedValue(
      row({
        orgId: ORG,
        chatbotId: "bot-9",
        lifecycleId: "lc-1",
        lastReceivedMetadata: { secret: true },
        lastMessageBody: { text: "private" },
        waMessageAssignStatus: "OPEN",
        metaAgentThreadOwner: "AGENT",
        isSpam: false,
        notes: "internal note",
      }),
    );

    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/${ID}` });

    expect(res.statusCode).toBe(200);
    for (const leaked of [
      "orgId",
      "chatbotId",
      "lifecycleId",
      "lastReceivedMetadata",
      "lastMessageBody",
      "waMessageAssignStatus",
      "metaAgentThreadOwner",
      "isSpam",
      "internal note",
      "external_id",
      "ContactLabelMap",
    ]) {
      expect(res.payload).not.toContain(leaked);
    }
    expect(JSON.parse(res.payload)).toEqual({
      id: ID,
      name: "Ann",
      phone: "919876543210",
      businessScopedUserId: null,
      whatsappUsername: null,
      email: "ann@example.com",
      externalId: "crm-1",
      source: "external",
      consent: true,
      labels: [{ id: LABEL, name: "VIP" }],
      customFields: { tier: "Gold" },
      createdAt: "2026-01-01T00:00:00.000Z",
      identities: [],
    });
  });

  test("every route declares what it returns", async () => {
    const missing: string[] = [];
    const probe = Fastify();
    probe.setValidatorCompiler(validatorCompiler);
    probe.setSerializerCompiler(serializerCompiler);
    probe.addHook("onRoute", (opts) => {
      const response = (opts.schema?.response ?? {}) as Record<string, unknown>;
      if (!response["200"] && !response["201"]) missing.push(`${opts.method} ${opts.url}`);
    });
    await probe.register(externalContactRoutes);
    await probe.ready();
    expect(missing).toEqual([]);
  });
});

test("reads need contacts.read, writes contacts.manage", async () => {
  const seen: Record<string, unknown> = {};
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook("onRequest", async (request, reply) => {
    seen[request.method] = request.routeOptions.config?.permission;
    return reply.code(204).send();
  });
  await app.register(externalContactRoutes);
  await app.ready();
  await app.inject({ method: "GET", url: "/" });
  await app.inject({ method: "POST", url: "/bulk" });
  await app.inject({ method: "DELETE", url: `/${ID}` });
  expect(seen).toEqual({
    GET: "contacts.read",
    POST: "contacts.manage",
    DELETE: "contacts.manage",
  });
});

describe("org scoping", () => {
  test("a contact from another org is a 404 envelope", async () => {
    db.contact.findFirst.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/${ID}` });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).error).toMatchObject({ code: "contact_not_found" });
    expect(db.contact.findFirst.mock.calls[0]![0].where).toMatchObject({ id: ID, orgId: ORG });
  });

  test("PATCH and DELETE refuse another org's contact before writing", async () => {
    db.contact.findFirst.mockResolvedValue(null);
    const app = await buildApp();

    const patch = await app.inject({ method: "PATCH", url: `/${ID}`, payload: { name: "X" } });
    const del = await app.inject({ method: "DELETE", url: `/${ID}` });

    expect(patch.statusCode).toBe(404);
    expect(del.statusCode).toBe(404);
    expect(db.contact.update).not.toHaveBeenCalled();
    expect(deleteContactById).not.toHaveBeenCalled();
  });

  test("a label id from another org is refused, not attached", async () => {
    db.contactLabel.findMany.mockResolvedValue([]);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/",
      payload: { phone: "+919876543210", labels: [LABEL] },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toMatchObject({
      code: "validation_failed",
      details: { issues: [{ path: "/labels/0", message: "Unknown label" }] },
    });
    expect(db.contactLabel.findMany.mock.calls[0]![0].where).toMatchObject({ orgId: ORG });
    expect(createContact).not.toHaveBeenCalled();
  });
});

describe("validation", () => {
  test("a bad phone is 400 validation_failed", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/", payload: { phone: "12" } });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error.code).toBe("validation_failed");
  });

  test("a non-uuid id is 400, not a database error", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/not-a-uuid" });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error.code).toBe("validation_failed");
    expect(db.contact.findFirst).not.toHaveBeenCalled();
  });

  test("an empty PATCH is refused", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "PATCH", url: `/${ID}`, payload: {} });
    expect(res.statusCode).toBe(400);
  });

  test("bulk is capped at 1000", async () => {
    const app = await buildApp();
    const contacts = Array.from({ length: 1001 }, () => ({ phone: "+919876543210" }));
    const res = await app.inject({ method: "POST", url: "/bulk", payload: { contacts } });
    expect(res.statusCode).toBe(400);
    expect(createMultipleContacts).not.toHaveBeenCalled();
  });
});

describe("listing", () => {
  test("fetches limit + 1 and hands back a cursor only when there is more", async () => {
    const rows = Array.from({ length: 3 }, (_, i) =>
      row({
        id: `0000000${i}-0000-4000-8000-000000000000`,
        createdAt: new Date(2026, 0, 3 - i),
      }),
    );
    db.contact.findMany.mockResolvedValueOnce(rows);
    const app = await buildApp();

    const first = await app.inject({ method: "GET", url: "/?limit=2" });
    const body = JSON.parse(first.payload);
    expect(first.statusCode).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.nextCursor).toEqual(expect.any(String));
    expect(db.contact.findMany.mock.calls[0]![0]).toMatchObject({
      take: 3,
      where: { orgId: ORG },
    });

    db.contact.findMany.mockResolvedValueOnce(rows.slice(2));
    const second = await app.inject({
      method: "GET",
      url: `/?limit=2&cursor=${body.nextCursor}`,
    });
    expect(JSON.parse(second.payload).nextCursor).toBeNull();
    // The cursor narrows the second query.
    expect(JSON.stringify(db.contact.findMany.mock.calls[1]![0].where)).toContain('"lt"');
  });

  test("a forged cursor is 400 cursor_invalid", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/?cursor=bm9wZQ" });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error.code).toBe("cursor_invalid");
  });

  test("search matches phone digits; filters narrow by label and group", async () => {
    db.contact.findMany.mockResolvedValue([]);
    const app = await buildApp();
    await app.inject({
      method: "GET",
      url: `/?search=${encodeURIComponent("+91 98765")}&labelId=${LABEL}&contactGroupId=${ID}`,
    });
    const where = JSON.stringify(db.contact.findMany.mock.calls[0]![0].where);
    expect(where).toContain('"phone":{"contains":"9198765"}');
    expect(where).toContain(`"labelId":"${LABEL}"`);
    expect(where).toContain(`"contactGroupId":"${ID}"`);
  });

  test("lookup by phone is scoped to the org and tries both stored spellings", async () => {
    db.contact.findFirst.mockResolvedValue(row());
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/lookup?phone=%2B919876543210" });
    expect(res.statusCode).toBe(200);
    expect(db.contact.findFirst.mock.calls[0]![0].where).toEqual({
      phone: { in: ["919876543210", "+919876543210"] },
      orgId: ORG,
    });
  });
});

describe("phone format: digits with the country code, no +", () => {
  test.each([
    ["digits with the country code", "919876543210"],
    ["a leading + with spaces and a dash", "+91 98765-43210"],
  ])("lookup takes %s", async (_, phone) => {
    db.contact.findFirst.mockResolvedValue(row());
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/lookup?phone=${encodeURIComponent(phone)}`,
    });
    expect(res.statusCode).toBe(200);
    // Both spellings, so a row stored as "+91…" is still found.
    expect(db.contact.findFirst.mock.calls[0]![0].where.phone).toEqual({
      in: ["919876543210", "+919876543210"],
    });
  });

  test("create finds a contact stored with a leading + and answers 409, not a duplicate", async () => {
    db.contact.findFirst.mockResolvedValueOnce({ id: ID, phone: "+919876543210" });
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/", payload: { phone: "919876543210" } });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.payload).error.details).toMatchObject({ contactId: ID, field: "phone" });
    expect(createContact).not.toHaveBeenCalled();
  });

  test("create takes a JSON number", async () => {
    db.contact.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(row());
    (createContact as Mock).mockResolvedValue({ id: ID });
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/", payload: { phone: 919876543210 } });
    expect(res.statusCode).toBe(201);
    expect((createContact as Mock).mock.calls[0]![0].phone).toBe("919876543210");
  });

  test("an invalid number is a 400", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/", payload: { phone: "12345" } });
    expect(res.statusCode).toBe(400);
    expect(createContact).not.toHaveBeenCalled();
  });

  test("a contact stored with a leading + is returned as digits", async () => {
    db.contact.findFirst.mockResolvedValue(row({ phone: "+919876543210" }));
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/${ID}` });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).phone).toBe("919876543210");
  });

  test("so is every contact in a list", async () => {
    db.contact.findMany.mockResolvedValue([
      row({ phone: "+91 98765 43210" }),
      row({ phone: null }),
    ]);
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.map((c: { phone: string | null }) => c.phone)).toEqual([
      "919876543210",
      null,
    ]);
  });
});

describe("create", () => {
  test("resolves custom field slugs and stamps source external", async () => {
    db.contactCustomField.findMany.mockResolvedValue([{ id: "field-1", slug: "tier" }]);
    db.contactLabel.findMany.mockResolvedValue([{ id: LABEL }]);
    db.contact.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(row());
    (createContact as Mock).mockResolvedValue({ id: ID });

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/",
      payload: {
        phone: "+919876543210",
        name: "Ann",
        externalId: "crm-1",
        customFields: { tier: "Gold" },
        labels: [LABEL],
      },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).id).toBe(ID);
    expect((createContact as Mock).mock.calls[0]![0]).toMatchObject({
      orgId: ORG,
      phone: "919876543210",
      source: "external",
      external_id: "crm-1",
      labels: [LABEL],
      customFields: [{ id: "field-1", value: "Gold" }],
    });
  });

  test("an unknown custom field slug is 400 with the slug named", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/",
      payload: { phone: "+919876543210", customFields: { nope: "x" } },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error.details.issues).toEqual([
      { path: "/customFields/nope", message: "Unknown custom field" },
    ]);
  });

  test("a taken phone is 409 contact_already_exists with the existing id", async () => {
    db.contact.findFirst.mockResolvedValue({ id: ID, phone: "919876543210" });
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/", payload: { phone: "+919876543210" } });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.payload).error).toMatchObject({
      code: "contact_already_exists",
      details: { contactId: ID, field: "phone" },
    });
    expect(createContact).not.toHaveBeenCalled();
  });

  test("losing the race to the unique index is still a 409", async () => {
    db.contact.findFirst.mockResolvedValue(null);
    (createContact as Mock).mockRejectedValue(
      Object.assign(new Error("Unique constraint"), {
        code: "P2002",
        meta: { modelName: "Contact" },
      }),
    );
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/", payload: { phone: "+919876543210" } });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.payload).error.code).toBe("contact_already_exists");
  });
});

describe("bulk create", () => {
  test("creates the new, skips existing and in-request duplicates, in order", async () => {
    db.contact.findMany
      // existing in the org
      .mockResolvedValueOnce([{ phone: "14155552671", external_id: null }])
      // the created rows, read back
      .mockResolvedValueOnce([row({ id: "a", phone: "919876543210" })]);
    (createMultipleContacts as Mock).mockResolvedValue([{ id: "a", phone: "919876543210" }]);

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/bulk",
      payload: {
        contacts: [
          { phone: "+919876543210", name: "New" },
          { phone: "+14155552671", name: "Existing" },
          { phone: "919876543210", name: "Repeat" },
          { phone: "+447911123456", name: "Lost a race" },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.created.map((c: { id: string }) => c.id)).toEqual(["a"]);
    expect(body.skipped).toEqual([
      { index: 1, phone: "14155552671", reason: "already_exists" },
      { index: 2, phone: "919876543210", reason: "duplicate_in_request" },
      { index: 3, phone: "447911123456", reason: "already_exists" },
    ]);
    const sent = (createMultipleContacts as Mock).mock.calls[0]!;
    expect(sent[1]).toBe(ORG);
    expect(sent[0].map((c: { phone: string }) => c.phone)).toEqual([
      "919876543210",
      "447911123456",
    ]);
    expect(sent[0].every((c: { source: string }) => c.source === "external")).toBe(true);
  });

  test("all duplicates is a 200 with everything skipped, not a 500", async () => {
    db.contact.findMany.mockResolvedValueOnce([{ phone: "919876543210", external_id: null }]);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/bulk",
      payload: { contacts: [{ phone: "+919876543210" }] },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({
      created: [],
      skipped: [{ index: 0, phone: "919876543210", reason: "already_exists" }],
    });
    expect(createMultipleContacts).not.toHaveBeenCalled();
  });

  test("a bad reference anywhere refuses the whole batch with its index", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/bulk",
      payload: {
        contacts: [{ phone: "+919876543210" }, { phone: "+14155552671", customFields: { x: "1" } }],
      },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error.details.issues[0].path).toBe("/contacts/1/customFields/x");
    expect(createMultipleContacts).not.toHaveBeenCalled();
  });
});

describe("update and delete", () => {
  test("PATCH merges custom fields, replaces labels and emits contact.updated", async () => {
    db.contact.findFirst.mockResolvedValue(row());
    db.contactCustomField.findMany.mockResolvedValue([
      { id: "field-1", slug: "tier" },
      { id: "field-2", slug: "city" },
    ]);
    db.contactLabel.findMany.mockResolvedValue([{ id: LABEL }]);
    db.contact.update.mockResolvedValue({ id: ID, orgId: ORG });

    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/${ID}`,
      payload: { name: "Ann B", customFields: { tier: "Silver", city: null }, labels: [LABEL] },
    });

    expect(res.statusCode).toBe(200);
    expect(db.contact.update.mock.calls[0]![0]).toMatchObject({
      where: { id: ID, orgId: ORG },
      data: { name: "Ann B" },
    });
    expect(db.contactCustomFieldValue.deleteMany).toHaveBeenCalledWith({
      where: { contactId: ID, fieldId: { in: ["field-1", "field-2"] } },
    });
    expect(db.contactCustomFieldValue.createMany).toHaveBeenCalledWith({
      data: [{ contactId: ID, fieldId: "field-1", value: "Silver" }],
    });
    expect(db.contactLabelMap.deleteMany).toHaveBeenCalledWith({ where: { contactId: ID } });
    expect(emitIntegrationEvent).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({ type: "contact.updated" }),
    );
  });

  test("DELETE answers { id, deleted: true }", async () => {
    db.contact.findFirst.mockResolvedValue(row());
    (deleteContactById as Mock).mockResolvedValue({});
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: `/${ID}` });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ id: ID, deleted: true });
    expect(deleteContactById).toHaveBeenCalledWith(ID, ORG);
  });
});
