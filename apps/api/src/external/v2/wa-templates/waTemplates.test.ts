import { Writable } from "node:stream";
import { beforeEach, describe, expect, test, vi } from "vitest";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../utils/rateLimit.js", () => ({ rateLimit: () => async () => {} }));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    waTemplate: { findMany: vi.fn(), findFirst: vi.fn() },
    team: { findFirst: vi.fn() },
    contact: { findMany: vi.fn() },
    waMessage: { findFirst: vi.fn() },
  },
}));
vi.mock("../../../modules/whatsapp/messageTemplates/wa_templates.controller.js", () => ({
  sendTemplateToUserCore: vi.fn(),
}));
vi.mock("../../../modules/whatsapp/settings/wa_settings.service.js", () => ({
  getWaSendingSettings: vi.fn(),
}));
vi.mock("../../../modules/whatsapp/whatsappSurvey/wasurvey.auth.js", () => ({
  ActiveContactLimitError: class ActiveContactLimitError extends Error {},
  OrgSuspendedError: class OrgSuspendedError extends Error {},
}));
vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return { default: { ...actual.default, post: vi.fn() } };
});

import axios from "axios";
import prisma from "../../../utils/prisma.js";
import { sendTemplateToUserCore } from "../../../modules/whatsapp/messageTemplates/wa_templates.controller.js";
import { getWaSendingSettings } from "../../../modules/whatsapp/settings/wa_settings.service.js";
import { TemplateSendError } from "../../../modules/whatsapp/messageTemplates/templateSendError.js";
import { externalErrorHandler } from "../../shared/errors.js";
import { externalWaTemplateRoutes } from "./waTemplates.route.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  waTemplate: { findMany: Mock; findFirst: Mock };
  team: { findFirst: Mock };
  contact: { findMany: Mock };
  waMessage: { findFirst: Mock };
};
const core = sendTemplateToUserCore as unknown as Mock;
const settings = getWaSendingSettings as unknown as Mock;
const axiosPost = axios.post as unknown as Mock;

const TEMPLATE_ID = "6f1c2a1e-0000-4000-8000-000000000001";
const TEAM_ID = "6f1c2a1e-0000-4000-8000-0000000000aa";
const CONTACT_A = "6f1c2a1e-0000-4000-8000-00000000000a";
const CONTACT_B = "6f1c2a1e-0000-4000-8000-00000000000b";

function templateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TEMPLATE_ID,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    templateType: "GENERAL_NOTIFICATION",
    whatsappSettingsPhoneId: "phone-1",
    data: {
      id: "hsm-123",
      name: "order_update",
      language: "en_US",
      status: "APPROVED",
      category: "UTILITY",
      components: [{ type: "BODY", text: "Hi {{1}}" }],
    },
    ...overrides,
  };
}

async function buildApp() {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(externalErrorHandler);
  app.addHook("preHandler", async (request) => {
    (request as { user?: unknown }).user = { orgId: "org-1", role: "SUPER_ADMIN" };
  });
  await app.register(externalWaTemplateRoutes);
  await app.ready();
  return app;
}

function multipart(
  fields: [string, string][],
  file?: { type: string; body: Buffer },
  after?: [string, string][],
) {
  const boundary = "----rateuptest";
  const chunks: Buffer[] = [];
  const field = ([name, value]: [string, string]) =>
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
      ),
    );
  fields.forEach(field);
  if (file) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="f.bin"\r\n` +
          `Content-Type: ${file.type}\r\n\r\n`,
      ),
      file.body,
      Buffer.from("\r\n"),
    );
  }
  (after ?? []).forEach(field);
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    payload: Buffer.concat(chunks),
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
  };
}

/** Stands in for the Graph upload: drains the form stream the way the HTTP request would. */
function drainingUpload() {
  axiosPost.mockImplementation(
    (_url: string, form: NodeJS.ReadableStream) =>
      new Promise((resolve, reject) => {
        form.on("error", reject);
        form
          .pipe(new Writable({ write: (_c, _e, done) => done() }))
          .on("finish", () => resolve({ status: 200, data: { id: "media-1" } }));
      }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  db.waTemplate.findMany.mockResolvedValue([templateRow()]);
  db.waTemplate.findFirst.mockResolvedValue(templateRow());
  db.team.findFirst.mockResolvedValue({ id: TEAM_ID });
  settings.mockResolvedValue({ phoneId: "meta-phone-1", accessToken: "tok" });
  core.mockResolvedValue({ status: true, message: "wamid.ABC" });
});

describe("POST /send", () => {
  test("takes a + and spaces, and hands on digits", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send",
      payload: { templateName: "order_update", phone: "+91 98765 43210", bodyVariables: ["Ann"] },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: "accepted", messageId: "wamid.ABC" });
    expect(core.mock.calls[0][2]).toBe("919876543210");
    // Looked up by name first, then sent by the id that lookup found.
    expect(core.mock.calls[0][1]).toBe(TEMPLATE_ID);
    expect(core.mock.calls[0][7]).toBe(false);
    expect(db.waTemplate.findMany.mock.calls[0][0].where.orgId).toBe("org-1");
  });

  test("still takes the legacy bare number", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send",
      payload: { templateName: "order_update", phone: 919876543210 },
    });

    expect(res.statusCode).toBe(200);
    expect(core.mock.calls[0][2]).toBe("919876543210");
  });

  test("an invalid phone is a 400 envelope and nothing is sent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send",
      payload: { templateName: "order_update", phone: "+12" },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error.code).toBe("validation_failed");
    expect(core).not.toHaveBeenCalled();
  });

  test("a missing template is a 404 envelope, not a plain string", async () => {
    db.waTemplate.findMany.mockResolvedValue([]);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send",
      payload: { templateName: "nope", phone: "+919876543210" },
    });

    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(JSON.parse(res.payload).error).toMatchObject({ code: "template_not_found" });
    expect(core).not.toHaveBeenCalled();
  });

  test("an unapproved template is a 422", async () => {
    db.waTemplate.findMany.mockResolvedValue([
      templateRow({ data: { ...templateRow().data, status: "REJECTED" } }),
    ]);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send",
      payload: { templateName: "order_update", phone: "+919876543210" },
    });

    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.payload).error).toMatchObject({
      code: "template_not_approved",
      details: { status: "REJECTED" },
    });
  });

  test("a name in several languages needs `language`", async () => {
    db.waTemplate.findMany.mockResolvedValue([
      templateRow(),
      templateRow({ id: "x", data: { ...templateRow().data, language: "hi" } }),
    ]);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send",
      payload: { templateName: "order_update", phone: "+919876543210" },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error.details.languages).toEqual(["en_US", "hi"]);
  });

  test("another org's team is refused", async () => {
    db.team.findFirst.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send",
      payload: { templateName: "order_update", phone: "+919876543210", teamId: TEAM_ID },
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).error.code).toBe("team_not_found");
    expect(db.team.findFirst.mock.calls[0][0].where).toEqual({ id: TEAM_ID, orgId: "org-1" });
    expect(core).not.toHaveBeenCalled();
  });

  test("no connected number is whatsapp_not_connected", async () => {
    settings.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send",
      payload: { templateName: "order_update", phone: "+919876543210" },
    });

    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.payload).error.code).toBe("whatsapp_not_connected");
  });

  test("Meta's refusal is a 422 with Meta's code, not its raw text", async () => {
    core.mockResolvedValue({
      status: false,
      message: "(#131026) internal-ish text",
      error: { code: 131026, message: "internal-ish text" },
    });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send",
      payload: { templateName: "order_update", phone: "+919876543210" },
    });

    expect(res.statusCode).toBe(422);
    const { error } = JSON.parse(res.payload);
    expect(error).toMatchObject({ code: "send_failed", details: { metaCode: 131026 } });
    expect(error.message).not.toContain("internal-ish");
  });

  test("WhatsApp unreachable is a 502", async () => {
    core.mockResolvedValue({ status: false, message: "x", error: { code: -1 } });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send",
      payload: { templateName: "order_update", phone: "+919876543210" },
    });

    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.payload).error.code).toBe("send_failed");
  });

  test("a template that cannot be sent as set up is a 422", async () => {
    core.mockRejectedValue(
      new TemplateSendError("header_media_missing", "Image not found in template."),
    );
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send",
      payload: { templateName: "order_update", phone: "+919876543210" },
    });

    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.payload).error).toMatchObject({
      code: "template_not_sendable",
      details: { reason: "header_media_missing" },
    });
  });

  test("an unknown failure stays a 500 and says nothing", async () => {
    core.mockRejectedValue(new Error("secret db detail"));
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send",
      payload: { templateName: "order_update", phone: "+919876543210" },
    });

    expect(res.statusCode).toBe(500);
    expect(res.payload).not.toContain("secret");
  });

  test("a scheduled send answers with the schedule", async () => {
    core.mockResolvedValue({ id: "sched-1", scheduledAt: new Date("2026-02-01T10:00:00.000Z") });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send",
      payload: { templateName: "order_update", phone: "+919876543210", scheduleInMinutes: 30 },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({
      status: "scheduled",
      scheduleId: "sched-1",
      scheduledAt: "2026-02-01T10:00:00.000Z",
    });
    expect(core.mock.calls[0][6]).toBe(30);
  });
});

describe("route contract", () => {
  test("every send is marked paid", async () => {
    const routes: Record<string, { config?: Record<string, unknown>; schema?: any }> = {};
    const probe = Fastify();
    probe.setValidatorCompiler(validatorCompiler);
    probe.setSerializerCompiler(serializerCompiler);
    probe.addHook("onRoute", (opts) => {
      routes[`${opts.method} ${opts.url}`] = opts as never;
    });
    await probe.register(externalWaTemplateRoutes);
    await probe.ready();

    const sends = ["POST /send", "POST /send-with-file", "POST /:templateId/send/contacts"];
    for (const key of sends) {
      expect(routes[key]?.config).toMatchObject({ paid: true });
    }
    expect(routes["POST /send"]!.config!.permission).toBe("inbox.reply");
    expect(routes["POST /send-with-file"]!.config!.permission).toBe("inbox.reply");
    expect(routes["POST /:templateId/send/contacts"]!.config!.permission).toEqual([
      "inbox.reply",
      "campaigns.send",
    ]);
    expect(routes["GET /messages/:messageId/status"]!.config!.permission).toBe("inbox.read");
    expect(routes["GET /"]!.config!.permission).toBe("templates.read");
    for (const [key, route] of Object.entries(routes)) {
      if (key.startsWith("HEAD")) continue;
      expect(route.schema?.response?.["200"], key).toBeDefined();
    }
  });
});

describe("GET /", () => {
  test("internal columns do not survive serialisation", async () => {
    db.waTemplate.findMany.mockResolvedValue([
      {
        ...templateRow(),
        orgId: "org-1",
        acceptButton: "secret-accept",
        defaultValues: { image: { link: "s3-key-secret" } },
        data: {
          ...templateRow().data,
          parameter_format: "POSITIONAL",
          sub_category: "internal-sub",
          components: [
            {
              type: "BODY",
              text: "Hi {{1}}",
              example: { body_text: [["sample-secret"]] },
            },
          ],
        },
      },
    ]);
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/?status=APPROVED" });

    expect(res.statusCode).toBe(200);
    for (const leaked of [
      "org-1",
      "secret-accept",
      "s3-key-secret",
      "hsm-123",
      "whatsappSettingsPhoneId",
      "phone-1",
      "parameter_format",
      "internal-sub",
      "sample-secret",
    ]) {
      expect(res.payload).not.toContain(leaked);
    }
    const body = JSON.parse(res.payload);
    expect(body.nextCursor).toBeNull();
    expect(body.data[0]).toMatchObject({
      id: TEMPLATE_ID,
      name: "order_update",
      language: "en_US",
      status: "APPROVED",
      category: "UTILITY",
      createdAt: "2026-01-01T00:00:00.000Z",
      components: [{ type: "BODY", text: "Hi {{1}}", format: null, buttons: null }],
    });
    const where = db.waTemplate.findMany.mock.calls[0][0].where;
    expect(where.orgId).toBe("org-1");
    expect(where.data).toEqual({ path: ["status"], equals: "APPROVED" });
  });
});

describe("GET /messages/:messageId/status", () => {
  test("another org's message is a 404, and the lookup is org-scoped", async () => {
    db.waMessage.findFirst.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/messages/wamid.OTHER/status" });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).error.code).toBe("message_not_found");
    const where = db.waMessage.findFirst.mock.calls[0][0].where;
    expect(where.messageId).toBe("wamid.OTHER");
    expect(where.OR).toEqual([
      { waMessageOrgTeamMaps: { some: { orgId: "org-1" } } },
      { contact: { orgId: "org-1" } },
    ]);
  });

  test("presents receipts as ISO times", async () => {
    db.waMessage.findFirst.mockResolvedValue({
      messageId: "wamid.ABC",
      stats: { sent: "1767225600", delivered: "1767225660", read: "", failed: "" },
      errorCode: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/messages/wamid.ABC/status" });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toMatchObject({
      messageId: "wamid.ABC",
      status: "delivered",
      sentAt: "2026-01-01T00:00:00.000Z",
      deliveredAt: "2026-01-01T00:01:00.000Z",
      readAt: null,
      error: null,
    });
  });
});

describe("POST /:templateId/send/contacts", () => {
  test("only the org's contacts are sent to; the rest are skipped", async () => {
    db.contact.findMany.mockResolvedValue([{ id: CONTACT_A, phone: "919000000001" }]);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${TEMPLATE_ID}/send/contacts`,
      payload: { contactIds: [CONTACT_A, CONTACT_B] },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({
      sent: [{ contactId: CONTACT_A, messageId: "wamid.ABC" }],
      failed: [],
      skipped: [{ contactId: CONTACT_B, reason: "not_found" }],
    });
    expect(db.contact.findMany.mock.calls[0][0].where.orgId).toBe("org-1");
    expect(db.waTemplate.findFirst.mock.calls[0][0].where).toEqual({
      id: TEMPLATE_ID,
      orgId: "org-1",
    });
  });

  test("another org's template is a 404", async () => {
    db.waTemplate.findFirst.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${TEMPLATE_ID}/send/contacts`,
      payload: { contactIds: [CONTACT_A] },
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).error.code).toBe("template_not_found");
  });

  test("a per-contact Meta refusal is reported, not thrown", async () => {
    db.contact.findMany.mockResolvedValue([
      { id: CONTACT_A, phone: "919000000001" },
      { id: CONTACT_B, phone: "919000000002" },
    ]);
    core
      .mockResolvedValueOnce({ status: true, message: "wamid.1" })
      .mockResolvedValueOnce({ status: false, message: "x", error: { code: 131026 } });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${TEMPLATE_ID}/send/contacts`,
      payload: { contactIds: [CONTACT_A, CONTACT_B] },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).failed).toEqual([
      { contactId: CONTACT_B, code: "send_failed", metaCode: 131026 },
    ]);
  });

  test("more than 1000 contacts is refused", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${TEMPLATE_ID}/send/contacts`,
      payload: { contactIds: Array.from({ length: 1001 }, () => CONTACT_A) },
    });

    expect(res.statusCode).toBe(400);
    expect(core).not.toHaveBeenCalled();
  });
});

describe("POST /send-with-file", () => {
  const baseFields: [string, string][] = [
    ["templateName", "order_update"],
    ["phone", "+919876543210"],
    ["headerType", "image"],
    ["bodyVariables", '["Ann","42"]'],
  ];

  test("streams the file to WhatsApp and sends with the media id", async () => {
    drainingUpload();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send-with-file",
      ...multipart(baseFields, { type: "image/png", body: Buffer.alloc(1024, 1) }),
    });

    expect(res.statusCode).toBe(200);
    expect(axiosPost.mock.calls[0][0]).toContain("/meta-phone-1/media");
    expect(axiosPost.mock.calls[0][2].maxRedirects).toBe(0);
    const components = core.mock.calls[0][3];
    expect(components).toEqual([
      { type: "header", parameters: [{ type: "image", image: { id: "media-1" } }] },
      {
        type: "body",
        parameters: [
          { type: "text", text: "Ann" },
          { type: "text", text: "42" },
        ],
      },
    ]);
  });

  test("a mimetype the header type does not take is a 400 envelope", async () => {
    drainingUpload();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send-with-file",
      ...multipart(baseFields, { type: "application/pdf", body: Buffer.alloc(10) }),
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toMatchObject({
      code: "file_invalid",
      details: { mimetype: "application/pdf" },
    });
    expect(axiosPost).not.toHaveBeenCalled();
    expect(core).not.toHaveBeenCalled();
  });

  test("a file over its type's cap is a 400 envelope", async () => {
    drainingUpload();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send-with-file",
      ...multipart(baseFields, { type: "image/jpeg", body: Buffer.alloc(5 * 1024 * 1024 + 1) }),
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toMatchObject({
      code: "file_invalid",
      details: { maxBytes: 5 * 1024 * 1024 },
    });
    expect(core).not.toHaveBeenCalled();
  });

  test("a declared fileSize over the cap is refused before reading", async () => {
    drainingUpload();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send-with-file",
      ...multipart([...baseFields, ["fileSize", String(6 * 1024 * 1024)]], {
        type: "image/jpeg",
        body: Buffer.alloc(10),
      }),
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error.code).toBe("file_invalid");
    expect(axiosPost).not.toHaveBeenCalled();
  });

  test("a field after the file is refused", async () => {
    drainingUpload();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send-with-file",
      ...multipart(baseFields, { type: "image/png", body: Buffer.alloc(10) }, [["tag", "late"]]),
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toMatchObject({
      code: "validation_failed",
      details: { field: "tag" },
    });
    expect(core).not.toHaveBeenCalled();
  });

  test("an invalid phone field is a 400 envelope before any upload", async () => {
    drainingUpload();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send-with-file",
      ...multipart(
        [
          ["templateName", "order_update"],
          ["phone", "12"],
          ["headerType", "image"],
        ],
        { type: "image/png", body: Buffer.alloc(10) },
      ),
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error.code).toBe("validation_failed");
    expect(axiosPost).not.toHaveBeenCalled();
  });

  test("Meta refusing the upload is send_failed at the media stage", async () => {
    axiosPost.mockImplementation(
      (_url: string, form: NodeJS.ReadableStream) =>
        new Promise((resolve) => {
          form
            .pipe(new Writable({ write: (_c, _e, done) => done() }))
            .on("finish", () =>
              resolve({ status: 400, data: { error: { code: 131053, message: "bad media" } } }),
            );
        }),
    );
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/send-with-file",
      ...multipart(baseFields, { type: "image/png", body: Buffer.alloc(10) }),
    });

    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.payload).error).toMatchObject({
      code: "send_failed",
      details: { stage: "media", metaCode: 131053 },
    });
    expect(core).not.toHaveBeenCalled();
  });
});

describe("send-with-file's documented form", () => {
  test("lists exactly the fields the handler validates, plus the file", async () => {
    const S = await import("./waTemplates.schema.js");
    expect(Object.keys(S.sendWithFileFormSchema.shape).sort()).toEqual(
      [...Object.keys(S.sendWithFileFieldsSchema.shape), "file"].sort(),
    );
  });
});
