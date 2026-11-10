import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test";

// Hook URLs are resolved before every call (src/utils/ssrf.ts); keep that off the network.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async (host: string) => [
    { address: host.includes("internal") ? "10.0.0.5" : "203.0.113.10", family: 4 },
  ]),
}));

import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../../utils/prisma.js", () => ({
  default: {
    integration: { findUnique: vi.fn() },
    org: { findUnique: vi.fn() },
    contact: { findMany: vi.fn() },
    team: { findFirst: vi.fn() },
  },
}));
vi.mock("../automation.hooks.js", () => ({
  addAutomationHook: vi.fn(),
  removeAutomationHookById: vi.fn(),
}));
vi.mock("../../../contact/contact.service.js", () => ({
  deleteContactById: vi.fn(),
  updateContactById: vi.fn(),
  updateContactLabelsById: vi.fn(),
}));
vi.mock("../../../contact/contact.controller.js", () => ({
  createContactHandler: vi.fn(async (request: any, reply: any) =>
    reply.code(201).send({ id: "c-new", orgId: request.user.orgId, ...request.body }),
  ),
}));
vi.mock("../../../contact/contactGroup/contactGroup.service.js", () => ({
  addNewContactsToGroup: vi.fn(),
  getContactGroupsByOrgId: vi.fn(),
  getContactGroupsByTeamId: vi.fn(),
}));
vi.mock("../../../team/team.service.js", () => ({ getTeamsByOrgId: vi.fn() }));
vi.mock("../../../whatsapp/messageTemplates/wa_templates.controller.js", () => ({
  sendTemplateToUserCore: vi.fn(),
}));
vi.mock("../../../whatsapp/messageTemplates/wa_templates.service.js", () => ({
  getTemplatesByOrgId: vi.fn(),
}));
vi.mock("../../../whatsapp/whatsappSurvey/wasurvey.service.js", () => ({
  sendTextMessage: vi.fn(),
}));
vi.mock("../../external/zapier/zapier.service.js", () => ({
  getSampleDataForTrigger: vi.fn(),
  getLifecyclesByOrgId: vi.fn(),
}));

import prisma from "../../../../utils/prisma.js";
import {
  deleteContactById,
  updateContactById,
  updateContactLabelsById,
} from "../../../contact/contact.service.js";
import { sendTemplateToUserCore } from "../../../whatsapp/messageTemplates/wa_templates.controller.js";
import { getTemplatesByOrgId } from "../../../whatsapp/messageTemplates/wa_templates.service.js";
import { sendTextMessage } from "../../../whatsapp/whatsappSurvey/wasurvey.service.js";
import { addAutomationHook, removeAutomationHookById } from "../automation.hooks.js";
import { generateAutomationKey } from "../automation.keys.js";
import { makeRoutes } from "../../external/make/make.route.js";
import { pabblyRoutes } from "../../external/pabbly/pabbly.route.js";
import { templateBodyVariableCount } from "./automationApi.service.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  integration: { findUnique: Mock };
  org: { findUnique: Mock };
  contact: { findMany: Mock };
  team: { findFirst: Mock };
};
const m = (fn: unknown) => fn as Mock;

const ORG = "7bd6b9b9-02be-448e-9b7d-f72b5d8484d9";
const OTHER_ORG = "11111111-2222-3333-4444-555555555555";
const CONTACT = "0b7c6a52-1f5e-4c6e-9d6a-2f4b8e1c9a10";

let server: FastifyInstance;
let key: string;
let hash: string;
let otherOrgKey: string;
let pabblyKey: string;
let pabblyHash: string;

const call = (method: string, url: string, body?: unknown, auth = key, prefix = "/make") =>
  server.inject({
    method: method as never,
    url: `${prefix}${url}`,
    headers: auth ? { authorization: `Bearer ${auth}` } : {},
    ...(body === undefined ? {} : { payload: body as never }),
  });

beforeAll(async () => {
  ({ key, hash } = await generateAutomationKey("make" as never, ORG));
  ({ key: otherOrgKey } = await generateAutomationKey("make" as never, OTHER_ORG));
  ({ key: pabblyKey, hash: pabblyHash } = await generateAutomationKey("pabbly" as never, ORG));
  server = Fastify();
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);
  await server.register(makeRoutes, { prefix: "/make" });
  await server.register(pabblyRoutes, { prefix: "/pabbly" });
  await server.ready();
});

afterAll(() => server.close());

beforeEach(() => {
  vi.clearAllMocks();
  // Only ORG is connected: Make with `key`'s hash, Pabbly with `pabblyKey`'s.
  db.integration.findUnique.mockImplementation(async ({ where }: any) => {
    const { orgId, name } = where.orgid_integration_name_unique;
    if (orgId !== ORG) return null;
    if (name === "make") return { active: true, credential: { accessToken: hash } };
    if (name === "pabbly") return { active: true, credential: { accessToken: pabblyHash } };
    return null;
  });
  db.org.findUnique.mockResolvedValue({ name: "Acme Clinic" });
});

describe("authentication", () => {
  test("a valid key reaches the route, with the org read from the key", async () => {
    const response = await call("GET", "/me");

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ orgId: ORG, orgName: "Acme Clinic" });
  });

  test.each([
    ["no header", ""],
    ["a key without an org", "plain-zapier-style-key"],
    ["a key for an org that has not connected Make", "OTHER"],
    ["a tampered secret", "TAMPERED"],
  ])("%s is refused with the same 401", async (_label, auth) => {
    const presented =
      auth === "OTHER" ? otherOrgKey : auth === "TAMPERED" ? `${key.slice(0, -2)}xx` : auth;

    const response = await call("GET", "/me", undefined, presented);

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ message: "Not authorized", error: "Invalid API key" });
  });

  test("a switched-off Make integration refuses its key", async () => {
    db.integration.findUnique.mockResolvedValue({
      active: false,
      credential: { accessToken: hash },
    });

    expect((await call("GET", "/me")).statusCode).toBe(401);
  });

  test("the key is never logged", async () => {
    const { log } = await import("../../../../utils/logger.js");

    await call("GET", "/me", undefined, `${key.slice(0, -2)}xx`);

    const logged = JSON.stringify(
      [log.error, log.warn, log.info, log.debug, log.trace].flatMap((fn) => m(fn).mock.calls),
    );
    expect(logged).not.toContain(key.slice(40));
  });
});

describe("one API, one key per platform", () => {
  test("Pabbly's routes take Pabbly's key and store hooks as Pabbly's", async () => {
    m(addAutomationHook).mockResolvedValue({ id: "h-p", subscribed_field: "contact_deleted" });

    const response = await call(
      "POST",
      "/hooks",
      { url: "https://connect.pabbly.com/workflow/sendwebhookdata/abc", event: "contact_deleted" },
      pabblyKey,
      "/pabbly",
    );

    expect(response.statusCode).toBe(201);
    expect(addAutomationHook).toHaveBeenCalledWith("pabbly", ORG, expect.anything());
  });

  test("a Make key is refused on Pabbly's routes, and the other way round", async () => {
    expect((await call("GET", "/me", undefined, key, "/pabbly")).statusCode).toBe(401);
    expect((await call("GET", "/me", undefined, pabblyKey, "/make")).statusCode).toBe(401);
  });

  test("detaching on Pabbly's routes removes only a Pabbly hook", async () => {
    m(removeAutomationHookById).mockResolvedValue(true);

    await call("DELETE", "/hooks/h-1", undefined, pabblyKey, "/pabbly");

    expect(removeAutomationHookById).toHaveBeenCalledWith("pabbly", ORG, "h-1");
  });
});

describe("instant-trigger hooks", () => {
  test("a hook URL on a private address is refused and not stored", async () => {
    const response = await call("POST", "/hooks", {
      url: "https://metadata.internal/latest",
      event: "new_contact_create",
    });

    expect(response.statusCode).toBe(400);
    expect(addAutomationHook).not.toHaveBeenCalled();
  });

  test("a plain-http hook URL is refused by the schema", async () => {
    const response = await call("POST", "/hooks", {
      url: "http://hook.eu1.make.com/abc",
      event: "new_contact_create",
    });

    expect(response.statusCode).toBe(400);
  });

  test("attach stores the hook for the key's org and answers its id", async () => {
    m(addAutomationHook).mockResolvedValue({ id: "h-1", subscribed_field: "new_contact_create" });

    const response = await call("POST", "/hooks", {
      url: "https://hook.eu1.make.com/abc",
      event: "new_contact_create",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ id: "h-1", event: "new_contact_create" });
    expect(addAutomationHook).toHaveBeenCalledWith("make", ORG, {
      hookUrl: "https://hook.eu1.make.com/abc",
      trigger: "new_contact_create",
    });
  });

  test("attach refuses an unknown event and a non-HTTPS URL", async () => {
    expect(
      (await call("POST", "/hooks", { url: "https://hook.make.com/x", event: "nope" })).statusCode,
    ).toBe(400);
    expect(
      (await call("POST", "/hooks", { url: "http://hook.make.com/x", event: "contact_deleted" }))
        .statusCode,
    ).toBe(400);
    expect(addAutomationHook).not.toHaveBeenCalled();
  });

  test("detach removes by id within the key's org, and a missing hook is still a 204", async () => {
    m(removeAutomationHookById).mockResolvedValue(false);

    const response = await call("DELETE", "/hooks/h-1");

    expect(response.statusCode).toBe(204);
    expect(removeAutomationHookById).toHaveBeenCalledWith("make", ORG, "h-1");
  });
});

describe("contacts", () => {
  test("create goes through the normal contact path, in the key's org", async () => {
    const response = await call("POST", "/contacts", {
      name: "Ann",
      phone: "919876543210",
      orgId: OTHER_ORG,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ orgId: ORG, source: "INDIVIDUAL" });
  });

  test("a phone written as people write it is reduced to its digits", async () => {
    const response = await call("POST", "/contacts", { name: "Ann", phone: "+91 98765-43210" });

    expect(response.json()).toMatchObject({ phone: "919876543210" });
  });

  test("create refuses a phone with too few digits", async () => {
    expect((await call("POST", "/contacts", { name: "Ann", phone: "+91 98" })).statusCode).toBe(
      400,
    );
  });

  test("search matches the exact phone, plus stripped, within the key's org", async () => {
    db.contact.findMany.mockResolvedValue([
      {
        id: CONTACT,
        name: "Ann",
        source: null,
        waMessageAssignStatus: "OPEN",
        createdAt: "2026-01-01T00:00:00.000Z",
        identities: [{ kind: "PHONE", value: "919876543210" }],
      },
    ]);

    const response = await call("GET", "/contacts?phone=%2B919876543210");

    const { where } = db.contact.findMany.mock.calls[0][0];
    expect(where).toEqual({
      orgId: ORG,
      OR: [{ identities: { some: { kind: "PHONE", value: "919876543210" } } }],
    });
    // The same fields, in the same order, as before phone and email became identities.
    const [contact] = response.json();
    expect(Object.keys(contact)).toEqual([
      "id",
      "name",
      "phone",
      "email",
      "source",
      "igsId",
      "waMessageAssignStatus",
      "createdAt",
    ]);
    expect(contact).toMatchObject({ id: CONTACT, phone: "919876543210", email: null });
  });

  test("search needs a phone or an email", async () => {
    expect((await call("GET", "/contacts")).statusCode).toBe(400);
  });

  test("update writes only the allowed fields, in the key's org", async () => {
    m(updateContactById).mockResolvedValue({ id: CONTACT, name: "Ann B", phone: "1" });

    const response = await call("PATCH", `/contacts/${CONTACT}`, {
      name: "Ann B",
      orgId: OTHER_ORG,
    });

    expect(response.statusCode).toBe(200);
    expect(updateContactById).toHaveBeenCalledWith(CONTACT, ORG, { name: "Ann B" });
    expect(response.json()).toMatchObject({ id: CONTACT, name: "Ann B", email: null });
  });

  test("a contact outside the org is a 404, not a 500", async () => {
    m(deleteContactById).mockRejectedValue(Object.assign(new Error("missing"), { code: "P2025" }));

    const response = await call("DELETE", `/contacts/${CONTACT}`);

    expect(response.statusCode).toBe(404);
    expect(deleteContactById).toHaveBeenCalledWith(CONTACT, ORG);
  });

  test("lifecycle is set in the key's org", async () => {
    m(updateContactLabelsById).mockResolvedValue({ id: CONTACT, Lifecycle: { name: "Customer" } });

    const response = await call("PUT", `/contacts/${CONTACT}/lifecycle`, { lifecycleId: "l-1" });

    expect(updateContactLabelsById).toHaveBeenCalledWith(CONTACT, ORG, "l-1");
    expect(response.json()).toEqual({
      contactId: CONTACT,
      lifecycleId: "l-1",
      lifecycleName: "Customer",
    });
  });
});

describe("messages", () => {
  test("a text goes to the phone from the key's org", async () => {
    await call("POST", "/messages/text", { phone: "919876543210", message: "Hi" });

    expect(sendTextMessage).toHaveBeenCalledWith({ phone: "919876543210", orgId: ORG }, null, "Hi");
  });

  test("a template's variables become its body parameters, in order", async () => {
    m(sendTemplateToUserCore).mockResolvedValue({ status: true, message: "sent", id: "wamid.1" });

    const response = await call("POST", "/messages/template", {
      phone: "919876543210",
      templateId: "tpl-1",
      variables: ["Ann", "42"],
    });

    expect(response.json()).toEqual({ success: true, messageId: "wamid.1" });
    expect(sendTemplateToUserCore).toHaveBeenCalledWith(
      ORG,
      "tpl-1",
      "919876543210",
      [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Ann" },
            { type: "text", text: "42" },
          ],
        },
      ],
      undefined,
    );
  });

  test("a teamId from another org is refused before anything is sent", async () => {
    db.team.findFirst.mockResolvedValueOnce(null);

    const response = await call("POST", "/messages/template", {
      phone: "919876543210",
      templateId: "tpl-1",
      teamId: "team-of-another-org",
    });

    expect(response.statusCode).toBe(404);
    expect(db.team.findFirst.mock.calls[0][0].where).toEqual({
      id: "team-of-another-org",
      orgId: ORG,
    });
    expect(sendTemplateToUserCore).not.toHaveBeenCalled();
  });

  test("a teamId of the key's org is passed on", async () => {
    db.team.findFirst.mockResolvedValueOnce({ id: "team-1" });
    m(sendTemplateToUserCore).mockResolvedValue({ status: true, id: "wamid.2" });

    await call("POST", "/messages/template", {
      phone: "919876543210",
      templateId: "tpl-1",
      teamId: "team-1",
    });

    expect(m(sendTemplateToUserCore).mock.calls[0][4]).toBe("team-1");
  });

  test("a refused template send is a 400 with the reason", async () => {
    m(sendTemplateToUserCore).mockResolvedValue({
      status: false,
      message: "Template not found with id",
    });

    const response = await call("POST", "/messages/template", {
      phone: "919876543210",
      templateId: "tpl-x",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Template not found with id" });
  });
});

describe("templates dropdown", () => {
  test("lists approved templates with their variable count", async () => {
    m(getTemplatesByOrgId).mockResolvedValue([
      {
        id: "t-2",
        data: {
          name: "welcome",
          language: "en",
          status: "APPROVED",
          components: [{ type: "BODY", text: "Hi {{1}}, your code is {{2}}" }],
        },
      },
      { id: "t-1", data: { name: "draft", language: "en", status: "PENDING", components: [] } },
    ]);

    const response = await call("GET", "/templates");

    expect(getTemplatesByOrgId).toHaveBeenCalledWith(ORG);
    expect(response.json()).toEqual([
      { id: "t-2", name: "welcome", language: "en", variableCount: 2 },
    ]);
  });

  test("a body without variables needs none", () => {
    expect(templateBodyVariableCount([{ type: "BODY", text: "Thanks!" }])).toBe(0);
    expect(templateBodyVariableCount([])).toBe(0);
  });
});
