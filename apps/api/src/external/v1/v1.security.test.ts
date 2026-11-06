import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";
import type { FastifyReply } from "fastify";

/**
 * The security fixes v1 carries on top of its original behaviour: org scoping of every id a
 * request names, before anything is read, written or sent. The dashboard handlers v1
 * delegates to are mocked, so "refused" means "never reached".
 */

const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  survey: { findMany: vi.fn() },
  waMessage: { findFirst: vi.fn() },
  team: { findFirst: vi.fn() },
  contact: { findMany: vi.fn() },
  contactLabel: { findMany: vi.fn() },
  contactGroup: { findMany: vi.fn() },
  lifecycle: { findMany: vi.fn() },
  contactCustomField: { findMany: vi.fn() },
  orgMember: { findMany: vi.fn() },
  waTemplate: { count: vi.fn() },
}));
vi.mock("../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn(), debug: vi.fn() },
}));

const dashboard = vi.hoisted(() => ({
  createContactHandler: vi.fn(),
  createMultipleContactsHandler: vi.fn(),
  updateContactByIdHandler: vi.fn(),
  addNewContactsToGroupHandler: vi.fn(),
  createCampaignHandler: vi.fn(),
  sendTemplateToUserCore: vi.fn(),
  getTemplateByIdAndOrgId: vi.fn(),
  sendTemplateToPhone: vi.fn(),
}));
vi.mock("../../modules/contact/contact.controller.js", () => ({
  createContactHandler: dashboard.createContactHandler,
  createMultipleContactsHandler: dashboard.createMultipleContactsHandler,
  updateContactByIdHandler: dashboard.updateContactByIdHandler,
  deleteContactByIdHandler: vi.fn(),
  getAllContactsHandler: vi.fn(),
  getContactByIdHandler: vi.fn(),
}));
vi.mock("../../modules/contact/contactGroup/contactGroup.controller.js", () => ({
  addExistingContactsToGroupHandler: vi.fn(),
  addNewContactsToGroupHandler: dashboard.addNewContactsToGroupHandler,
  createContactGroupHandler: vi.fn(),
  deleteContactGroupHandler: vi.fn(),
  getContactGroupsHandler: vi.fn(),
  getContactsByContactGroupIdHandler: vi.fn(),
  removeContactsFromGroupHandler: vi.fn(),
  updateContactGroupHandler: vi.fn(),
}));
vi.mock("../../modules/campaign/campaign.controller.js", () => ({
  createCampaignHandler: dashboard.createCampaignHandler,
  deleteCampaignByIdHandler: vi.fn(),
  getCampaignsHandler: vi.fn(),
  getResponseByCampaignByIdHandler: vi.fn(),
  sendCampaignHandler: vi.fn(),
}));
vi.mock("../../modules/campaign/campaignParticipants/campaignParticipants.controller.js", () => ({
  createCampaignParticipantsFromContactsHandler: vi.fn(),
  getCampaignParticipantsByCampaignIdHandler: vi.fn(),
}));
vi.mock("../../modules/whatsapp/messageTemplates/wa_templates.controller.js", () => ({
  sendTemplateToUserCore: dashboard.sendTemplateToUserCore,
}));
vi.mock("../../modules/whatsapp/messageTemplates/wa_templates.service.js", () => ({
  getTemplateByIdAndOrgId: dashboard.getTemplateByIdAndOrgId,
  getTemplatesByOrgIdAndTemplateType: vi.fn(),
}));
vi.mock("../../modules/whatsapp/settings/wa_settings.service.js", () => ({
  getWaSettings: vi.fn(),
}));
vi.mock("../../modules/whatsapp/wa_axios.js", () => ({ callMetaApi: vi.fn() }));
vi.mock("./wa-templates/sendTemplateToPhone.js", () => ({
  sendTemplateToPhone: dashboard.sendTemplateToPhone,
}));

import { getResponsesBySurveyId } from "./surveys/surveys.external.service.js";
import {
  getMessageStatusByIdExternalController,
  sendTemplateByNameToPhoneExternalController,
  sendTemplateByNameToPhoneWithFileExternalController,
  sendTemplatesToContactsExternalController,
} from "./wa-templates/wa_templates.external.controller.js";
import {
  createContactsExternalController,
  updateContactByIdExternalController,
} from "./contacts/contacts.external.controller.js";
import { addNewContactsToGroupExternalController } from "./contact-groups/contact-groups.external.controller.js";
import { createCampaignExternalController } from "./campaigns/campaigns.external.controller.js";

const ORG = "11111111-1111-4111-8111-111111111111";
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function fakeReply() {
  const reply = {
    statusCode: 200,
    body: undefined as unknown,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    status: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    send: vi.fn((b?: unknown) => {
      reply.body = b;
      return reply;
    }),
  };
  return reply;
}
const asReply = (r: ReturnType<typeof fakeReply>) => r as unknown as FastifyReply;
// The controllers take FastifyRequest generics; a plain object stands in for one.
const req = (r: Record<string, unknown>): any => ({ user: { orgId: ORG, userId: "u-1" }, ...r });

/** Every lookup answers "all of these are the org's" unless a test says otherwise. */
function ownEverything() {
  const echo = ({ where }: { where: { id?: { in: string[] }; userId?: { in: string[] } } }) =>
    Promise.resolve((where.id?.in ?? where.userId?.in ?? []).map((id) => ({ id, userId: id })));
  for (const m of [db.contactLabel, db.contactGroup, db.lifecycle, db.contactCustomField])
    (m.findMany as Mock).mockImplementation(echo);
  db.orgMember.findMany.mockImplementation(echo);
  db.team.findFirst.mockResolvedValue({ id: "team" });
  db.waTemplate.count.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
    Promise.resolve(where.id.in.length),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ownEverything();
});

describe("a. survey responses are scoped to the key's org", () => {
  test("the query filters on the survey's org and has no WaFlow join", async () => {
    db.$queryRaw.mockResolvedValue([]);
    await getResponsesBySurveyId(ID(9), ORG);

    const [strings, ...values] = db.$queryRaw.mock.calls[0]!;
    const sql = (strings as string[]).join("?");
    expect(sql).toMatch(/s\."orgId"\s*=\s*\?::uuid/);
    expect(sql).not.toMatch(/WaFlow/);
    expect(values).toEqual([ID(9), ORG]);
  });

  test("keeps v1's response shape", async () => {
    db.$queryRaw.mockResolvedValue([
      {
        id: "r1",
        createdAt: new Date(0),
        tag: null,
        phone: "91",
        language: "en",
        teamId: "t1",
        surveyTeamMapId: "stm",
        questions: [{ id: "q1", title: { en: "How was it?" }, description: {} }],
        responses: [{ questionId: "q1", response: { rating: 5 }, type: "rating" }],
      },
    ]);
    const [row] = await getResponsesBySurveyId(ID(9), ORG);
    expect(row).toEqual({
      id: "r1",
      createdAt: new Date(0),
      tag: null,
      phone: "91",
      language: "en",
      teamId: "t1",
      responses: [{ type: "rating", response: 5, title: "How was it?" }],
    });
  });
});

describe("b. message status is scoped to the key's org", () => {
  test("looks the message up through its org mapping or contact", async () => {
    db.waMessage.findFirst.mockResolvedValue({
      messageId: "wamid.1",
      stats: { sent: "x", delivered: "y" },
      errorMessage: null,
    });
    const reply = fakeReply();
    await getMessageStatusByIdExternalController(
      req({ params: { messageId: "wamid.1" } }),
      asReply(reply),
    );
    expect(db.waMessage.findFirst.mock.calls[0]![0].where).toEqual({
      messageId: "wamid.1",
      OR: [{ waMessageOrgTeamMaps: { some: { orgId: ORG } } }, { contact: { orgId: ORG } }],
    });
    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({ messageId: "wamid.1", status: "delivered" });
  });

  test("another org's message answers as an unknown one", async () => {
    db.waMessage.findFirst.mockResolvedValue(null);
    const reply = fakeReply();
    await getMessageStatusByIdExternalController(
      req({ params: { messageId: "wamid.other" } }),
      asReply(reply),
    );
    expect(reply.statusCode).toBe(404);
    expect(reply.body).toEqual({ message: "Message not found" });
  });
});

describe("c. template sends refuse another org's team", () => {
  const foreignTeam = { statusCode: 404, code: "FST_ERR_NOT_FOUND", error: "Not Found" };

  test("POST /send", async () => {
    db.team.findFirst.mockResolvedValue(null);
    const reply = fakeReply();
    await sendTemplateByNameToPhoneExternalController(
      req({ body: { templateName: "hello", phone: 919876543210, teamId: ID(5) } }),
      asReply(reply),
    );
    expect(db.team.findFirst.mock.calls[0]![0].where).toEqual({ id: ID(5), orgId: ORG });
    expect(reply.statusCode).toBe(404);
    expect(reply.body).toMatchObject({ ...foreignTeam, message: "Team not found" });
    expect(dashboard.sendTemplateToUserCore).not.toHaveBeenCalled();
  });

  test("POST /send without a teamId still sends", async () => {
    dashboard.sendTemplateToUserCore.mockResolvedValue({ status: true, message: "ok" });
    const reply = fakeReply();
    await sendTemplateByNameToPhoneExternalController(
      req({ body: { templateName: "hello", phone: 919876543210 } }),
      asReply(reply),
    );
    expect(db.team.findFirst).not.toHaveBeenCalled();
    expect(reply.statusCode).toBe(200);
    expect(dashboard.sendTemplateToUserCore).toHaveBeenCalledOnce();
  });

  test("POST /send-with-file", async () => {
    db.team.findFirst.mockResolvedValue(null);
    const reply = fakeReply();
    await sendTemplateByNameToPhoneWithFileExternalController(
      req({ body: { templateName: "hello", phone: 919876543210, teamId: ID(5) } }),
      asReply(reply),
    );
    expect(reply.statusCode).toBe(404);
    expect(reply.body).toMatchObject({ ...foreignTeam, message: "Team not found" });
    expect(dashboard.sendTemplateToUserCore).not.toHaveBeenCalled();
  });

  test("POST /:templateId/send/contacts", async () => {
    dashboard.getTemplateByIdAndOrgId.mockResolvedValue({ id: "tpl" });
    db.team.findFirst.mockResolvedValue(null);
    const reply = fakeReply();
    await sendTemplatesToContactsExternalController(
      req({ params: { templateId: "tpl" }, body: { contactIds: [ID(1)], teamId: ID(5) } }),
      asReply(reply),
    );
    expect(reply.statusCode).toBe(404);
    expect(reply.body).toEqual({ message: "Team not found" });
    expect(dashboard.sendTemplateToPhone).not.toHaveBeenCalled();
  });

  test("send-to-contacts reaches only the org's contacts", async () => {
    dashboard.getTemplateByIdAndOrgId.mockResolvedValue({ id: "tpl" });
    db.contact.findMany.mockResolvedValue([{ id: ID(1), phone: "919876543210" }]);
    const reply = fakeReply();
    await sendTemplatesToContactsExternalController(
      req({ params: { templateId: "tpl" }, body: { contactIds: [ID(1), ID(2)] } }),
      asReply(reply),
    );
    expect(db.contact.findMany.mock.calls[0]![0].where).toEqual({
      id: { in: [ID(1), ID(2)] },
      orgId: ORG,
    });
    expect(dashboard.getTemplateByIdAndOrgId).toHaveBeenCalledWith("tpl", ORG);
    expect(reply.body).toEqual({ sent: 1, failed: [], skipped: 1 });
  });
});

describe("d. contact writes refuse ids from another org", () => {
  const cases: [string, Record<string, unknown>, { findMany: Mock }][] = [
    ["labels", { labels: [ID(1)] }, db.contactLabel],
    ["contactGroupIds", { contactGroupIds: [ID(2)] }, db.contactGroup],
    ["lifecycleId", { lifecycleId: ID(3) }, db.lifecycle],
    ["customFields", { customFields: [{ id: ID(4), value: "x" }] }, db.contactCustomField],
    ["assignedUserIds", { assignedUserIds: [ID(5)] }, db.orgMember],
  ];

  test.each(cases)("create one: foreign %s", async (field, refs, model) => {
    model.findMany.mockResolvedValue([]);
    const reply = fakeReply();
    await createContactsExternalController(
      req({ body: { name: "A", phone: "919876543210", ...refs } }),
      asReply(reply),
    );
    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({ error: expect.stringContaining(`Unknown ${field}`) });
    expect(dashboard.createContactHandler).not.toHaveBeenCalled();
    // The lookup itself is the org's.
    const where = model.findMany.mock.calls[0]![0].where;
    expect(JSON.stringify(where)).toContain(ORG);
  });

  test.each(cases)("create many: foreign %s", async (field, refs, model) => {
    model.findMany.mockResolvedValue([]);
    const reply = fakeReply();
    await createContactsExternalController(
      req({
        body: [
          { name: "A", phone: "919876543210" },
          { name: "B", phone: "1", ...refs },
        ],
      }),
      asReply(reply),
    );
    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({ error: expect.stringContaining(`Unknown ${field}`) });
    expect(dashboard.createMultipleContactsHandler).not.toHaveBeenCalled();
  });

  test.each(cases)("update: foreign %s", async (field, refs, model) => {
    model.findMany.mockResolvedValue([]);
    const reply = fakeReply();
    await updateContactByIdExternalController(
      req({ params: { contactId: ID(9) }, body: refs }),
      asReply(reply),
    );
    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({ error: expect.stringContaining(`Unknown ${field}`) });
    expect(dashboard.updateContactByIdHandler).not.toHaveBeenCalled();
  });

  test.each(cases)("contact group /contacts/new: foreign %s", async (field, refs, model) => {
    model.findMany.mockResolvedValue([]);
    const reply = fakeReply();
    await addNewContactsToGroupExternalController(
      req({ params: { contactGroupId: ID(8) }, body: [{ name: "A", phone: "9", ...refs }] }),
      asReply(reply),
    );
    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({ error: expect.stringContaining(`Unknown ${field}`) });
    expect(dashboard.addNewContactsToGroupHandler).not.toHaveBeenCalled();
  });

  test("a malformed id is refused without a lookup", async () => {
    const reply = fakeReply();
    await createContactsExternalController(
      req({ body: { name: "A", phone: "919876543210", contactGroupIds: ["not-a-uuid"] } }),
      asReply(reply),
    );
    expect(reply.statusCode).toBe(400);
    expect(db.contactGroup.findMany).not.toHaveBeenCalled();
  });

  test("the org's own ids pass through, with source stamped", async () => {
    const reply = fakeReply();
    const body = {
      name: "A",
      phone: "919876543210",
      labels: [ID(1)],
      contactGroupIds: [ID(2)],
      lifecycleId: ID(3),
      customFields: [{ id: ID(4), value: "x" }],
      assignedUserIds: [ID(5)],
    };
    await createContactsExternalController(req({ body }), asReply(reply));
    expect(dashboard.createContactHandler).toHaveBeenCalledOnce();
    expect(dashboard.createContactHandler.mock.calls[0]![0].body.source).toBe("external");
    expect(db.orgMember.findMany.mock.calls[0]![0].where).toEqual({
      userId: { in: [ID(5)] },
      orgId: ORG,
    });
    expect(db.contactGroup.findMany.mock.calls[0]![0].where).toEqual({
      id: { in: [ID(2)] },
      team: { orgId: ORG },
    });
  });
});

describe("e. campaign create refuses another org's template", () => {
  test("waTemplateId", async () => {
    db.waTemplate.count.mockResolvedValue(0);
    const reply = fakeReply();
    await createCampaignExternalController(
      req({ body: { name: "C", type: "ONE_TIME", teamId: ID(5), waTemplateId: ID(6) } }),
      asReply(reply),
    );
    expect(db.waTemplate.count.mock.calls[0]![0].where).toEqual({
      id: { in: [ID(6)] },
      orgId: ORG,
    });
    expect(reply.statusCode).toBe(404);
    expect(reply.body).toEqual({ message: "Template not found", code: "TEMPLATE_NOT_FOUND" });
    expect(dashboard.createCampaignHandler).not.toHaveBeenCalled();
  });

  test("a drip stage's templateId", async () => {
    db.waTemplate.count.mockResolvedValue(1);
    const reply = fakeReply();
    await createCampaignExternalController(
      req({
        body: {
          name: "C",
          type: "DRIP",
          teamId: ID(5),
          dripStages: [
            { templateId: ID(6), delay: 1, delayUnit: "days" },
            { templateId: ID(7), delay: 2, delayUnit: "days" },
          ],
        },
      }),
      asReply(reply),
    );
    expect(reply.statusCode).toBe(404);
    expect(dashboard.createCampaignHandler).not.toHaveBeenCalled();
  });

  test("the org's own template goes through", async () => {
    const reply = fakeReply();
    await createCampaignExternalController(
      req({ body: { name: "C", type: "ONE_TIME", teamId: ID(5), waTemplateId: ID(6) } }),
      asReply(reply),
    );
    expect(dashboard.createCampaignHandler).toHaveBeenCalledOnce();
  });
});
