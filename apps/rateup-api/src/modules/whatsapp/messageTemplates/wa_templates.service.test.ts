import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    waTemplate: {
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  excludeFields: vi.fn(),
}));
vi.mock("../settings/wa_settings.service.js", () => ({ getWaSettings: vi.fn() }));
vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("./wa_templates.utils.js", () => ({
  generateTemplate: vi.fn(),
  getFlowIdFromTemplateComponents: vi.fn(),
}));
vi.mock("../flows/flow.service.js", () => ({ getFlowWithSurveyTeamMapIds: vi.fn() }));
vi.mock("../whatsappSurvey/wasurvey.service.js", () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  sendMessage: vi.fn(),
}));
vi.mock("../whatsappSurvey/wasurvey.utils.js", () => ({ createTemplateMessage: vi.fn() }));
vi.mock("../../../utils/upload/s3Upload.js", () => ({ getFileUrlFromKey: vi.fn() }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { getWaSettings } from "../settings/wa_settings.service.js";
import { callMetaApi } from "../wa_axios.js";
import { generateTemplate, getFlowIdFromTemplateComponents } from "./wa_templates.utils.js";
import { getFlowWithSurveyTeamMapIds } from "../flows/flow.service.js";
import { createSession, deleteSession, sendMessage } from "../whatsappSurvey/wasurvey.service.js";
import { createTemplateMessage } from "../whatsappSurvey/wasurvey.utils.js";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload.js";
import { TemplateType } from "../../../../generated/prisma/client.js";
import {
  createTemplate,
  deleteTemplate,
  deleteTemplateFromDb,
  fetchTemplate,
  fetchTemplates,
  getDbTemplate,
  getTemplateByIdAndOrgId,
  getTemplateByNameAndOrgId,
  getTemplateByTemplateType,
  getTemplatesByOrgId,
  getTemplateWithHSMId,
  getUnregisteredTemplates,
  registerTemplatesInDb,
  saveTemplate,
  sendTemplateToPhone,
  syncTemplates,
  updateTemplate,
  updateTemplateInDb,
  uploadFileToWaTemplate,
} from "./wa_templates.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = (
  prisma as unknown as {
    waTemplate: Record<
      "create" | "createMany" | "delete" | "findFirst" | "findMany" | "findUnique" | "update",
      Mock
    >;
  }
).waTemplate;
const getWaSettingsMock = getWaSettings as unknown as Mock;
const callMetaApiMock = callMetaApi as unknown as Mock;
const generateTemplateMock = generateTemplate as unknown as Mock;
const getFlowIdMock = getFlowIdFromTemplateComponents as unknown as Mock;
const getFlowWithTeamsMock = getFlowWithSurveyTeamMapIds as unknown as Mock;
const createSessionMock = createSession as unknown as Mock;
const deleteSessionMock = deleteSession as unknown as Mock;
const sendMessageMock = sendMessage as unknown as Mock;
const createTemplateMessageMock = createTemplateMessage as unknown as Mock;
const getFileUrlMock = getFileUrlFromKey as unknown as Mock;

const ORG_A = "org-a";
const ORG_B = "org-b";
const TEMPLATE_ID = "tpl-1";

const SETTINGS = { wabaId: "waba-1", accessToken: "token-abc", appId: "app-1" };

/** A stored template row. */
function row(overrides: Record<string, unknown> = {}): any {
  return {
    id: TEMPLATE_ID,
    orgId: ORG_A,
    templateType: TemplateType.GENERAL_NOTIFICATION,
    whatsappSettingsPhoneId: "phone-1",
    config: null,
    defaultValues: {},
    data: {
      id: "wa-tpl-1",
      name: "order_update",
      language: "en",
      category: "MARKETING",
      components: [{ type: "BODY", text: "hi" }],
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getWaSettingsMock.mockResolvedValue(SETTINGS);
  callMetaApiMock.mockResolvedValue({ status: 200, data: { data: [] } });
  db.findFirst.mockResolvedValue(row());
  db.findUnique.mockResolvedValue(row());
  db.findMany.mockResolvedValue([]);
  db.create.mockResolvedValue(row());
  db.createMany.mockResolvedValue({ count: 1 });
  db.update.mockResolvedValue(row());
  db.delete.mockResolvedValue(row());
  generateTemplateMock.mockReturnValue({ name: "order_update", components: [] });
  getFlowIdMock.mockReturnValue(undefined);
  createTemplateMessageMock.mockReturnValue({ type: "template" });
  getFileUrlMock.mockImplementation((key: string) => `https://cdn/${key}`);
});

describe("fetchTemplates", () => {
  test("asks Meta for the business account's templates with the org's token", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [{ id: "wa-tpl-1" }] } });

    await expect(fetchTemplates(ORG_A)).resolves.toEqual([{ id: "wa-tpl-1" }]);
    const [url, method, token] = callMetaApiMock.mock.calls[0];
    expect(url).toContain("/waba-1/message_templates");
    expect(method).toBe("GET");
    expect(token).toBe("token-abc");
  });

  test("narrows to one connected number when told which", async () => {
    await fetchTemplates(ORG_A, "phone-2");

    expect(getWaSettingsMock).toHaveBeenCalledWith(ORG_A, "phone-2");
  });

  // Every failure — no settings, an expired token, a Meta outage — used to be
  // caught and turned into an empty list, which is indistinguishable from an org
  // that genuinely has no templates. syncTemplates then walked that empty list and
  // reported a clean sync.
  test("lets a Meta failure reach the caller", async () => {
    callMetaApiMock.mockRejectedValue(new Error("graph is down"));

    await expect(fetchTemplates(ORG_A)).rejects.toThrow("graph is down");
  });

  test("refuses an org with no WhatsApp settings", async () => {
    getWaSettingsMock.mockResolvedValue(null);

    await expect(fetchTemplates(ORG_A)).rejects.toThrow("No WhatsApp settings found");
  });

  // Only res.data.data was read; the paging cursor Meta returns alongside it was
  // never followed, so an account with more templates than one page silently
  // synced a prefix of them. That also mattered for 14.6's reconciliation:
  // "missing from Meta" is only meaningful once the read is complete.
  test("follows the paging cursor to the end", async () => {
    callMetaApiMock
      .mockResolvedValueOnce({
        data: {
          data: [{ id: "wa-tpl-1" }],
          paging: { next: "https://graph.facebook.com/v25.0/waba-1/message_templates?after=abc" },
        },
      })
      .mockResolvedValueOnce({ data: { data: [{ id: "wa-tpl-2" }] } });

    await expect(fetchTemplates(ORG_A)).resolves.toEqual([{ id: "wa-tpl-1" }, { id: "wa-tpl-2" }]);
    expect(callMetaApiMock).toHaveBeenCalledTimes(2);
    // Meta hands back an absolute url; only the path and query go to callMetaApi,
    // which prefixes the graph base itself.
    expect(callMetaApiMock.mock.calls[1][0]).toBe("/waba-1/message_templates?after=abc");
  });

  test("stops at the last page rather than looping", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [{ id: "wa-tpl-1" }] } });

    await fetchTemplates(ORG_A);

    expect(callMetaApiMock).toHaveBeenCalledTimes(1);
  });

  test("fetches one template by name", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [{ id: "wa-tpl-1" }] } });

    await expect(fetchTemplate("order_update", ORG_A)).resolves.toEqual({ id: "wa-tpl-1" });
    expect(callMetaApiMock.mock.calls[0][0]).toContain("name=order_update");
  });

  test("reports nothing rather than throwing when one template cannot be fetched", async () => {
    callMetaApiMock.mockRejectedValue(new Error("graph is down"));

    await expect(fetchTemplate("order_update", ORG_A)).resolves.toBeUndefined();
  });
});

describe("reading templates from our own database", () => {
  test("lists an org's templates, scoped to that org", async () => {
    await getTemplatesByOrgId(ORG_A);

    expect(db.findMany.mock.calls[0][0]).toEqual({ where: { orgId: ORG_A } });
  });

  test("scopes a lookup by id to the caller's org", async () => {
    await getTemplateByIdAndOrgId(TEMPLATE_ID, ORG_A);

    expect(db.findFirst.mock.calls[0][0]).toEqual({ where: { orgId: ORG_A, id: TEMPLATE_ID } });
  });

  test("scopes a lookup by name to the caller's org", async () => {
    await getTemplateByNameAndOrgId("order_update", ORG_A);

    expect(db.findFirst.mock.calls[0][0].where).toEqual({
      orgId: ORG_A,
      data: { path: ["name"], equals: "order_update" },
    });
  });

  test("scopes a lookup by template type to the caller's org", async () => {
    await getTemplateByTemplateType(TemplateType.LOYALTY, ORG_A);

    expect(db.findMany.mock.calls[0][0]).toEqual({
      where: { templateType: TemplateType.LOYALTY, orgId: ORG_A },
    });
  });

  // getDbTemplate keyed on the id alone and took no org. updateTemplateHandler and
  // deleteTemplateHandler each compared orgId themselves afterwards, but
  // saveTemplateAsDraftHandler did not — so naming another org's template id in the
  // body rewrote their template into a draft.
  test("scopes a template lookup by id to the org asking", async () => {
    await getDbTemplate(TEMPLATE_ID, ORG_A);

    expect(db.findFirst.mock.calls[0][0]).toEqual({
      where: { id: TEMPLATE_ID, orgId: ORG_A },
    });
  });

  test("reports nothing for a template belonging to another org", async () => {
    db.findFirst.mockResolvedValue(null);

    await expect(getDbTemplate(TEMPLATE_ID, ORG_B)).resolves.toBeNull();
  });

  // NOTE: same gap, reached from the Meta template id — this one searches every
  // org's templates by design, since it is used to resolve webhook status updates.
  // Worth knowing it is unscoped before reusing it.
  test("finds a template by its Meta id across every org", async () => {
    await getTemplateWithHSMId("wa-tpl-1");

    expect(db.findFirst.mock.calls[0][0]).toEqual({
      where: { data: { path: ["id"], equals: "wa-tpl-1" } },
    });
  });

  test("reports nothing rather than throwing when the lookup fails", async () => {
    db.findFirst.mockRejectedValue(new Error("db down"));

    await expect(getDbTemplate(TEMPLATE_ID, ORG_A)).resolves.toBeNull();
  });
});

describe("createTemplate", () => {
  test("posts the template to the business account with the org's token", async () => {
    callMetaApiMock.mockResolvedValue({ status: 200, data: { id: "wa-tpl-1" } });

    await createTemplate(ORG_A, { name: "order_update" });

    expect(callMetaApiMock.mock.calls[0].slice(0, 3)).toEqual([
      "/waba-1/message_templates",
      "POST",
      "token-abc",
    ]);
  });

  test("merges Meta's answer into the template it sent", async () => {
    callMetaApiMock.mockResolvedValue({ status: 200, data: { id: "wa-tpl-1", status: "PENDING" } });

    await expect(createTemplate(ORG_A, { name: "order_update" })).resolves.toEqual({
      name: "order_update",
      id: "wa-tpl-1",
      status: "PENDING",
    });
  });

  test("refuses when the org has no WhatsApp settings", async () => {
    getWaSettingsMock.mockResolvedValue(null);

    await expect(createTemplate(ORG_A, { name: "order_update" })).rejects.toThrow(
      "No WhatsApp settings found for orgId " + ORG_A,
    );
  });

  // NOTE: pins current behaviour. callMetaApi already throws GraphApiError for any
  // non-2xx, so this branch only fires for a 2xx that is not exactly 200 — and when
  // it does, the specific reason Meta gave is logged and replaced by a bare
  // "Error creating template in whatsapp". Marked TODO in the source.
  test("replaces Meta's reason with a generic message on a non-200 success", async () => {
    callMetaApiMock.mockResolvedValue({ status: 201, data: { error: "name already exists" } });

    await expect(createTemplate(ORG_A, { name: "order_update" })).rejects.toThrow(
      "Error creating template in whatsapp",
    );
  });
});

describe("saving and deleting templates in our database", () => {
  test("stores the template against the org with its type and defaults", async () => {
    await saveTemplate(
      { name: "order_update" },
      ORG_A,
      { image: { link: "k" } },
      TemplateType.LOYALTY,
      { price: 1, name: "item", tax: 0 },
      "phone-1",
    );

    expect(db.create.mock.calls[0][0].data).toEqual({
      data: { name: "order_update" },
      acceptButton: "",
      orgId: ORG_A,
      defaultValues: { image: { link: "k" } },
      templateType: TemplateType.LOYALTY,
      config: { price: 1, name: "item", tax: 0 },
      whatsappSettingsPhoneId: "phone-1",
    });
  });

  test("scopes the update to the caller's org", async () => {
    await updateTemplateInDb(TEMPLATE_ID, ORG_A, { name: "renamed" });

    expect(db.update.mock.calls[0][0].where).toEqual({ id: TEMPLATE_ID, orgId: ORG_A });
  });

  test("leaves the stored defaults alone when none are supplied", async () => {
    await updateTemplateInDb(TEMPLATE_ID, ORG_A, { name: "renamed" });

    expect(db.update.mock.calls[0][0].data.defaultValues).toBeUndefined();
  });

  // All three used to swallow their failure — two of them to console.log rather
  // than the logger — and resolve to undefined, so no caller could tell a stored
  // template from a lost one, and createTemplateHandler replied 200 "template
  // created" either way. Same family as
  test.each([
    ["saving", () => saveTemplate({ name: "n" }, ORG_A)],
    ["updating", () => updateTemplateInDb(TEMPLATE_ID, ORG_A, { name: "n" })],
    ["deleting", () => deleteTemplateFromDb(TEMPLATE_ID, ORG_A)],
  ])("reports a failure while %s rather than swallowing it", async (_label, run) => {
    db.create.mockRejectedValue(new Error("db down"));
    db.update.mockRejectedValue(new Error("db down"));
    db.delete.mockRejectedValue(new Error("db down"));

    await expect(run()).rejects.toThrow("db down");
  });

  // Neither took an org, so the id alone decided which template was written or
  // removed.
  test("scopes the delete to the caller's org", async () => {
    await deleteTemplateFromDb(TEMPLATE_ID, ORG_A);

    expect(db.delete.mock.calls[0][0]).toEqual({ where: { id: TEMPLATE_ID, orgId: ORG_A } });
  });
});

describe("deleteTemplate", () => {
  test("asks Meta to delete by both its id and its name", async () => {
    await expect(deleteTemplate(ORG_A, "wa-tpl-1", "order_update")).resolves.toBe(true);

    const [url, method] = callMetaApiMock.mock.calls[0];
    expect(url).toContain("hsm_id=wa-tpl-1");
    expect(url).toContain("name=order_update");
    expect(method).toBe("DELETE");
  });

  test("reports failure rather than throwing when Meta refuses", async () => {
    callMetaApiMock.mockRejectedValue(new Error("graph is down"));

    await expect(deleteTemplate(ORG_A, "wa-tpl-1", "order_update")).resolves.toBe(false);
  });

  // It ignored the connected number and always resolved the org's DEFAULT
  // settings, unlike every neighbouring function — so deleting a template that
  // lives on a second WhatsApp number was attempted against the first number's
  // business account, and Meta refused.
  test("deletes against the number the template actually lives on", async () => {
    await deleteTemplate(ORG_A, "wa-tpl-1", "order_update", "phone-2");

    expect(getWaSettingsMock).toHaveBeenCalledWith(ORG_A, "phone-2");
  });

  test("falls back to the org's default number when none is named", async () => {
    await deleteTemplate(ORG_A, "wa-tpl-1", "order_update");

    expect(getWaSettingsMock).toHaveBeenCalledWith(ORG_A, undefined);
  });
});

describe("updateTemplate", () => {
  test("pushes an approved template to Meta and then refreshes our copy", async () => {
    callMetaApiMock.mockResolvedValue({ status: 200, data: { data: [{ id: "wa-tpl-1" }] } });

    await updateTemplate(TEMPLATE_ID, ORG_A, {
      templateType: TemplateType.GENERAL_NOTIFICATION,
    } as any);

    expect(callMetaApiMock.mock.calls[0].slice(0, 2)).toEqual(["/wa-tpl-1", "POST"]);
    expect(db.update).toHaveBeenCalled();
  });

  test("does not touch our copy when Meta refuses the edit", async () => {
    callMetaApiMock.mockResolvedValue({ status: 400, data: { error: "too soon" } });

    const result = await updateTemplate(TEMPLATE_ID, ORG_A, {
      templateType: TemplateType.GENERAL_NOTIFICATION,
    } as any);

    expect(db.update).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  test("keeps an order-details template local and pre-approved", async () => {
    await updateTemplate(TEMPLATE_ID, ORG_A, { templateType: TemplateType.ORDER_DETAILS } as any);

    expect(callMetaApiMock).not.toHaveBeenCalled();
    expect(db.update.mock.calls[0][0].data.data).toMatchObject({
      status: "APPROVED",
      id: "localTemplate",
    });
  });

  test("keeps only the body of a template type Meta never sees", async () => {
    generateTemplateMock.mockReturnValue({
      name: "n",
      components: [
        { type: "body", text: "hi" },
        { type: "buttons", buttons: [] },
      ],
    });

    await updateTemplate(TEMPLATE_ID, ORG_A, {
      templateType: TemplateType.PAYMENT_CONFIRMATION,
    } as any);

    expect(db.update.mock.calls[0][0].data.data.components).toEqual([{ type: "body", text: "hi" }]);
  });

  // getDbTemplate reports null for an id that matches nothing OR for a template
  // the caller's org does not own. updateTemplate used to read template.orgId
  // straight off that result, so both cases gave a bare TypeError.
  test("reports nothing for a template that does not exist", async () => {
    db.findFirst.mockResolvedValue(null);

    await expect(
      updateTemplate(TEMPLATE_ID, ORG_A, {
        templateType: TemplateType.GENERAL_NOTIFICATION,
      } as any),
    ).resolves.toBeNull();
  });

  // The local-only branches never read the template they loaded, so an id that
  // matched nothing used to walk straight into updateTemplateInDb — which was
  // itself unscoped and swallowed the resulting failure. Now every branch is past
  // the same guard.
  test("writes nothing for a local template type when the template is not the caller's", async () => {
    db.findFirst.mockResolvedValue(null);

    await expect(
      updateTemplate(TEMPLATE_ID, ORG_A, { templateType: TemplateType.ORDER_DETAILS } as any),
    ).resolves.toBeNull();
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe("syncTemplates", () => {
  test("creates a template our database has never seen", async () => {
    callMetaApiMock.mockResolvedValue({
      data: { data: [{ id: "wa-tpl-9", name: "new_one", components: [] }] },
    });

    await expect(syncTemplates(ORG_A)).resolves.toMatchObject({
      success: true,
      created: 1,
      updated: 0,
    });
    expect(db.create).toHaveBeenCalled();
  });

  test("updates a template we already hold, matched on its Meta id", async () => {
    db.findMany.mockResolvedValue([row()]);
    callMetaApiMock.mockResolvedValue({
      data: { data: [{ id: "wa-tpl-1", name: "order_update", components: [] }] },
    });

    await expect(syncTemplates(ORG_A)).resolves.toMatchObject({
      success: true,
      created: 0,
      updated: 1,
    });
    expect(db.update.mock.calls[0][0].where).toEqual({ id: TEMPLATE_ID, orgId: ORG_A });
  });

  test("matches on name and number when the Meta id has changed", async () => {
    db.findMany.mockResolvedValue([row({ data: { ...row().data, id: "old-id" } })]);
    callMetaApiMock.mockResolvedValue({
      data: { data: [{ id: "new-id", name: "order_update", components: [] }] },
    });

    await expect(syncTemplates(ORG_A, ["phone-1"])).resolves.toMatchObject({ updated: 1 });
  });

  test("syncs each connected number in turn", async () => {
    await syncTemplates(ORG_A, ["phone-1", "phone-2"]);

    expect(getWaSettingsMock.mock.calls.map((c) => c[1])).toEqual(["phone-1", "phone-2"]);
  });

  test("classifies a template carrying a carousel as a carousel", async () => {
    callMetaApiMock.mockResolvedValue({
      data: { data: [{ id: "wa-tpl-9", name: "n", components: [{ type: "CAROUSEL" }] }] },
    });

    await syncTemplates(ORG_A);

    expect(db.create.mock.calls[0][0].data.templateType).toBe(TemplateType.CAROUSEL);
  });

  test("lifts a media header's handle into the stored default values", async () => {
    callMetaApiMock.mockResolvedValue({
      data: {
        data: [
          {
            id: "wa-tpl-9",
            name: "n",
            components: [
              { type: "HEADER", format: "IMAGE", example: { header_handle: ["https://cdn/i"] } },
            ],
          },
        ],
      },
    });

    await syncTemplates(ORG_A);

    expect(db.create.mock.calls[0][0].data.defaultValues).toEqual({
      image: { link: "https://cdn/i" },
    });
  });

  // The visible half of 14.2. fetchTemplates turned a Meta outage into an empty
  // list, so the loop had nothing to do and the function reported success with
  // zero changes — exactly what a genuinely up-to-date org looks like — and
  // syncTemplatesHandler answered 200. "Sync templates" is the button a user
  // presses when their templates look wrong.
  test("reports the failure when Meta could not be reached at all", async () => {
    callMetaApiMock.mockRejectedValue(new Error("graph is down"));

    await expect(syncTemplates(ORG_A)).resolves.toMatchObject({
      success: false,
      message: "graph is down",
    });
  });

  // The sync only created and updated, so a template deleted at Meta stayed in our
  // database forever and campaigns could still be pointed at it. It is now MARKED,
  // not deleted — campaigns reference these rows, and a partial read (before the
  // paging fix) would have made every template past the first page look gone.
  test("marks a template that no longer exists at Meta, without deleting it", async () => {
    db.findMany.mockResolvedValue([row()]);
    callMetaApiMock.mockResolvedValue({ data: { data: [] } });

    await expect(syncTemplates(ORG_A)).resolves.toMatchObject({
      success: true,
      created: 0,
      updated: 0,
      missingAtMeta: 1,
    });
    expect(db.delete).not.toHaveBeenCalled();
    expect(db.update.mock.calls[0][0].data.data.status).toBe("DELETED");
  });

  test("leaves a template alone when Meta still has it", async () => {
    db.findMany.mockResolvedValue([row()]);
    callMetaApiMock.mockResolvedValue({
      data: { data: [{ id: "wa-tpl-1", name: "order_update", components: [] }] },
    });

    await expect(syncTemplates(ORG_A)).resolves.toMatchObject({ missingAtMeta: 0 });
  });
});

describe("getUnregisteredTemplates and registerTemplatesInDb", () => {
  test("reports the two-button templates our database does not hold", async () => {
    db.findMany.mockResolvedValue([row()]);
    callMetaApiMock.mockResolvedValue({
      data: {
        data: [
          { id: "wa-tpl-1", components: [{ type: "BUTTONS", buttons: [{}, {}] }] },
          { id: "wa-tpl-9", components: [{ type: "BUTTONS", buttons: [{}, {}] }] },
        ],
      },
    });

    await expect(getUnregisteredTemplates(ORG_A)).resolves.toEqual([
      { id: "wa-tpl-9", components: [{ type: "BUTTONS", buttons: [{}, {}] }] },
    ]);
  });

  test("passes over a template that does not have exactly two buttons", async () => {
    callMetaApiMock.mockResolvedValue({
      data: { data: [{ id: "wa-tpl-9", components: [{ type: "BUTTONS", buttons: [{}] }] }] },
    });

    await expect(getUnregisteredTemplates(ORG_A)).resolves.toEqual([]);
  });

  test("stores each registered template against the org", async () => {
    await registerTemplatesInDb([{ data: { name: "n" }, acceptButton: "Yes" }], ORG_A);

    expect(db.createMany.mock.calls[0][0].data).toEqual([
      { orgId: ORG_A, acceptButton: "Yes", data: { name: "n" } },
    ]);
  });

  // NOTE: pins current behaviour. getUnregisteredTemplates returns RAW Meta
  // templates — flat objects with id/name/components — while registerTemplatesInDb
  // and its request schema expect { data, acceptButton }. So the output of
  // GET /unregistered cannot be fed to POST /register without the client
  // re-wrapping it, and nothing says so. registerTemplatesInDb also records neither
  // templateType nor whatsappSettingsPhoneId, unlike saveTemplate.
  test("stores nothing usable when handed a raw Meta template", async () => {
    await registerTemplatesInDb(
      // Deliberately the raw Meta shape, not the { data } wrapper the function
      // expects — that mismatch is the behaviour this test pins.
      [{ id: "wa-tpl-9", name: "n", components: [] }] as unknown as Parameters<
        typeof registerTemplatesInDb
      >[0],
      ORG_A,
    );

    expect(db.createMany.mock.calls[0][0].data).toEqual([
      { orgId: ORG_A, acceptButton: undefined, data: undefined },
    ]);
  });

  // A buttons component Meta returned without a buttons array used to throw a
  // raw TypeError out of the listing; it is now simply not a candidate.
  test("skips a buttons component that carries no buttons array", async () => {
    callMetaApiMock.mockResolvedValue({
      data: { data: [{ id: "wa-tpl-9", components: [{ type: "BUTTONS" }] }] },
    });

    await expect(getUnregisteredTemplates(ORG_A)).resolves.toEqual([]);
  });
});

describe("uploadFileToWaTemplate", () => {
  const file: any = { filename: "banner.png", mimetype: "image/png", file: "stream" };

  beforeEach(() => {
    callMetaApiMock.mockResolvedValue({ data: { id: "upload-1", h: "handle-1" } });
  });

  test("opens an upload session against the app and returns the resulting handle", async () => {
    await expect(uploadFileToWaTemplate(file, 1024, ORG_A)).resolves.toEqual({
      fileHandle: "handle-1",
      uploadSessionId: "upload-1",
    });
    expect(callMetaApiMock.mock.calls[0][0]).toBe("/app-1/uploads");
  });

  test("sends the file's own name, size and type when opening the session", async () => {
    await uploadFileToWaTemplate(file, 1024, ORG_A);

    expect(callMetaApiMock.mock.calls[0][6]).toMatchObject({
      file_name: "banner.png",
      file_length: 1024,
      file_type: "image/png",
    });
  });

  test("uploads the bytes with the OAuth header Meta's resumable protocol wants", async () => {
    await uploadFileToWaTemplate(file, 1024, ORG_A);

    expect(callMetaApiMock.mock.calls[1][0]).toBe("/upload-1");
    expect(callMetaApiMock.mock.calls[1][5]).toMatchObject({
      Authorization: "OAuth token-abc",
      "Content-Type": "application/octet-stream",
    });
  });

  test("reports an error handle when Meta returns nothing to reference", async () => {
    callMetaApiMock.mockResolvedValue({ data: { id: "upload-1" } });

    await expect(uploadFileToWaTemplate(file, 1024, ORG_A)).resolves.toMatchObject({
      fileHandle: "error",
    });
  });

  test("refuses when the org has no app id configured", async () => {
    getWaSettingsMock.mockResolvedValue({ accessToken: "token-abc" });

    await expect(uploadFileToWaTemplate(file, 1024, ORG_A)).rejects.toThrow(
      "AccessToken and AppId should be present in whatsapp settings",
    );
  });

  // The session call used to pass undefined as callMetaApi's accessToken argument
  // and put the token in the query params instead, so it ended up in the URL
  // callMetaApi trace-logs and dumps on failure. The second call always got this
  // right, via an OAuth header. Same family as
  test("passes the access token as the auth argument when opening the session", async () => {
    await uploadFileToWaTemplate(file, 1024, ORG_A);

    expect(callMetaApiMock.mock.calls[0][2]).toBe("token-abc");
    expect(callMetaApiMock.mock.calls[0][6].access_token).toBeUndefined();
  });
});

describe("sendTemplateToPhone", () => {
  function args(overrides: Record<string, unknown> = {}): any {
    return {
      orgId: ORG_A,
      dbTemplate: row(),
      phone: "15550001",
      teamId: "team-1",
      header: undefined,
      userId: "user-1",
      ...overrides,
    };
  }

  test("sends the template under its own name and language", async () => {
    await sendTemplateToPhone(args());

    expect(createTemplateMessageMock.mock.calls[0]).toEqual([
      "15550001",
      { name: "order_update", language: { code: "en" }, components: [] },
    ]);
    expect(sendMessageMock).toHaveBeenCalled();
  });

  test("carries a header the caller supplied straight through", async () => {
    const header: any = { type: "header", parameters: [{ type: "text", text: "x" }] };

    await sendTemplateToPhone(args({ header }));

    expect(createTemplateMessageMock.mock.calls[0][1].components).toEqual([header]);
  });

  test("marks the message as a template send on the caller's team", async () => {
    await sendTemplateToPhone(args());

    const call = sendMessageMock.mock.calls[0];
    expect(call[7]).toBe("team-1");
    expect(call[8]).toBe("TEMPLATE");
  });

  test("fills in the stored default image for an image template", async () => {
    getFlowIdMock.mockReturnValue(undefined);
    const dbTemplate = row({
      defaultValues: { image: { link: "key/banner.png" } },
      data: {
        ...row().data,
        components: [{ type: "HEADER", format: "IMAGE" }],
      },
    });

    await sendTemplateToPhone(args({ dbTemplate }));

    expect(createTemplateMessageMock.mock.calls[0][1].components[0]).toEqual({
      type: "header",
      parameters: [{ type: "image", image: { link: "https://cdn/key/banner.png" } }],
    });
  });

  test("refuses an image template with no image to send", async () => {
    const dbTemplate = row({
      defaultValues: {},
      data: { ...row().data, components: [{ type: "HEADER", format: "IMAGE" }] },
    });

    await expect(sendTemplateToPhone(args({ dbTemplate }))).rejects.toThrow(
      "Image not found in template. Please upload an image and try again",
    );
  });

  test("leaves a caller-supplied image alone rather than adding the default", async () => {
    const dbTemplate = row({
      defaultValues: { image: { link: "key/banner.png" } },
      data: { ...row().data, components: [{ type: "HEADER", format: "IMAGE" }] },
    });
    const header: any = { type: "header", parameters: [{ type: "image", image: { link: "u" } }] };

    await sendTemplateToPhone(args({ dbTemplate, header }));

    expect(createTemplateMessageMock.mock.calls[0][1].components).toEqual([header]);
    expect(getFileUrlMock).not.toHaveBeenCalled();
  });

  test("opens a survey session for a template carrying a flow button", async () => {
    getFlowIdMock.mockReturnValue("flow-1");
    getFlowWithTeamsMock.mockResolvedValue({
      survey: { languages: ["en"], teams: [{ id: "stm-1", teamId: "team-1" }] },
    });

    await sendTemplateToPhone(args());

    expect(deleteSessionMock).toHaveBeenCalledWith(ORG_A, "15550001");
    expect(createSessionMock).toHaveBeenCalledWith({
      phone: "15550001",
      orgId: ORG_A,
      surveyTeamMapId: "stm-1",
      language: "en",
    });
  });

  test("refuses a flow template whose flow is not in our database", async () => {
    getFlowIdMock.mockReturnValue("flow-1");
    getFlowWithTeamsMock.mockResolvedValue(null);

    await expect(sendTemplateToPhone(args())).rejects.toThrow("Flow not found in db");
  });

  test("refuses a flow template sent with no team", async () => {
    getFlowIdMock.mockReturnValue("flow-1");
    getFlowWithTeamsMock.mockResolvedValue({ survey: { languages: ["en"], teams: [] } });

    await expect(sendTemplateToPhone(args({ teamId: undefined }))).rejects.toThrow(
      "Team id not found in request",
    );
  });

  test("refuses a flow template whose survey the team cannot reach", async () => {
    getFlowIdMock.mockReturnValue("flow-1");
    getFlowWithTeamsMock.mockResolvedValue({
      survey: { languages: ["en"], teams: [{ id: "stm-1", teamId: "another-team" }] },
    });

    await expect(sendTemplateToPhone(args())).rejects.toThrow("Team not found in survey");
  });

  // NOTE: pins current behaviour. The flow token is
  // the recipient's phone number, which Meta echoes back on every endpoint request
  // and which the session lookup keys off.
  test("uses the recipient's phone number as the flow token", async () => {
    getFlowIdMock.mockReturnValue("flow-1");
    getFlowWithTeamsMock.mockResolvedValue({
      survey: { languages: ["en"], teams: [{ id: "stm-1", teamId: "team-1" }] },
    });

    await sendTemplateToPhone(args());

    const flowButton = createTemplateMessageMock.mock.calls[0][1].components.find(
      (c: any) => c.sub_type === "flow",
    );
    expect(flowButton.parameters[0].action.flow_token).toBe("15550001");
  });

  // NOTE: pins current behaviour. The session is deleted and recreated BEFORE the
  // send, and the send is not guarded — so a template that Meta refuses leaves the
  // customer with a session pointing at a flow they were never sent, and any flow
  // they had open is gone.
  test("has already replaced the customer's session when the send fails", async () => {
    getFlowIdMock.mockReturnValue("flow-1");
    getFlowWithTeamsMock.mockResolvedValue({
      survey: { languages: ["en"], teams: [{ id: "stm-1", teamId: "team-1" }] },
    });
    sendMessageMock.mockRejectedValue(new Error("graph is down"));

    await expect(sendTemplateToPhone(args())).rejects.toThrow("graph is down");
    expect(deleteSessionMock).toHaveBeenCalled();
    expect(createSessionMock).toHaveBeenCalled();
  });
});
