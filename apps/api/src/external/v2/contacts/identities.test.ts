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
    count: vi.fn(),
  });
  return {
    contact: model(),
    contactIdentity: model(),
    contactLabel: model(),
    contactCustomField: model(),
    $transaction: vi.fn(),
  };
});
vi.mock("../../../utils/prisma.js", () => ({ default: db }));

vi.mock("../../../modules/contact/identity/identity.service.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../modules/contact/identity/identity.service.js")>();
  return {
    ...actual,
    attachIdentity: vi.fn(),
    findContactIdByIdentity: vi.fn(),
    listContactIdentities: vi.fn(),
    removeIdentity: vi.fn(),
    ensurePrimary: vi.fn(),
  };
});
vi.mock("../../../modules/contact/merge/merge.service.js", () => ({ mergeContacts: vi.fn() }));
vi.mock("../../../modules/contact/merge/suggestions.service.js", () => ({
  suggestMerge: vi.fn(),
}));
vi.mock("../../../modules/contact/contact.service.js", () => ({
  createContact: vi.fn(),
  createMultipleContacts: vi.fn(),
  deleteContactById: vi.fn(),
}));
vi.mock("../../../modules/integrations/events/emitIntegrationEvent.js", () => ({
  emitIntegrationEvent: vi.fn(),
}));

import {
  attachIdentity,
  findContactIdByIdentity,
  listContactIdentities,
  removeIdentity,
  ensurePrimary,
} from "../../../modules/contact/identity/identity.service.js";
import { mergeContacts } from "../../../modules/contact/merge/merge.service.js";
import { suggestMerge } from "../../../modules/contact/merge/suggestions.service.js";
import { emitIntegrationEvent } from "../../../modules/integrations/events/emitIntegrationEvent.js";
import { HttpError } from "../../../utils/http.js";
import { externalErrorHandler } from "../../shared/errors.js";
import { externalContactRoutes } from "./contacts.route.js";

type Mock = ReturnType<typeof vi.fn>;
const m = (fn: unknown) => fn as Mock;

const ORG = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const IDENTITY = "44444444-4444-4444-8444-444444444444";
const CHANNEL = "55555555-5555-4555-8555-555555555555";
const FIELD = "66666666-6666-4666-8666-666666666666";

function identity(overrides: Record<string, unknown> = {}) {
  return {
    id: IDENTITY,
    kind: "PHONE",
    scope: "",
    value: "919876543210",
    source: "IMPORT",
    verified: false,
    isPrimary: true,
    username: null,
    displayName: null,
    channelId: null,
    lastSeenAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

/** `phone` becomes the contact's primary PHONE identity, as it is stored now. */
function contact(overrides: Record<string, unknown> = {}) {
  const { phone = "919876543210", ...rest } = overrides;
  return {
    id: ID,
    name: "Ann",
    whatsappUserName: null,
    external_id: null,
    source: "external",
    consent: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ContactLabelMap: [],
    customFields: [],
    identities: phone ? [identity({ value: phone })] : [],
    ...rest,
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

const body = (res: { payload: string }) => JSON.parse(res.payload);

beforeEach(() => {
  vi.clearAllMocks();
  db.contact.findFirst.mockResolvedValue(null);
  db.contactIdentity.findFirst.mockResolvedValue(null);
  m(findContactIdByIdentity).mockResolvedValue(null);
  db.contactCustomField.findMany.mockResolvedValue([]);
  db.contactLabel.findMany.mockResolvedValue([]);
});

describe("GET /lookup", () => {
  test("resolves by identity first, scoped to the org, and returns identities", async () => {
    m(findContactIdByIdentity).mockResolvedValue(ID);
    db.contact.findFirst.mockResolvedValue(contact());
    const app = await buildApp();
    const res = await app.inject({ url: "/lookup?kind=EMAIL&value=Ann%40Example.com" });
    expect(res.statusCode).toBe(200);
    expect(findContactIdByIdentity).toHaveBeenCalledWith(ORG, "EMAIL", "ann@example.com");
    expect(db.contact.findFirst.mock.calls[0]![0].where).toEqual({ id: ID, orgId: ORG });
    expect(body(res).identities).toEqual([
      {
        id: IDENTITY,
        kind: "PHONE",
        value: "919876543210",
        channelId: null,
        integration: null,
        source: "IMPORT",
        verified: false,
        primary: true,
        username: null,
        displayName: null,
        lastSeenAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  test("a BSUID is found by its identity and shown as the contact's businessScopedUserId", async () => {
    m(findContactIdByIdentity).mockResolvedValue(ID);
    db.contact.findFirst.mockResolvedValue(
      contact({
        identities: [identity(), identity({ kind: "WA_BSUID", value: "US.1349120865530274" })],
      }),
    );
    const app = await buildApp();
    const res = await app.inject({ url: "/lookup?kind=WA_BSUID&value=US.1349120865530274" });
    expect(res.statusCode).toBe(200);
    expect(findContactIdByIdentity).toHaveBeenCalledWith(ORG, "WA_BSUID", "US.1349120865530274");
    expect(body(res)).toMatchObject({
      phone: "919876543210",
      businessScopedUserId: "US.1349120865530274",
    });
  });

  test("a phone or BSUID nobody holds is a 404, with no column to look in", async () => {
    const app = await buildApp();
    const res = await app.inject({ url: "/lookup?kind=WA_BSUID&value=US.1349120865530274" });
    expect(res.statusCode).toBe(404);
    expect(db.contact.findFirst).not.toHaveBeenCalled();
  });

  test("channelId narrows a per-channel id to that channel (or one recorded unscoped)", async () => {
    db.contactIdentity.findFirst.mockResolvedValue({ contactId: ID });
    db.contact.findFirst.mockResolvedValue(contact());
    const app = await buildApp();
    const res = await app.inject({
      url: `/lookup?kind=IG_SCOPED&value=178414&channelId=${CHANNEL}`,
    });
    expect(res.statusCode).toBe(200);
    expect(db.contactIdentity.findFirst.mock.calls[0]![0].where).toEqual({
      orgId: ORG,
      kind: "IG_SCOPED",
      value: "178414",
      scope: { in: [CHANNEL, ""] },
    });
    expect(findContactIdByIdentity).not.toHaveBeenCalled();
  });

  test("an EXTERNAL id from a named integration has no legacy column to fall back to", async () => {
    const app = await buildApp();
    const res = await app.inject({ url: "/lookup?kind=EXTERNAL&value=cus_9&integration=shopify" });
    expect(res.statusCode).toBe(404);
    expect(body(res).error.code).toBe("contact_not_found");
    expect(db.contactIdentity.findFirst.mock.calls[0]![0].where.scope).toBe("shopify");
    expect(db.contact.findFirst).not.toHaveBeenCalled();
  });

  test("the old ?phone= form still works", async () => {
    m(findContactIdByIdentity).mockResolvedValue(ID);
    db.contact.findFirst.mockResolvedValue(contact());
    const app = await buildApp();
    const res = await app.inject({ url: "/lookup?phone=%2B919876543210" });
    expect(res.statusCode).toBe(200);
    expect(findContactIdByIdentity).toHaveBeenCalledWith(ORG, "PHONE", "919876543210");
  });

  test.each([
    ["nothing", ""],
    ["kind without value", "?kind=EMAIL"],
    ["phone and kind", "?phone=919876543210&kind=EMAIL&value=a%40b.co"],
    ["an unknown kind", "?kind=TWITTER&value=x"],
  ])("%s is 400", async (_, qs) => {
    const app = await buildApp();
    const res = await app.inject({ url: `/lookup${qs}` });
    expect(res.statusCode).toBe(400);
    expect(body(res).error.code).toBe("validation_failed");
  });

  test("a PHONE value that is not a phone is 400 phone_invalid", async () => {
    const app = await buildApp();
    const res = await app.inject({ url: "/lookup?kind=PHONE&value=US.1349120865530274" });
    expect(res.statusCode).toBe(400);
    expect(body(res).error.code).toBe("phone_invalid");
  });
});

describe("GET /:contactId/identities", () => {
  test("lists the org's contact's identities", async () => {
    db.contact.findFirst.mockResolvedValue(contact());
    m(listContactIdentities).mockResolvedValue([
      identity({ kind: "FB_PSID", value: "2468", scope: CHANNEL, verified: true, isPrimary: true }),
      identity({ kind: "EXTERNAL", value: "cus_9", scope: "shopify", isPrimary: false }),
    ]);
    const app = await buildApp();
    const res = await app.inject({ url: `/${ID}/identities` });
    expect(res.statusCode).toBe(200);
    expect(db.contact.findFirst.mock.calls[0]![0].where).toEqual({ id: ID, orgId: ORG });
    const [psid, external] = body(res).data;
    expect(psid).toMatchObject({ kind: "FB_PSID", channelId: CHANNEL, integration: null });
    expect(external).toMatchObject({ kind: "EXTERNAL", channelId: null, integration: "shopify" });
    expect(psid).not.toHaveProperty("scope");
  });

  test("another org's contact is a 404", async () => {
    const app = await buildApp();
    const res = await app.inject({ url: `/${ID}/identities` });
    expect(res.statusCode).toBe(404);
    expect(body(res).error.code).toBe("contact_not_found");
    expect(listContactIdentities).not.toHaveBeenCalled();
  });
});

describe("POST /:contactId/identities", () => {
  test("adds a phone as IMPORT, unverified, keeping the current primary", async () => {
    db.contact.findFirst.mockResolvedValue(contact());
    m(attachIdentity).mockResolvedValue({ status: "attached", identityId: IDENTITY });
    db.contactIdentity.findFirst.mockResolvedValue(
      identity({ value: "919812345678", isPrimary: false }),
    );
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${ID}/identities`,
      payload: { kind: "PHONE", value: "+91 98123-45678" },
    });
    expect(res.statusCode).toBe(201);
    expect(body(res)).toMatchObject({ value: "919812345678", primary: false });
    expect(m(attachIdentity).mock.calls.map((c) => c[2].value)).toEqual(["919812345678"]);
    expect(m(attachIdentity).mock.calls[0]![2]).toMatchObject({
      kind: "PHONE",
      source: "IMPORT",
      verified: false,
    });
    // Promotes it only when the contact has no primary phone.
    expect(ensurePrimary).toHaveBeenCalledWith(ID, "PHONE");
    // The primary did not move, so the CRMs hear nothing.
    expect(emitIntegrationEvent).not.toHaveBeenCalled();
  });

  test("an id the contact already has is a 200", async () => {
    db.contact.findFirst.mockResolvedValue(contact());
    m(attachIdentity).mockResolvedValue({ status: "updated", identityId: IDENTITY });
    db.contactIdentity.findFirst.mockResolvedValue(identity());
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${ID}/identities`,
      payload: { kind: "PHONE", value: "919876543210" },
    });
    expect(res.statusCode).toBe(200);
  });

  test("EXTERNAL needs an integration, and is recorded verified under it", async () => {
    db.contact.findFirst.mockResolvedValue(contact());
    const app = await buildApp();
    const missing = await app.inject({
      method: "POST",
      url: `/${ID}/identities`,
      payload: { kind: "EXTERNAL", value: "cus_9" },
    });
    expect(missing.statusCode).toBe(400);

    m(attachIdentity).mockResolvedValue({ status: "attached", identityId: IDENTITY });
    db.contactIdentity.findFirst.mockResolvedValue(
      identity({ kind: "EXTERNAL", value: "cus_9", scope: "shopify", verified: true }),
    );
    const res = await app.inject({
      method: "POST",
      url: `/${ID}/identities`,
      payload: { kind: "EXTERNAL", value: "cus_9", integration: "shopify" },
    });
    expect(res.statusCode).toBe(201);
    expect(body(res)).toMatchObject({ integration: "shopify", verified: true });
    expect(m(attachIdentity).mock.calls.at(-1)![2]).toMatchObject({
      kind: "EXTERNAL",
      integration: "shopify",
      source: "IMPORT",
      verified: true,
    });
    expect(ensurePrimary).not.toHaveBeenCalled();
  });

  test("platform ids cannot be added", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${ID}/identities`,
      payload: { kind: "WA_BSUID", value: "US.1349120865530274" },
    });
    expect(res.statusCode).toBe(400);
  });

  test("held by another contact is 409 identity_in_use naming it, and nothing moves", async () => {
    db.contact.findFirst.mockResolvedValue(contact());
    m(findContactIdByIdentity).mockResolvedValue(OTHER);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${ID}/identities`,
      payload: { kind: "EMAIL", value: "Bob@Example.com" },
    });
    expect(res.statusCode).toBe(409);
    expect(body(res).error).toMatchObject({
      code: "identity_in_use",
      details: { contactId: OTHER },
    });
    expect(attachIdentity).not.toHaveBeenCalled();
    expect(suggestMerge).toHaveBeenCalledWith(ORG, ID, OTHER, {
      reason: "SAME_EMAIL",
      detail: "bob@example.com",
    });
  });

  test("held only in another contact's externalId column is a 409 too", async () => {
    db.contact.findFirst.mockResolvedValueOnce(contact()).mockResolvedValueOnce({ id: OTHER });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${ID}/identities`,
      payload: { kind: "EXTERNAL", value: "crm-9", integration: "external_id" },
    });
    expect(res.statusCode).toBe(409);
    expect(db.contact.findFirst.mock.calls[1]![0].where).toEqual({
      external_id: "crm-9",
      orgId: ORG,
      id: { not: ID },
    });
  });

  test("a primary phone change tells the CRMs", async () => {
    db.contact.findFirst
      .mockResolvedValueOnce(contact({ phone: null }))
      .mockResolvedValueOnce(contact({ phone: "919812345678" }));
    m(attachIdentity).mockResolvedValue({ status: "attached", identityId: IDENTITY });
    db.contactIdentity.findFirst.mockResolvedValue(identity({ value: "919812345678" }));
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${ID}/identities`,
      payload: { kind: "PHONE", value: "919812345678" },
    });
    expect(res.statusCode).toBe(201);
    expect(emitIntegrationEvent).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        type: "contact.updated",
        changed: ["details"],
        contact: expect.objectContaining({ id: ID, phone: "919812345678" }),
      }),
    );
    expect(ensurePrimary).toHaveBeenCalledWith(ID, "PHONE");
  });
});

describe("DELETE /:contactId/identities/:identityId", () => {
  test("removes it", async () => {
    db.contact.findFirst.mockResolvedValue(contact());
    db.contactIdentity.findFirst.mockResolvedValue({ kind: "EMAIL" });
    m(removeIdentity).mockResolvedValue({ status: "ok" });
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: `/${ID}/identities/${IDENTITY}` });
    expect(res.statusCode).toBe(200);
    expect(body(res)).toEqual({ id: IDENTITY, deleted: true });
    expect(removeIdentity).toHaveBeenCalledWith(ORG, ID, IDENTITY);
  });

  test("the last one is refused with 409 last_identity", async () => {
    db.contact.findFirst.mockResolvedValue(contact());
    db.contactIdentity.findFirst.mockResolvedValue({ kind: "PHONE" });
    m(removeIdentity).mockResolvedValue({ status: "last_identity" });
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: `/${ID}/identities/${IDENTITY}` });
    expect(res.statusCode).toBe(409);
    expect(body(res).error.code).toBe("last_identity");
  });

  test("an identity of another contact is 404 identity_not_found", async () => {
    db.contact.findFirst.mockResolvedValue(contact());
    m(removeIdentity).mockResolvedValue({ status: "not_found" });
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: `/${ID}/identities/${IDENTITY}` });
    expect(res.statusCode).toBe(404);
    expect(body(res).error.code).toBe("identity_not_found");
  });
});

describe("POST /:contactId/merge", () => {
  test("merges the source into the path's contact as an API merge, custom fields by slug", async () => {
    db.contact.findMany.mockResolvedValue([{ id: ID }, { id: OTHER }]);
    db.contactCustomField.findMany.mockResolvedValue([{ id: FIELD, slug: "tier" }]);
    m(mergeContacts).mockResolvedValue({ target: { id: ID }, mergeId: "m1" });
    db.contact.findFirst.mockResolvedValue(contact());
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${ID}/merge`,
      payload: {
        sourceContactId: OTHER,
        fieldChoices: { name: "source", customFields: { tier: "source" } },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(body(res)).toMatchObject({ id: ID, identities: [{ id: IDENTITY }] });
    expect(db.contact.findMany.mock.calls[0]![0].where).toEqual({
      orgId: ORG,
      id: { in: [ID, OTHER] },
    });
    expect(mergeContacts).toHaveBeenCalledWith(
      ORG,
      OTHER,
      ID,
      { userId: null, reason: "API" },
      { name: "source", [`custom:${FIELD}`]: "source" },
    );
  });

  test("into itself is 400", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${ID}/merge`,
      payload: { sourceContactId: ID },
    });
    expect(res.statusCode).toBe(400);
    expect(mergeContacts).not.toHaveBeenCalled();
  });

  test("a source that is not the org's (or already merged) is 404 naming it", async () => {
    db.contact.findMany.mockResolvedValue([{ id: ID }]);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${ID}/merge`,
      payload: { sourceContactId: OTHER },
    });
    expect(res.statusCode).toBe(404);
    expect(body(res).error).toMatchObject({
      code: "contact_not_found",
      details: { contactId: OTHER },
    });
    expect(mergeContacts).not.toHaveBeenCalled();
  });

  test("losing a race inside the merge is still a 404 envelope", async () => {
    db.contact.findMany.mockResolvedValue([{ id: ID }, { id: OTHER }]);
    m(mergeContacts).mockRejectedValue(new HttpError("Contact not found", 404));
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${ID}/merge`,
      payload: { sourceContactId: OTHER },
    });
    expect(res.statusCode).toBe(404);
    expect(body(res).error.code).toBe("contact_not_found");
  });

  test("an unknown field choice or custom field slug is 400", async () => {
    db.contact.findMany.mockResolvedValue([{ id: ID }, { id: OTHER }]);
    const app = await buildApp();
    for (const fieldChoices of [{ phone: "source" }, { customFields: { nope: "source" } }]) {
      const res = await app.inject({
        method: "POST",
        url: `/${ID}/merge`,
        payload: { sourceContactId: OTHER, fieldChoices },
      });
      expect(res.statusCode).toBe(400);
    }
    expect(mergeContacts).not.toHaveBeenCalled();
  });
});

test("identity reads need contacts.read, identity writes contacts.manage, merge contacts.merge", async () => {
  const seen: Record<string, unknown> = {};
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook("onRequest", async (request, reply) => {
    seen[`${request.method} ${request.routeOptions.url}`] = request.routeOptions.config?.permission;
    return reply.code(204).send();
  });
  await app.register(externalContactRoutes);
  await app.ready();
  await app.inject({ url: "/lookup" });
  await app.inject({ url: `/${ID}/identities` });
  await app.inject({ method: "POST", url: `/${ID}/identities` });
  await app.inject({ method: "DELETE", url: `/${ID}/identities/${IDENTITY}` });
  await app.inject({ method: "POST", url: `/${ID}/merge` });
  expect(seen).toEqual({
    "GET /lookup": "contacts.read",
    "GET /:contactId/identities": "contacts.read",
    "POST /:contactId/identities": "contacts.manage",
    "DELETE /:contactId/identities/:identityId": "contacts.manage",
    "POST /:contactId/merge": "contacts.merge",
  });
});
