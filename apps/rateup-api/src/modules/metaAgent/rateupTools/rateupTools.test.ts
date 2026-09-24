import bcrypt from "bcrypt";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../utils/rateLimit.js", () => ({ rateLimit: () => async () => {} }));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    metaBusinessAgent: { findUnique: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
    contact: { findUnique: vi.fn() },
    contactLabel: { findMany: vi.fn() },
    pipelineStage: { findMany: vi.fn() },
    team: { findMany: vi.fn() },
    metaAgentConnector: { findFirst: vi.fn(), update: vi.fn() },
    metaAgentConnectorTool: { findMany: vi.fn() },
  },
}));
vi.mock("../../../external/v1/loyalty/guards.js", () => ({
  requireLoyaltySubscription: vi.fn(async () => {}),
  loadProgram: vi.fn(async () => ({ id: "prog-1", defaultCountryCode: "IN" })),
}));
vi.mock("../../../external/v1/loyalty/loyalty.external.controller.js", () => ({
  memberSummary: vi.fn(),
  rewardCatalogue: vi.fn(async () => []),
}));
vi.mock("../../pipeline/pipelineLead/lead.service.js", () => ({
  resolvePipelineForContact: vi.fn(async () => "pipe-1"),
}));
vi.mock("../../whatsapp/automatedReply/wa_automatedReply.utils.js", () => ({
  executeAttachLabelAction: vi.fn(async () => true),
  executeAssignStageAction: vi.fn(async () => true),
  executeAssignTeamAction: vi.fn(async () => true),
}));
vi.mock("../metaAgent.service.js", () => ({
  MetaAgentValidationError: class extends Error {},
  getAgentRecord: vi.fn(),
  createConnector: vi.fn(),
  createConnectorTool: vi.fn(),
  deleteConnector: vi.fn(),
}));

import prisma from "../../../utils/prisma.js";
import { memberSummary } from "../../../external/v1/loyalty/loyalty.external.controller.js";
import {
  executeAssignTeamAction,
  executeAttachLabelAction,
} from "../../whatsapp/automatedReply/wa_automatedReply.utils.js";
import * as agentService from "../metaAgent.service.js";
import type { RequestDefinition } from "../metaAgent.schema.js";
import { rateupToolsRoutes } from "./rateupTools.route.js";
import {
  installRateupConnector,
  installRateupConnectorBodySchema,
  RATEUP_TOOL_NAMES,
  RATEUP_TOOLS,
} from "./rateupConnector.service.js";

const db = prisma as any;
const AGENT_ROW = "11111111-1111-4111-8111-111111111111";
const KEY = "the-connector-key";
let keyHash: string;

beforeAll(async () => {
  keyHash = await bcrypt.hash(KEY, 4);
});

async function app() {
  const server = Fastify();
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);
  await server.register(rateupToolsRoutes);
  return server;
}

const call = async (
  method: "GET" | "POST",
  url: string,
  { key = KEY, body }: { key?: string | null; body?: object } = {},
) =>
  (await app()).inject({
    method,
    url: `/${AGENT_ROW}${url}`,
    headers: key ? { authorization: `Bearer ${key}` } : {},
    ...(body ? { payload: body } : {}),
  });

beforeEach(() => {
  vi.clearAllMocks();
  db.metaBusinessAgent.findUnique.mockResolvedValue({
    orgId: "org-1",
    rateupToolsKeyHash: keyHash,
  });
  db.contact.findUnique.mockResolvedValue({ id: "contact-1" });
});

describe("the tool endpoints' key", () => {
  test("a missing or wrong key is refused", async () => {
    expect((await call("GET", "/crm/options", { key: null })).statusCode).toBe(401);
    expect((await call("GET", "/crm/options", { key: "guess" })).statusCode).toBe(401);
  });

  test("an uninstalled connector refuses even its old key", async () => {
    db.metaBusinessAgent.findUnique.mockResolvedValue({ orgId: "org-1", rateupToolsKeyHash: null });
    expect((await call("GET", "/crm/options")).statusCode).toBe(401);
  });
});

describe("loyalty", () => {
  test("looks the customer up by the number Meta sends, as E.164", async () => {
    vi.mocked(memberSummary).mockResolvedValue({
      member: { points: 40 },
      tier: {},
      availableRewards: [],
      pendingVouchers: [],
      recentTransactions: [{ id: "t" }],
      program: {},
    } as any);
    const res = await call("GET", "/loyalty/member?phone=%2B919188346187");
    expect(res.statusCode).toBe(200);
    expect(vi.mocked(memberSummary).mock.calls[0][2]).toEqual({ phone: "+919188346187" });
    // Staff-side history is not handed to the agent.
    expect(res.json()).not.toHaveProperty("recentTransactions");
  });
});

describe("crm", () => {
  test("a label is matched by name, ignoring case and spacing", async () => {
    db.contactLabel.findMany.mockResolvedValue([{ id: "l-1", name: "Hot  Lead" }]);
    const res = await call("POST", "/crm/label", {
      body: { phone: "+919188346187", label: "hot lead" },
    });
    expect(res.statusCode).toBe(200);
    expect(executeAttachLabelAction).toHaveBeenCalledWith("l-1", {
      orgId: "org-1",
      phone: "919188346187",
    });
  });

  test("an unknown label is refused with the names that exist, never created", async () => {
    db.contactLabel.findMany.mockResolvedValue([{ id: "l-1", name: "VIP" }]);
    const res = await call("POST", "/crm/label", { body: { phone: "+91918", label: "Gold" } });
    expect(res.statusCode).toBe(404);
    expect(JSON.stringify(res.json())).toContain("VIP");
    expect(executeAttachLabelAction).not.toHaveBeenCalled();
  });

  test("a customer who is not a contact is not created by a label", async () => {
    db.contactLabel.findMany.mockResolvedValue([{ id: "l-1", name: "VIP" }]);
    db.contact.findUnique.mockResolvedValue(null);
    const res = await call("POST", "/crm/label", { body: { phone: "+91918", label: "VIP" } });
    expect(res.statusCode).toBe(404);
  });

  test("a team with nobody in it says so", async () => {
    db.team.findMany.mockResolvedValue([{ id: "t-1", name: "Billing" }]);
    vi.mocked(executeAssignTeamAction).mockResolvedValueOnce(false);
    const res = await call("POST", "/crm/team", { body: { phone: "+91918", team: "billing" } });
    expect(res.statusCode).toBe(422);
  });
});

describe("the tool definitions", () => {
  test("every customer-specific tool takes the phone from Meta, not the agent", () => {
    for (const name of RATEUP_TOOL_NAMES) {
      const request: RequestDefinition = RATEUP_TOOLS[name].definition.request_definition;
      const phone = request.query_parameters?.phone ?? request.body?.params.phone;
      if (!phone) continue;
      expect(phone.binding).toEqual({ kind: "macro", macro: "WHATSAPP_PHONE_NUMBER" });
    }
  });

  test("none of them sends a message", () => {
    // A send from RateUp would move the thread off the agent.
    for (const name of RATEUP_TOOL_NAMES) {
      expect(RATEUP_TOOLS[name].definition.request_definition.path).not.toMatch(/send|message/);
    }
  });

  test("an install needs at least one tool and drops repeats", () => {
    expect(installRateupConnectorBodySchema.safeParse({ tools: [] }).success).toBe(false);
    expect(
      installRateupConnectorBodySchema.parse({ tools: ["get_crm_options", "get_crm_options"] })
        .tools,
    ).toEqual(["get_crm_options"]);
  });
});

describe("installing", () => {
  beforeEach(() => {
    process.env.API_URL = "https://api.rateup.test/";
    vi.mocked(agentService.getAgentRecord).mockResolvedValue({
      id: AGENT_ROW,
      agentId: "meta-agent",
    } as any);
    vi.mocked(agentService.createConnector).mockResolvedValue({ id: "conn-1" } as any);
    db.metaAgentConnector.findFirst.mockResolvedValue(null);
    db.metaAgentConnectorTool.findMany.mockResolvedValue([]);
  });

  test("points the connector at this agent's endpoints and creates it with a bearer key", async () => {
    await installRateupConnector("org-1", "ws-1", ["get_loyalty_status"]);
    const body = vi.mocked(agentService.createConnector).mock.calls[0][2];
    expect(body.base_url).toBe(`https://api.rateup.test/api/public/meta-agent-tools/${AGENT_ROW}`);
    // Sent with the create: Meta refuses an API_KEY connector that arrives without one.
    const header = body.auth_config!.api_key!.headers![0];
    expect(header.field_name).toBe("Authorization");
    expect(header.prefix).toBe("Bearer ");
    // The stored hash is of the very key Meta was given.
    const stored = db.metaBusinessAgent.update.mock.calls[0][0].data.rateupToolsKeyHash;
    expect(await bcrypt.compare(header.value, stored)).toBe(true);
    expect(db.metaAgentConnector.update).toHaveBeenCalledWith({
      where: { id: "conn-1" },
      data: { builtIn: "rateup" },
    });
  });

  test("a failed tool rolls the whole install back", async () => {
    vi.mocked(agentService.createConnectorTool).mockRejectedValueOnce(new Error("Meta said no"));
    await expect(installRateupConnector("org-1", "ws-1", ["get_crm_options"])).rejects.toThrow();
    expect(agentService.deleteConnector).toHaveBeenCalledWith("org-1", "ws-1", "conn-1");
    expect(db.metaBusinessAgent.update.mock.calls.at(-1)[0].data).toEqual({
      rateupToolsKeyHash: null,
    });
  });

  test("a reinstall removes the old connector first", async () => {
    db.metaAgentConnector.findFirst.mockResolvedValue({ id: "old-conn" });
    await installRateupConnector("org-1", "ws-1", ["get_crm_options"]);
    expect(vi.mocked(agentService.deleteConnector).mock.calls[0][2]).toBe("old-conn");
  });

  test("refuses an API Meta could not reach", async () => {
    process.env.API_URL = "http://localhost:3001";
    await expect(installRateupConnector("org-1", "ws-1", ["get_crm_options"])).rejects.toThrow(
      /https/,
    );
    expect(agentService.createConnector).not.toHaveBeenCalled();
  });
});
