import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../utils/rateLimit.js", () => ({ rateLimit: () => async () => {} }));
vi.mock("../../../modules/campaigns/campaignRetry.service.js", () => ({
  upsertCampaignRetryPolicy: vi.fn(),
}));
vi.mock("../../../modules/settings/subscription/subscription.service.js", () => ({
  getSubscription: vi.fn(),
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    campaign: { findMany: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    campaignParticipant: { groupBy: vi.fn(), count: vi.fn() },
    campaignSend: { findFirst: vi.fn() },
    team: { findFirst: vi.fn() },
    waTemplate: { findMany: vi.fn() },
    contactGroup: { findMany: vi.fn() },
    contact: { findMany: vi.fn() },
    waFlow: { findFirst: vi.fn() },
    surveyResponse: { findMany: vi.fn() },
  },
}));
vi.mock("../../../modules/campaigns/campaign.service.js", () => ({
  createCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  enqueueCampaignMessage: vi.fn(),
  updateCampaign: vi.fn(),
}));
vi.mock("../../../modules/campaigns/campaign.preflight.js", () => ({
  getCampaignSendPreflight: vi.fn(),
}));
vi.mock("../../../modules/campaigns/campaignPause.service.js", () => ({
  clearCampaignPause: vi.fn(),
}));
vi.mock("../../../modules/campaigns/campaignSend.service.js", () => {
  class CampaignSendInProgressError extends Error {}
  return {
    CampaignSendInProgressError,
    cancelCampaignSends: vi.fn(),
    createCampaignSend: vi.fn(),
    failCampaignSend: vi.fn(),
    getLiveCampaignSend: vi.fn(),
  };
});
vi.mock("../../../modules/campaigns/campaignParticipants/campaignParticipants.service.js", () => ({
  createCampaignParticipants: vi.fn(),
}));
vi.mock("../../../modules/settings/subscription/campaignCredits.js", () => ({
  getCampaignCreditBudget: vi.fn(),
}));

import prismaModule from "../../../utils/prisma.js";
import { getSubscription } from "../../../modules/settings/subscription/subscription.service.js";
import {
  createCampaign,
  deleteCampaign,
  enqueueCampaignMessage,
  updateCampaign,
} from "../../../modules/campaigns/campaign.service.js";
import { getCampaignSendPreflight } from "../../../modules/campaigns/campaign.preflight.js";
import {
  CampaignSendInProgressError,
  createCampaignSend,
  failCampaignSend,
} from "../../../modules/campaigns/campaignSend.service.js";
import { createCampaignParticipants } from "../../../modules/campaigns/campaignParticipants/campaignParticipants.service.js";
import { CampaignNotFoundError } from "../../../modules/campaigns/campaign.errors.js";
import { externalErrorHandler } from "../../shared/errors.js";
import { externalCampaignRoutes } from "./campaigns.route.js";

type Mock = ReturnType<typeof vi.fn>;
// oxlint-disable-next-line typescript/no-explicit-any
const prisma = prismaModule as any;

const ORG = "11111111-1111-4111-8111-111111111111";
const CAMPAIGN_ID = "22222222-2222-4222-8222-222222222222";
const TEAM_ID = "33333333-3333-4333-8333-333333333333";
const TEMPLATE_ID = "44444444-4444-4444-8444-444444444444";
const GROUP_ID = "55555555-5555-4555-8555-555555555555";
const SEND_ID = "66666666-6666-4666-8666-666666666666";
const IDEM = { "idempotency-key": "test-key-0001" };

function campaignRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CAMPAIGN_ID,
    name: "Diwali offer",
    type: "WHATSAPP",
    status: "DRAFT",
    teamId: TEAM_ID,
    createdAt: new Date("2026-10-01T10:00:00.000Z"),
    startedAt: null,
    campaignSentAt: null,
    pauseReason: null,
    errorMessage: null,
    waTemplate: {
      id: TEMPLATE_ID,
      data: { name: "diwali_offer", components: [], accessToken: "EAAG-secret-token" },
    },
    CampaignStats: {
      totalSend: 10,
      totalDelivered: 8,
      totalRead: 5,
      totalFailed: 2,
      totalCompleted: 1,
    },
    CampaignDripStage: [],
    // Columns a presenter must never pass along.
    flowId: "flow-internal-uuid",
    scheduledStatuses: ["PENDING"],
    dynamicTags: ["name"],
    dailySendLimit: 500,
    timezone: "Asia/Kolkata",
    useUserConsent: true,
    ...overrides,
  };
}

function sendRow() {
  return {
    id: SEND_ID,
    attemptNo: 0,
    trigger: "MANUAL",
    status: "QUEUING",
    targetStatuses: ["PENDING"],
    scheduledFor: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date("2026-10-16T10:00:00.000Z"),
    totalTargeted: 0,
    totalSkipped: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalRead: 0,
    totalFailed: 0,
    totalCompleted: 0,
    note: "internal note",
    campaignId: CAMPAIGN_ID,
  };
}

async function buildApp() {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(externalErrorHandler);
  app.addHook("onRequest", async (request) => {
    (request as { user?: unknown }).user = { orgId: ORG, role: "SUPER_ADMIN" };
    (request as { actor?: unknown }).actor = { scope: { all: true } };
  });
  await app.register(externalCampaignRoutes);
  await app.ready();
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  (getSubscription as Mock).mockResolvedValue({
    expiresAt: new Date(Date.now() + 86_400_000),
    features: { whatsapp: { campaign: { active: true } } },
  });
  prisma.campaignParticipant.groupBy.mockResolvedValue([{ contactGroupId: GROUP_ID }]);
  prisma.campaignParticipant.count.mockResolvedValue(42);
  prisma.campaignSend.findFirst.mockResolvedValue(null);
});

describe("the response schemas are a boundary", () => {
  test("internal columns and the template payload do not survive serialisation", async () => {
    prisma.campaign.findMany.mockResolvedValue([campaignRow()]);
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/" });

    expect(res.statusCode).toBe(200);
    for (const leaked of [
      "flow-internal-uuid",
      "scheduledStatuses",
      "dynamicTags",
      "dailySendLimit",
      "Asia/Kolkata",
      "useUserConsent",
      "EAAG-secret-token",
      "components",
      "CampaignStats",
    ]) {
      expect(res.payload).not.toContain(leaked);
    }
    expect(JSON.parse(res.payload).data[0]).toEqual({
      id: CAMPAIGN_ID,
      name: "Diwali offer",
      type: "WHATSAPP",
      status: "DRAFT",
      teamId: TEAM_ID,
      template: { id: TEMPLATE_ID, name: "diwali_offer" },
      scheduledAt: null,
      startedAt: null,
      createdAt: "2026-10-01T10:00:00.000Z",
      pauseReason: null,
      errorMessage: null,
      stats: { sent: 10, delivered: 8, read: 5, failed: 2, completed: 1 },
    });
  });

  test("every route declares a 2xx response and the send route its guards", async () => {
    const routes: Array<{ method: string; url: string; config: Record<string, unknown> }> = [];
    const missing: string[] = [];
    const probe = Fastify();
    probe.setValidatorCompiler(validatorCompiler);
    probe.setSerializerCompiler(serializerCompiler);
    probe.addHook("onRoute", (opts) => {
      const response = (opts.schema?.response ?? {}) as Record<string, unknown>;
      if (!Object.keys(response).some((k) => k.startsWith("2"))) {
        missing.push(`${opts.method} ${opts.url}`);
      }
      // Kept by reference: the module's own onRoute hook (declareExternalScopes) runs after
      // this root one and fills `config` in place.
      routes.push(opts as unknown as (typeof routes)[number]);
    });
    await probe.register(externalCampaignRoutes);
    await probe.ready();

    expect(missing).toEqual([]);
    const send = routes.find((r) => r.method === "POST" && r.url.endsWith("/:campaignId/send"));
    expect(send?.config).toMatchObject({
      permission: "campaigns.send",
      paid: true,
      access: "token",
    });
    // The old verb is gone.
    expect(routes.some((r) => r.method === "PUT")).toBe(false);
    const create = routes.find((r) => r.method === "POST" && r.url === "/");
    expect(create?.config.permission).toBe("campaigns.manage");
    const list = routes.find((r) => r.method === "GET" && r.url === "/");
    expect(list?.config.permission).toBe("campaigns.read");
  });
});

describe("org scoping", () => {
  test("another org's campaign is a 404, looked up through the team's org", async () => {
    prisma.campaign.findFirst.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/${CAMPAIGN_ID}` });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).error.code).toBe("campaign_not_found");
    expect(prisma.campaign.findFirst.mock.calls[0][0].where).toEqual({
      id: CAMPAIGN_ID,
      team: { orgId: ORG },
    });
  });

  test("send to another org's campaign is a 404 and opens no send", async () => {
    prisma.campaign.findFirst.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${CAMPAIGN_ID}/send`,
      headers: IDEM,
      payload: {},
    });

    expect(res.statusCode).toBe(404);
    expect(createCampaignSend).not.toHaveBeenCalled();
    expect(enqueueCampaignMessage).not.toHaveBeenCalled();
  });

  test("responses are read through the campaign's org, and the flow's", async () => {
    prisma.campaign.findFirst.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/${CAMPAIGN_ID}/responses` });

    expect(res.statusCode).toBe(404);
    expect(prisma.surveyResponse.findMany).not.toHaveBeenCalled();
  });

  test("responses come back paginated in the survey response shape", async () => {
    const flowId = "77777777-7777-4777-8777-777777777777";
    prisma.campaign.findFirst.mockResolvedValue({ teamId: TEAM_ID, flowId });
    prisma.waFlow.findFirst.mockResolvedValue({
      surveyId: "s-1",
      survey: { questions: [{ id: "q1", title: { en: "How was it?" } }] },
    });
    prisma.surveyResponse.findMany.mockResolvedValue([
      {
        id: "r-1",
        createdAt: new Date("2026-10-02T00:00:00.000Z"),
        language: "en",
        tag: "",
        responses: [{ questionId: "q1", type: "RATING", response: { RATING: 5 } }],
        encryptedResponses: null,
        surveyTeamMap: { teamId: TEAM_ID },
        Contact: { identities: [{ kind: "PHONE", value: "+919000000001" }] },
        ip: "10.0.0.1",
      },
    ]);
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/${CAMPAIGN_ID}/responses?limit=10` });

    expect(res.statusCode).toBe(200);
    expect(prisma.waFlow.findFirst.mock.calls[0][0].where).toEqual({
      dbFlowId: flowId,
      orgId: ORG,
    });
    expect(prisma.surveyResponse.findMany.mock.calls[0][0].where.surveyTeamMap).toEqual({
      surveyId: "s-1",
      teamId: TEAM_ID,
    });
    const body = JSON.parse(res.payload);
    expect(res.payload).not.toContain("10.0.0.1");
    expect(body.nextCursor).toBeNull();
    expect(body.data[0]).toMatchObject({
      id: "r-1",
      phone: "919000000001",
      answers: [{ questionId: "q1", title: "How was it?", value: 5 }],
    });
  });
});

describe("validation", () => {
  test("a non-uuid id is a 400 envelope", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/not-a-uuid" });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error.code).toBe("validation_failed");
  });

  test("a WHATSAPP campaign needs a template", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/",
      payload: { name: "x", type: "WHATSAPP", teamId: TEAM_ID },
    });
    expect(res.statusCode).toBe(400);
    expect(createCampaign).not.toHaveBeenCalled();
  });

  test("bulk arrays are capped at 1000", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/",
      payload: {
        name: "x",
        type: "WHATSAPP",
        teamId: TEAM_ID,
        templateId: TEMPLATE_ID,
        contactGroupIds: Array.from({ length: 1001 }, () => GROUP_ID),
      },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("pagination", () => {
  test("fetches limit + 1 and hands back a cursor when there is more", async () => {
    prisma.campaign.findMany.mockResolvedValue([
      campaignRow(),
      campaignRow({ id: "88888888-8888-4888-8888-888888888888" }),
    ]);
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/?limit=1&status=DRAFT&type=WHATSAPP" });

    expect(res.statusCode).toBe(200);
    const args = prisma.campaign.findMany.mock.calls[0][0];
    expect(args.take).toBe(2);
    expect(args.where).toMatchObject({ team: { orgId: ORG }, status: "DRAFT", type: "WHATSAPP" });
    const body = JSON.parse(res.payload);
    expect(body.data).toHaveLength(1);
    expect(body.nextCursor).toEqual(expect.any(String));
  });

  test("a forged cursor is refused", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/?cursor=bm9wZQ" });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error.code).toBe("cursor_invalid");
  });
});

describe("create", () => {
  test("a template from another org is refused before anything is written", async () => {
    prisma.team.findFirst.mockResolvedValue({ id: TEAM_ID });
    prisma.waTemplate.findMany.mockResolvedValue([]);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/",
      payload: { name: "x", type: "WHATSAPP", teamId: TEAM_ID, templateId: TEMPLATE_ID },
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).error).toMatchObject({
      code: "template_not_found",
      details: { templateIds: [TEMPLATE_ID] },
    });
    expect(prisma.waTemplate.findMany.mock.calls[0][0].where.orgId).toBe(ORG);
    expect(createCampaign).not.toHaveBeenCalled();
  });

  test("another org's contact group is a 404", async () => {
    prisma.team.findFirst.mockResolvedValue({ id: TEAM_ID });
    prisma.waTemplate.findMany.mockResolvedValue([{ id: TEMPLATE_ID, data: {} }]);
    prisma.contactGroup.findMany.mockResolvedValue([]);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/",
      payload: {
        name: "x",
        type: "WHATSAPP",
        teamId: TEAM_ID,
        templateId: TEMPLATE_ID,
        contactGroupIds: [GROUP_ID],
      },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).error.code).toBe("contact_group_not_found");
    expect(createCampaign).not.toHaveBeenCalled();
  });

  test("creates a DRAFT with its audience and answers 201", async () => {
    prisma.team.findFirst.mockResolvedValue({ id: TEAM_ID });
    prisma.waTemplate.findMany.mockResolvedValue([{ id: TEMPLATE_ID, data: { components: [] } }]);
    prisma.contactGroup.findMany.mockResolvedValue([{ id: GROUP_ID }]);
    (createCampaign as Mock).mockResolvedValue({ id: CAMPAIGN_ID });
    prisma.campaign.findFirst.mockResolvedValue(campaignRow());
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/",
      payload: {
        name: "Diwali offer",
        type: "WHATSAPP",
        teamId: TEAM_ID,
        templateId: TEMPLATE_ID,
        contactGroupIds: [GROUP_ID],
      },
    });

    expect(res.statusCode).toBe(201);
    expect((createCampaign as Mock).mock.calls[0][0]).toMatchObject({
      status: "DRAFT",
      waTemplateId: TEMPLATE_ID,
      teamId: TEAM_ID,
    });
    expect(createCampaignParticipants).toHaveBeenCalledWith(CAMPAIGN_ID, ORG, {
      contactIds: [],
      groupIds: [GROUP_ID],
      campaignIds: [],
      status: [],
    });
    expect(JSON.parse(res.payload)).toMatchObject({
      id: CAMPAIGN_ID,
      contactGroupIds: [GROUP_ID],
      recipients: 42,
    });
  });
});

describe("delete", () => {
  test("a campaign the org does not own is a 404 envelope", async () => {
    (deleteCampaign as Mock).mockRejectedValue(new CampaignNotFoundError());
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: `/${CAMPAIGN_ID}` });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).error.code).toBe("campaign_not_found");
    expect(deleteCampaign).toHaveBeenCalledWith(CAMPAIGN_ID, ORG);
  });
});

describe("send", () => {
  beforeEach(() => {
    prisma.campaign.findFirst.mockResolvedValue({
      id: CAMPAIGN_ID,
      type: "WHATSAPP",
      status: "DRAFT",
      waTemplateId: TEMPLATE_ID,
      _count: { CampaignDripStage: 0 },
    });
    (getCampaignSendPreflight as Mock).mockResolvedValue({ recipients: 5, exhausted: false });
    (createCampaignSend as Mock).mockResolvedValue(sendRow());
    (enqueueCampaignMessage as Mock).mockResolvedValue({ status: true, message: "ok" });
    (updateCampaign as Mock).mockResolvedValue({});
  });

  test("opens a CampaignSend before enqueueing, scoped to it, and answers 202", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: `/${CAMPAIGN_ID}/send`, headers: IDEM });

    expect(res.statusCode).toBe(202);
    expect(createCampaignSend).toHaveBeenCalledWith(
      expect.objectContaining({ campaignId: CAMPAIGN_ID, trigger: "MANUAL" }),
    );
    expect(enqueueCampaignMessage).toHaveBeenCalledWith(
      expect.objectContaining({ campaignSendId: SEND_ID, sendToStatuses: ["PENDING"] }),
    );
    const sendOrder = (createCampaignSend as Mock).mock.invocationCallOrder[0];
    const enqueueOrder = (enqueueCampaignMessage as Mock).mock.invocationCallOrder[0];
    expect(sendOrder).toBeLessThan(enqueueOrder);

    const body = JSON.parse(res.payload);
    expect(body).toMatchObject({
      campaignId: CAMPAIGN_ID,
      campaignStatus: "QUEUING",
      send: { id: SEND_ID, status: "QUEUING" },
    });
    expect(res.payload).not.toContain("internal note");
  });

  test("spent campaign credits are a 403 envelope, not a 500, and nothing is queued", async () => {
    (getCampaignSendPreflight as Mock).mockResolvedValue({ recipients: 5, exhausted: true });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${CAMPAIGN_ID}/send`,
      headers: IDEM,
      payload: {},
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).error.code).toBe("campaign_credits_exhausted");
    expect(createCampaignSend).not.toHaveBeenCalled();
    expect(enqueueCampaignMessage).not.toHaveBeenCalled();
  });

  test("no recipients is a 422", async () => {
    (getCampaignSendPreflight as Mock).mockResolvedValue({ recipients: 0, exhausted: false });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${CAMPAIGN_ID}/send`,
      headers: IDEM,
      payload: {},
    });
    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.payload).error.code).toBe("no_recipients");
  });

  test("a send already in progress is a 409", async () => {
    (createCampaignSend as Mock).mockRejectedValue(new CampaignSendInProgressError());
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${CAMPAIGN_ID}/send`,
      headers: IDEM,
      payload: {},
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.payload).error.code).toBe("campaign_send_in_progress");
    expect(enqueueCampaignMessage).not.toHaveBeenCalled();
  });

  test("a failed enqueue closes the send and answers send_failed", async () => {
    (enqueueCampaignMessage as Mock).mockResolvedValue({ status: false, message: "redis down" });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${CAMPAIGN_ID}/send`,
      headers: IDEM,
      payload: {},
    });

    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.payload).error.code).toBe("send_failed");
    expect(failCampaignSend).toHaveBeenCalledWith(SEND_ID, expect.any(String));
    expect(updateCampaign).toHaveBeenLastCalledWith(
      CAMPAIGN_ID,
      ORG,
      expect.objectContaining({ status: "FAILED" }),
    );
  });

  test("a schedule in the past is a 400", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${CAMPAIGN_ID}/send`,
      headers: IDEM,
      payload: { scheduledAt: "2020-01-01T00:00:00Z" },
    });
    expect(res.statusCode).toBe(400);
    expect(createCampaignSend).not.toHaveBeenCalled();
  });

  test("a plan without campaigns is refused with the envelope", async () => {
    (getSubscription as Mock).mockResolvedValue({
      expiresAt: new Date(Date.now() + 86_400_000),
      features: { whatsapp: { campaign: { active: false } } },
    });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/${CAMPAIGN_ID}/send`,
      headers: IDEM,
      payload: {},
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).error).toMatchObject({
      code: "subscription_required",
      details: { missingFeatures: ["whatsapp.campaign"] },
    });
    expect(prisma.campaign.findFirst).not.toHaveBeenCalled();
  });

  test("an expired plan still reads but cannot send", async () => {
    (getSubscription as Mock).mockResolvedValue({
      expiresAt: new Date(Date.now() - 86_400_000),
      features: { whatsapp: { campaign: { active: true } } },
    });
    prisma.campaign.findMany.mockResolvedValue([]);
    const app = await buildApp();

    const read = await app.inject({ method: "GET", url: "/" });
    expect(read.statusCode).toBe(200);

    const send = await app.inject({
      method: "POST",
      url: `/${CAMPAIGN_ID}/send`,
      headers: IDEM,
      payload: {},
    });
    expect(send.statusCode).toBe(403);
    expect(JSON.parse(send.payload).error.code).toBe("subscription_expired");
  });
});
