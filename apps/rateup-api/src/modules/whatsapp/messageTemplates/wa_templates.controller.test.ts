import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    contact: { findMany: vi.fn() },
    surveyTeamMap: { findFirst: vi.fn() },
    waMessage: { findFirst: vi.fn() },
    waLogs: { findMany: vi.fn() },
  },
  excludeFields: vi.fn(),
}));
vi.mock("./wa_templates.service.js", () => ({
  createTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  deleteTemplateFromDb: vi.fn(),
  fetchTemplate: vi.fn(),
  getDbTemplate: vi.fn(),
  getTemplateByIdAndOrgId: vi.fn(),
  getTemplateByNameAndOrgId: vi.fn(),
  getTemplatesByOrgIdAndTemplateType: vi.fn(),
  getUnregisteredTemplates: vi.fn(),
  registerTemplatesInDb: vi.fn(),
  saveTemplate: vi.fn(),
  sendTemplateToPhone: vi.fn(),
  syncTemplates: vi.fn(),
  updateTemplate: vi.fn(),
  updateTemplateInDb: vi.fn(),
  uploadFileToWaTemplate: vi.fn(),
}));
vi.mock("./wa_templates.utils.js", () => ({
  generateTemplate: vi.fn(),
  getFlowIdFromTemplateComponents: vi.fn(),
}));
vi.mock("../../user/user.service.js", () => ({ getOrgIdAndRole: vi.fn() }));
vi.mock("../whatsappSurvey/wasurvey.service.js", () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  sendMessage: vi.fn(),
}));
vi.mock("../whatsappSurvey/wasurvey.utils.js", () => ({ createTemplateMessage: vi.fn() }));
vi.mock("../whatsappSurvey/wasurvey.controller.js", () => ({ wait: vi.fn() }));
vi.mock("../flows/flow.service.js", () => ({ getFlowWithSurveyTeamMapIds: vi.fn() }));
vi.mock("../../../utils/upload/s3Upload.js", () => ({ getFileUrlFromKey: vi.fn() }));
vi.mock("../../../utils/upload/validate.js", () => ({ validateFile: vi.fn() }));
vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("../wa_error_handler.js", () => ({
  getGraphApiErrorMessage: vi.fn(),
  handleWhatsappError: vi.fn(),
}));
vi.mock("../../stats/stats.service.js", () => ({ updateMonthlyStat: vi.fn() }));
vi.mock("../automatedReply/wa_automatedReply.utils.js", () => ({
  generateOrderReferenceId: vi.fn(() => "ref-1"),
  sendPaymentInitTemplate: vi.fn(),
}));
vi.mock("../wa_message_scheduler.js", () => ({ createWaMessageSchedule: vi.fn() }));
vi.mock("../../loyalty/util.js", () => ({ parsePhoneforWa: vi.fn((p) => p) }));
vi.mock("../catalog/catalog.service.js", () => ({ getConnectedWaCatalog: vi.fn() }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import {
  createTemplate,
  deleteTemplate,
  deleteTemplateFromDb,
  fetchTemplate,
  getDbTemplate,
  getTemplateByIdAndOrgId,
  getTemplateByNameAndOrgId,
  getTemplatesByOrgIdAndTemplateType,
  getUnregisteredTemplates,
  registerTemplatesInDb,
  saveTemplate,
  sendTemplateToPhone,
  syncTemplates,
  updateTemplate,
  updateTemplateInDb,
  uploadFileToWaTemplate,
} from "./wa_templates.service.js";
import { generateTemplate, getFlowIdFromTemplateComponents } from "./wa_templates.utils.js";
import { getOrgIdAndRole } from "../../user/user.service.js";
import { sendMessage } from "../whatsappSurvey/wasurvey.service.js";
import { createTemplateMessage } from "../whatsappSurvey/wasurvey.utils.js";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload.js";
import { validateFile } from "../../../utils/upload/validate.js";
import { GraphApiError } from "../wa_axios.js";
import { getGraphApiErrorMessage } from "../wa_error_handler.js";
import { sendPaymentInitTemplate } from "../automatedReply/wa_automatedReply.utils.js";
import { createWaMessageSchedule } from "../wa_message_scheduler.js";
import { TemplateType } from "../../../../generated/prisma/client.js";
import {
  createTemplateHandler,
  deleteTemplateHandler,
  getErrorLogsHandler,
  getMessageStatusByIdHandler,
  getTemplateByIdHandler,
  getTemplatesHandler,
  getUnregisteredTemplatesHandler,
  registerTemplatesInDbHandler,
  saveTemplateAsDraftHandler,
  sendTemplatesToContactsHandler,
  sendTemplateToUserCore,
  sendTemplateToUserHandler,
  syncTemplatesHandler,
  updateTemplateHandler,
  uploadHandler,
} from "./wa_templates.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  contact: { findMany: Mock };
  surveyTeamMap: { findFirst: Mock };
  waMessage: { findFirst: Mock };
  waLogs: { findMany: Mock };
};
const m = {
  createTemplate: createTemplate as unknown as Mock,
  createTemplateMessage: createTemplateMessage as unknown as Mock,
  createWaMessageSchedule: createWaMessageSchedule as unknown as Mock,
  deleteTemplate: deleteTemplate as unknown as Mock,
  deleteTemplateFromDb: deleteTemplateFromDb as unknown as Mock,
  fetchTemplate: fetchTemplate as unknown as Mock,
  generateTemplate: generateTemplate as unknown as Mock,
  getDbTemplate: getDbTemplate as unknown as Mock,
  getFileUrlFromKey: getFileUrlFromKey as unknown as Mock,
  getFlowId: getFlowIdFromTemplateComponents as unknown as Mock,
  getGraphApiErrorMessage: getGraphApiErrorMessage as unknown as Mock,
  getOrgIdAndRole: getOrgIdAndRole as unknown as Mock,
  getTemplateByIdAndOrgId: getTemplateByIdAndOrgId as unknown as Mock,
  getTemplateByNameAndOrgId: getTemplateByNameAndOrgId as unknown as Mock,
  getTemplates: getTemplatesByOrgIdAndTemplateType as unknown as Mock,
  getUnregisteredTemplates: getUnregisteredTemplates as unknown as Mock,
  registerTemplatesInDb: registerTemplatesInDb as unknown as Mock,
  saveTemplate: saveTemplate as unknown as Mock,
  sendMessage: sendMessage as unknown as Mock,
  sendPaymentInitTemplate: sendPaymentInitTemplate as unknown as Mock,
  sendTemplateToPhone: sendTemplateToPhone as unknown as Mock,
  syncTemplates: syncTemplates as unknown as Mock,
  updateTemplate: updateTemplate as unknown as Mock,
  updateTemplateInDb: updateTemplateInDb as unknown as Mock,
  uploadFileToWaTemplate: uploadFileToWaTemplate as unknown as Mock,
  validateFile: validateFile as unknown as Mock,
};

const ORG_A = "org-a";
const ORG_B = "org-b";
const TEMPLATE_ID = "tpl-1";

function row(overrides: Record<string, unknown> = {}): any {
  return {
    id: TEMPLATE_ID,
    orgId: ORG_A,
    templateType: TemplateType.GENERAL_NOTIFICATION,
    whatsappSettingsPhoneId: "phone-1",
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

function request(overrides: Record<string, unknown> = {}): any {
  return {
    user: { orgId: ORG_A, userId: "user-1", role: "ADMIN" },
    userId: "user-1",
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
}

function reply() {
  const rep: any = { code: vi.fn(() => rep), status: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function sent(rep: any, index = 0) {
  return rep.send.mock.calls[index][0];
}

/** The template query handed to the most recent createTemplateMessage call. */
function templateQuery() {
  return m.createTemplateMessage.mock.calls.at(-1)![1];
}

beforeEach(() => {
  vi.clearAllMocks();
  m.getOrgIdAndRole.mockResolvedValue({ orgId: ORG_A, role: "SUPER_ADMIN" });
  m.getTemplates.mockResolvedValue([row()]);
  m.getTemplateByIdAndOrgId.mockResolvedValue(row());
  m.getTemplateByNameAndOrgId.mockResolvedValue(row());
  m.getDbTemplate.mockResolvedValue(row());
  m.generateTemplate.mockReturnValue({ name: "order_update", components: [] });
  m.createTemplate.mockResolvedValue({ name: "order_update", id: "wa-tpl-1" });
  m.fetchTemplate.mockResolvedValue({ id: "wa-tpl-1", name: "order_update" });
  m.saveTemplate.mockResolvedValue(row());
  m.updateTemplate.mockResolvedValue(row());
  m.updateTemplateInDb.mockResolvedValue(row());
  m.deleteTemplate.mockResolvedValue(true);
  m.deleteTemplateFromDb.mockResolvedValue(row());
  m.syncTemplates.mockResolvedValue({ success: true, created: 1, updated: 0 });
  m.getUnregisteredTemplates.mockResolvedValue([]);
  m.registerTemplatesInDb.mockResolvedValue(undefined);
  m.uploadFileToWaTemplate.mockResolvedValue({ fileHandle: "handle-1", uploadSessionId: "up-1" });
  m.validateFile.mockReturnValue({ valid: true });
  m.getFlowId.mockReturnValue(undefined);
  m.createTemplateMessage.mockReturnValue({ type: "template" });
  m.sendMessage.mockResolvedValue({ id: "msg-1" });
  m.sendTemplateToPhone.mockResolvedValue(undefined);
  m.getFileUrlFromKey.mockImplementation((k: string) => `https://cdn/${k}`);
  m.getGraphApiErrorMessage.mockReturnValue("Meta says no");
  db.contact.findMany.mockResolvedValue([{ id: "c-1", phone: "15550001" }]);
  db.waMessage.findFirst.mockResolvedValue(null);
  db.waLogs.findMany.mockResolvedValue([]);
});

describe("listing and reading templates", () => {
  test("lists the org's templates, optionally narrowed by type", async () => {
    const rep = reply();

    await getTemplatesHandler(request({ query: { templateType: TemplateType.LOYALTY } }), rep);

    expect(m.getTemplates).toHaveBeenCalledWith(ORG_A, TemplateType.LOYALTY);
    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("returns one template, scoped to the caller's org", async () => {
    const rep = reply();

    await getTemplateByIdHandler(request({ params: { templateId: TEMPLATE_ID } }), rep);

    expect(m.getTemplateByIdAndOrgId).toHaveBeenCalledWith(TEMPLATE_ID, ORG_A);
    expect(sent(rep)).toEqual(row());
  });
});

describe("createTemplateHandler", () => {
  const body = { name: "order_update", body: "hi", language: "en" };

  test("creates an approved template at Meta and stores what Meta returned", async () => {
    const rep = reply();

    await createTemplateHandler(
      request({ body: { ...body, templateType: TemplateType.GENERAL_NOTIFICATION } }),
      rep,
    );

    expect(m.createTemplate).toHaveBeenCalled();
    expect(m.fetchTemplate).toHaveBeenCalledWith("order_update", ORG_A, undefined);
    expect(m.saveTemplate.mock.calls[0][0]).toEqual({ id: "wa-tpl-1", name: "order_update" });
    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("keeps an order-details template local and pre-approved", async () => {
    await createTemplateHandler(
      request({ body: { ...body, templateType: TemplateType.ORDER_DETAILS } }),
      reply(),
    );

    expect(m.createTemplate).not.toHaveBeenCalled();
    expect(m.saveTemplate.mock.calls[0][0]).toMatchObject({
      status: "APPROVED",
      id: "localTemplate",
    });
  });

  test("keeps only the body of a payment-confirmation template", async () => {
    m.generateTemplate.mockReturnValue({
      name: "n",
      components: [
        { type: "body", text: "hi" },
        { type: "buttons", buttons: [] },
      ],
    });

    await createTemplateHandler(
      request({ body: { ...body, templateType: TemplateType.PAYMENT_CONFIRMATION } }),
      reply(),
    );

    expect(m.saveTemplate.mock.calls[0][0].components).toEqual([{ type: "body", text: "hi" }]);
  });

  test("updates in place when the request names an existing template", async () => {
    await createTemplateHandler(
      request({ body: { ...body, id: TEMPLATE_ID, templateType: TemplateType.ORDER_DETAILS } }),
      reply(),
    );

    expect(m.updateTemplateInDb.mock.calls[0][0]).toBe(TEMPLATE_ID);
    expect(m.saveTemplate).not.toHaveBeenCalled();
  });

  test("reports Meta's own words when Meta refuses", async () => {
    m.createTemplate.mockRejectedValue(new GraphApiError("boom" as any));
    const rep = reply();

    await createTemplateHandler(
      request({ body: { ...body, templateType: TemplateType.GENERAL_NOTIFICATION } }),
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(500);
    expect(sent(rep)).toBe("Meta says no");
  });

  test("refuses a request with no template type, storing nothing", async () => {
    const rep = reply();

    await createTemplateHandler(request({ body }), rep);

    expect(m.saveTemplate).not.toHaveBeenCalled();
    expect(rep.code).toHaveBeenCalledWith(400);
    expect(sent(rep).message).toContain("templateType");
  });

  test("lets any role create a template", async () => {
    const rep = reply();

    await createTemplateHandler(
      request({
        user: { orgId: ORG_A, userId: "user-1", role: "AGENT" },
        body: { ...body, templateType: TemplateType.ORDER_DETAILS },
      }),
      rep,
    );

    expect(m.getOrgIdAndRole).not.toHaveBeenCalled();
    expect(rep.code).toHaveBeenCalledWith(200);
  });
});

describe("saveTemplateAsDraftHandler", () => {
  test("stores a new draft against the org", async () => {
    await saveTemplateAsDraftHandler(request({ body: { name: "n", body: "hi" } }), reply());

    expect(m.saveTemplate.mock.calls[0][0].status).toBe("DRAFT");
    expect(m.saveTemplate.mock.calls[0][1]).toBe(ORG_A);
  });

  test("rewrites an existing draft in place", async () => {
    m.generateTemplate.mockReturnValue({
      name: "n",
      components: [{ type: "body" }],
      language: "en",
    });

    await saveTemplateAsDraftHandler(
      request({ body: { id: TEMPLATE_ID, name: "renamed", body: "hi" } }),
      reply(),
    );

    expect(m.updateTemplateInDb.mock.calls[0][1]).toBe(ORG_A);
    expect(m.updateTemplateInDb.mock.calls[0][2]).toMatchObject({
      name: "renamed",
      status: "DRAFT",
      components: [{ type: "body" }],
    });
  });

  test("rewrites a draft belonging to another org", async () => {
    m.getDbTemplate.mockResolvedValue(row({ orgId: ORG_B }));

    await saveTemplateAsDraftHandler(
      request({ body: { id: TEMPLATE_ID, name: "taken over", body: "hi" } }),
      reply(),
    );

    expect(m.updateTemplateInDb).toHaveBeenCalled();
    expect(m.updateTemplateInDb.mock.calls[0][0]).toBe(TEMPLATE_ID);
  });

  test("sets a status but sends no body on success", async () => {
    const rep = reply();

    await saveTemplateAsDraftHandler(request({ body: { name: "n", body: "hi" } }), rep);

    expect(rep.code).toHaveBeenCalledWith(200);
    expect(rep.send).not.toHaveBeenCalled();
  });
});

describe("updateTemplateHandler", () => {
  test("updates a template the caller's org owns", async () => {
    const rep = reply();

    await updateTemplateHandler(request({ params: { templateId: TEMPLATE_ID }, body: {} }), rep);

    expect(m.updateTemplate).toHaveBeenCalledWith(TEMPLATE_ID, ORG_A, {});
    expect(rep.status).toHaveBeenCalledWith(200);
  });

  test("answers 404 for a template that does not exist", async () => {
    m.getDbTemplate.mockResolvedValue(null);
    const rep = reply();

    await updateTemplateHandler(request({ params: { templateId: TEMPLATE_ID }, body: {} }), rep);

    expect(rep.status).toHaveBeenCalledWith(404);
    expect(m.updateTemplate).not.toHaveBeenCalled();
  });

  test("refuses a template belonging to another org", async () => {
    m.getDbTemplate.mockResolvedValue(null);
    const rep = reply();

    await updateTemplateHandler(request({ params: { templateId: TEMPLATE_ID }, body: {} }), rep);

    expect(rep.status).toHaveBeenCalledWith(404);
    expect(m.updateTemplate).not.toHaveBeenCalled();
  });

  test("blames the 24-hour cooldown for every kind of failure", async () => {
    m.updateTemplate.mockResolvedValue(undefined);
    const rep = reply();

    await updateTemplateHandler(request({ params: { templateId: TEMPLATE_ID }, body: {} }), rep);

    expect(rep.status).toHaveBeenCalledWith(400);
    expect(sent(rep)).toBe("You can only edit an active template once in 24 hours.");
  });
});

describe("deleteTemplateHandler", () => {
  test("deletes at Meta and then in our database", async () => {
    const rep = reply();

    await deleteTemplateHandler(request({ params: { templateId: TEMPLATE_ID } }), rep);

    expect(m.deleteTemplate).toHaveBeenCalledWith(ORG_A, "wa-tpl-1", "order_update");
    expect(m.deleteTemplateFromDb).toHaveBeenCalledWith(TEMPLATE_ID, ORG_A);
    expect(rep.code).toHaveBeenCalledWith(204);
  });

  test("skips Meta for a template that only ever lived locally", async () => {
    m.getDbTemplate.mockResolvedValue(row({ data: { name: "n", components: [] } }));

    await deleteTemplateHandler(request({ params: { templateId: TEMPLATE_ID } }), reply());

    expect(m.deleteTemplate).not.toHaveBeenCalled();
    expect(m.deleteTemplateFromDb).toHaveBeenCalled();
  });

  test("refuses a template belonging to another org", async () => {
    m.getDbTemplate.mockResolvedValue(null);
    const rep = reply();

    await deleteTemplateHandler(request({ params: { templateId: TEMPLATE_ID } }), rep);

    expect(rep.code).toHaveBeenCalledWith(404);
    expect(m.deleteTemplateFromDb).not.toHaveBeenCalled();
  });

  test("answers 404 for a template that does not exist", async () => {
    m.getDbTemplate.mockResolvedValue(null);
    const rep = reply();

    await deleteTemplateHandler(request({ params: { templateId: TEMPLATE_ID } }), rep);

    // Now guarded explicitly, so a missing template is a 404 rather than a 500 derived
    // from crashing on the null result.
    expect(rep.code).toHaveBeenCalledWith(404);
  });

  test("keeps our copy when Meta refused to delete its own", async () => {
    m.deleteTemplate.mockResolvedValue(false);
    const rep = reply();

    await deleteTemplateHandler(request({ params: { templateId: TEMPLATE_ID } }), rep);

    expect(m.deleteTemplateFromDb).not.toHaveBeenCalled();
    expect(rep.code).toHaveBeenCalledWith(502);
  });
});

describe("syncTemplatesHandler", () => {
  test("syncs the numbers the caller named", async () => {
    const rep = reply();

    await syncTemplatesHandler(request({ body: { whatsappSettingsPhoneIds: ["phone-1"] } }), rep);

    expect(m.syncTemplates).toHaveBeenCalledWith(ORG_A, ["phone-1"]);
    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("refuses anyone below admin", async () => {
    m.getOrgIdAndRole.mockResolvedValue({ orgId: ORG_A, role: "AGENT" });
    const rep = reply();

    await syncTemplatesHandler(request({ body: { whatsappSettingsPhoneIds: [] } }), rep);

    expect(rep.code).toHaveBeenCalledWith(403);
    expect(m.syncTemplates).not.toHaveBeenCalled();
  });

  test("answers 500 when the sync reports failure", async () => {
    m.syncTemplates.mockResolvedValue({ success: false, created: 0, updated: 0 });
    const rep = reply();

    await syncTemplatesHandler(request({ body: { whatsappSettingsPhoneIds: [] } }), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
  });
});

describe("the unregistered/register pair", () => {
  test("lists the templates Meta holds that we have not imported", async () => {
    m.getUnregisteredTemplates.mockResolvedValue([{ id: "wa-tpl-9" }]);
    const rep = reply();

    await getUnregisteredTemplatesHandler(request(), rep);

    expect(sent(rep)).toEqual([{ id: "wa-tpl-9" }]);
  });

  test("registers the templates the caller sent against their org", async () => {
    const body = [{ data: { name: "n" }, acceptButton: "Yes" }];

    await registerTemplatesInDbHandler(request({ body }), reply());

    expect(m.registerTemplatesInDb).toHaveBeenCalledWith(body, ORG_A);
  });

  test("answers 500 when registering fails", async () => {
    m.registerTemplatesInDb.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await registerTemplatesInDbHandler(request({ body: [] }), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
  });
});

describe("uploadHandler", () => {
  function fileRequest(fields: Record<string, unknown> = { size: { value: 1024 } }) {
    return request({
      file: vi.fn().mockResolvedValue({
        filename: "banner.png",
        mimetype: "image/png",
        fields,
        file: { resume: vi.fn() },
        // The handler measures the real length from the received bytes.
        toBuffer: vi.fn().mockResolvedValue(Buffer.alloc(2048)),
      }),
    });
  }

  test("returns the Meta file handle for an accepted upload", async () => {
    const rep = reply();

    await uploadHandler(fileRequest(), rep);

    expect(sent(rep)).toEqual({ id: "handle-1", uploadSessionId: "up-1" });
    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("refuses a file the validator rejected, and drains it", async () => {
    m.validateFile.mockReturnValue({ valid: false, message: "File type not allowed" });
    const rep = reply();

    await uploadHandler(fileRequest(), rep);

    expect(rep.code).toHaveBeenCalledWith(400);
    expect(m.uploadFileToWaTemplate).not.toHaveBeenCalled();
  });

  test("reports a failed upload as a bad request", async () => {
    m.uploadFileToWaTemplate.mockResolvedValue({ fileHandle: "error", uploadSessionId: "up-1" });
    const rep = reply();

    await uploadHandler(fileRequest(), rep);

    expect(rep.code).toHaveBeenCalledWith(400);
  });

  test("measures the size from the bytes received, not from the client", async () => {
    await uploadHandler(fileRequest({ size: { type: "field", value: "999999" } }), reply());

    expect(m.uploadFileToWaTemplate.mock.calls[0][1]).toBe(2048);
  });
});

describe("sendTemplateToUserCore - what it sends", () => {
  test("sends the template under its own name and language", async () => {
    await sendTemplateToUserCore(ORG_A, TEMPLATE_ID, "15550001", []);

    expect(templateQuery()).toMatchObject({ name: "order_update", language: { code: "en" } });
    expect(m.sendMessage).toHaveBeenCalled();
  });

  test("looks the template up by name when told to", async () => {
    await sendTemplateToUserCore(
      ORG_A,
      "order_update",
      "15550001",
      [],
      undefined,
      undefined,
      undefined,
      true,
    );

    expect(m.getTemplateByNameAndOrgId).toHaveBeenCalledWith("order_update", ORG_A);
  });

  test("reports a missing template by name rather than throwing", async () => {
    m.getTemplateByNameAndOrgId.mockResolvedValue(null);

    await expect(
      sendTemplateToUserCore(ORG_A, "nope", "15550001", [], undefined, undefined, undefined, true),
    ).resolves.toEqual({ status: false, message: "Template not found with name" });
  });

  test("schedules rather than sends when a delay is given", async () => {
    m.createWaMessageSchedule.mockResolvedValue({ id: "sched-1" });

    await sendTemplateToUserCore(ORG_A, TEMPLATE_ID, "15550001", [], "team-1", "user-1", 60);

    expect(m.createWaMessageSchedule).toHaveBeenCalled();
    expect(m.sendMessage).not.toHaveBeenCalled();
  });

  test("routes an order-details template through the payment builder", async () => {
    m.getTemplateByIdAndOrgId.mockResolvedValue(row({ templateType: TemplateType.ORDER_DETAILS }));
    m.sendPaymentInitTemplate.mockResolvedValue({ type: "template" });

    await sendTemplateToUserCore(ORG_A, TEMPLATE_ID, "15550001", []);

    expect(m.sendPaymentInitTemplate).toHaveBeenCalled();
    expect(m.createTemplateMessage).not.toHaveBeenCalled();
  });

  test("fills a body's blank parameters from the template's own examples", async () => {
    m.getTemplateByIdAndOrgId.mockResolvedValue(
      row({
        data: {
          ...row().data,
          components: [{ type: "BODY", example: { body_text: [["Ada", "tomorrow"]] } }],
        },
      }),
    );

    await sendTemplateToUserCore(ORG_A, TEMPLATE_ID, "15550001", [
      { type: "body", parameters: [{ type: "text", text: "" }] },
    ] as any);

    expect(templateQuery().components[0].parameters).toEqual([
      { type: "text", text: "Ada" },
      { type: "text", text: "tomorrow" },
    ]);
  });

  test("drops a body component from a template that takes no variables", async () => {
    await sendTemplateToUserCore(ORG_A, TEMPLATE_ID, "15550001", [
      { type: "body", parameters: [] },
    ] as any);

    expect(templateQuery().components).toEqual([]);
  });

  test("reports a failure for a template id the caller's org does not own", async () => {
    m.getTemplateByIdAndOrgId.mockResolvedValue(null);

    await expect(sendTemplateToUserCore(ORG_A, TEMPLATE_ID, "15550001", [])).resolves.toEqual({
      status: false,
      message: "Template not found with id",
    });
  });
});

describe("sendTemplateToUserCore - the order-details total", () => {
  function orderTemplate(orderDetails: Record<string, unknown>) {
    return row({
      templateType: TemplateType.GENERAL_NOTIFICATION,
      defaultValues: { orderDetails },
      data: {
        ...row().data,
        components: [{ type: "BUTTONS", buttons: [{ type: "ORDER_DETAILS" }] }],
      },
    });
  }

  const ORDER = {
    productType: "digital-goods",
    paymentType: "upi",
    paymentConfigName: "cfg",
    item: { price: "100", quantity: "2", name: "Widget" },
    shipping: "20",
    tax: "30",
  };

  async function sendOrder(orderDetails: Record<string, unknown> = ORDER) {
    m.getTemplateByIdAndOrgId.mockResolvedValue(orderTemplate(orderDetails));
    await sendTemplateToUserCore(ORG_A, TEMPLATE_ID, "15550001", []);
    return templateQuery().components.find((c: any) => c.sub_type === "order_details").parameters[0]
      .action.order_details;
  }

  test("states every line item in the smallest currency unit", async () => {
    const details = await sendOrder();

    expect(details.order.sub_total).toEqual({ offset: 100, value: 20000 });
    expect(details.order.shipping).toEqual({ offset: 100, value: 2000 });
    expect(details.order.items[0].amount).toEqual({ offset: 100, value: 10000 });
  });

  test("gives the order a fresh reference and a pending status", async () => {
    const details = await sendOrder();

    expect(details.reference_id).toBe("ref-1");
    expect(details.order.status).toBe("pending");
  });

  test("attaches a shipping address block only for physical goods", async () => {
    expect(await sendOrder()).not.toHaveProperty("shipping_info");
    expect(await sendOrder({ ...ORDER, productType: "physical-goods" })).toHaveProperty(
      "shipping_info",
    );
  });

  test("sends the grand total in the same minor units as its line items", async () => {
    const details = await sendOrder();

    expect(details.total_amount).toEqual({ offset: 100, value: 25000 });
    expect(details.order.sub_total.value).toBe(20000);
  });

  test("sends the tax description under the name Meta expects", async () => {
    const details = await sendOrder();

    expect(details.order.tax).toHaveProperty("description");
    expect(details.order.tax).not.toHaveProperty("discription");
  });

  test("hard-codes the currency and country to India", async () => {
    const details = await sendOrder({ ...ORDER, productType: "physical-goods" });

    expect(details.currency).toBe("INR");
    expect(details.shipping_info.country).toBe("IN");
    expect(details.order.items[0].importer_address.country_code).toBe("IN");
  });
});

describe("sendTemplateToUserHandler", () => {
  test("sends the template and reports success", async () => {
    const rep = reply();

    await sendTemplateToUserHandler(
      request({
        params: { templateId: TEMPLATE_ID },
        body: { phone: "15550001", parameterData: [], teamId: "team-1" },
      }),
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("reports the reason when the send fails", async () => {
    m.getTemplateByIdAndOrgId.mockResolvedValue(null);
    const rep = reply();

    await sendTemplateToUserHandler(
      request({
        params: { templateId: TEMPLATE_ID },
        body: { phone: "15550001", parameterData: [] },
      }),
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(400);
  });
});

describe("sendTemplatesToContactsHandler", () => {
  test("sends the template to each contact named", async () => {
    db.contact.findMany.mockResolvedValue([
      { id: "c-1", phone: "15550001" },
      { id: "c-2", phone: "15550002" },
    ]);

    await sendTemplatesToContactsHandler(
      request({
        params: { templateId: TEMPLATE_ID },
        body: { contactIds: ["c-1", "c-2"], teamId: "team-1" },
      }),
      reply(),
    );

    expect(m.sendTemplateToPhone).toHaveBeenCalledTimes(2);
    expect(m.sendTemplateToPhone.mock.calls[0][0].phone).toBe("15550001");
  });

  test("reports the contacts it could not reach, rather than failing outright", async () => {
    m.sendTemplateToPhone.mockRejectedValue(new Error("graph is down"));
    const rep = reply();

    await sendTemplatesToContactsHandler(
      request({ params: { templateId: TEMPLATE_ID }, body: { contactIds: ["c-1"] } }),
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(200);
    expect(sent(rep)).toMatchObject({ sent: 0, failed: ["c-1"] });
  });

  test("cannot send to contacts belonging to another org", async () => {
    db.contact.findMany.mockResolvedValue([]);
    const rep = reply();

    await sendTemplatesToContactsHandler(
      request({ params: { templateId: TEMPLATE_ID }, body: { contactIds: ["another-orgs-id"] } }),
      rep,
    );

    expect(db.contact.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ["another-orgs-id"] },
      orgId: ORG_A,
    });
    expect(m.sendTemplateToPhone).not.toHaveBeenCalled();
    expect(sent(rep)).toMatchObject({ sent: 0, skipped: 1 });
  });

  test("reports how many contacts it reached", async () => {
    const rep = reply();

    await sendTemplatesToContactsHandler(
      request({ params: { templateId: TEMPLATE_ID }, body: { contactIds: ["c-1"] } }),
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(200);
    expect(sent(rep)).toEqual({ sent: 1, failed: [], skipped: 0 });
  });
});

describe("getMessageStatusByIdHandler", () => {
  test("reports the furthest state the message reached", async () => {
    db.waMessage.findFirst.mockResolvedValue({
      messageId: "wamid-1",
      stats: { sent: "t", delivered: "t", read: "t" },
    });
    const rep = reply();

    await getMessageStatusByIdHandler(request({ params: { messageId: "wamid-1" } }), rep);

    expect(sent(rep)).toEqual({ messageId: "wamid-1", status: "read" });
  });

  test("reports pending for a message with no state recorded yet", async () => {
    db.waMessage.findFirst.mockResolvedValue({ messageId: "wamid-1", stats: {} });
    const rep = reply();

    await getMessageStatusByIdHandler(request({ params: { messageId: "wamid-1" } }), rep);

    expect(sent(rep).status).toBe("pending");
  });

  test("includes the reason for a failed message", async () => {
    db.waMessage.findFirst.mockResolvedValue({
      messageId: "wamid-1",
      stats: { failed: "t" },
      errorMessage: "invalid number",
    });
    const rep = reply();

    await getMessageStatusByIdHandler(request({ params: { messageId: "wamid-1" } }), rep);

    expect(sent(rep)).toEqual({
      messageId: "wamid-1",
      status: "failed",
      errorMessage: "invalid number",
    });
  });

  test("answers 404 for a message id we hold nothing for", async () => {
    const rep = reply();

    await getMessageStatusByIdHandler(request({ params: { messageId: "nope" } }), rep);

    expect(rep.code).toHaveBeenCalledWith(404);
  });

  test("scopes the lookup to the caller's org", async () => {
    db.waMessage.findFirst.mockResolvedValue(null);
    const rep = reply();

    await getMessageStatusByIdHandler(
      request({ user: { orgId: ORG_B }, params: { messageId: "wamid-1" } }),
      rep,
    );

    expect(db.waMessage.findFirst.mock.calls[0][0].where).toEqual({
      messageId: "wamid-1",
      orgId: ORG_B,
    });
    expect(rep.code).toHaveBeenCalledWith(404);
  });

  test("reports the failure of a message that was delivered first", async () => {
    db.waMessage.findFirst.mockResolvedValue({
      messageId: "wamid-1",
      stats: { delivered: "t", failed: "t" },
      errorMessage: "later rejected",
    });
    const rep = reply();

    await getMessageStatusByIdHandler(request({ params: { messageId: "wamid-1" } }), rep);

    expect(sent(rep).status).toBe("failed");
  });
});

describe("getErrorLogsHandler", () => {
  test("returns the org's logs, newest first, without leaking the org id", async () => {
    const rep = reply();

    await getErrorLogsHandler(request({ query: {} }), rep);

    const call = db.waLogs.findMany.mock.calls[0][0];
    expect(call.where.orgId).toBe(ORG_A);
    expect(call.orderBy).toEqual({ createdAt: "desc" });
    expect(call.omit).toEqual({ orgId: true });
  });

  test("narrows to the date range the caller asked for", async () => {
    await getErrorLogsHandler(
      request({ query: { startDate: "2026-01-01", endDate: "2026-02-01" } }),
      reply(),
    );

    expect(db.waLogs.findMany.mock.calls[0][0].where.createdAt).toEqual({
      gte: new Date("2026-01-01"),
      lte: new Date("2026-02-01"),
    });
  });

  test("answers 500 when the logs cannot be read", async () => {
    db.waLogs.findMany.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await getErrorLogsHandler(request({ query: {} }), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
  });
});
