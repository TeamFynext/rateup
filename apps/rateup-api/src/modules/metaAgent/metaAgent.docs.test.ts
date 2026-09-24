// Behaviour pinned to Meta's Business Agent reference and changelog
// (developers.facebook.com/documentation/meta-business-agent), as read on
// 2026-09-23. Each test names the documented fact it holds us to.
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.wa_access_token_encryption_key = "00".repeat(32);
});

vi.mock("../../utils/prisma.js", () => ({
  default: {
    whatsappSettings: { findFirstOrThrow: vi.fn() },
    metaBusinessAgent: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    metaAgentAllowlistEntry: {
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    metaAgentSkill: { create: vi.fn() },
    metaAgentConnector: { findFirstOrThrow: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("axios", () => ({ default: vi.fn() }));
vi.mock("../whatsapp/wa_axios.js", () => ({ callMetaApi: vi.fn() }));
vi.mock("./metaAgent.threadOwner.js", () => ({ setMetaAgentThreadOwner: vi.fn() }));

import axios from "axios";
import prisma from "../../utils/prisma.js";
import { callMetaApi } from "../whatsapp/wa_axios.js";
import { setMetaAgentThreadOwner } from "./metaAgent.threadOwner.js";
import { MetaAgentApiError } from "./metaAgent.client.js";
import * as service from "./metaAgent.service.js";
import {
  agentBudgetsBodySchema,
  agentSettingsBodySchema,
  bodyNodeSchema,
  connectorBodySchema,
  connectorToolBodySchema,
  conversationInsightsQuerySchema,
  skillBodySchema,
  toolCallInsightsQuerySchema,
  uiSkillBodySchema,
} from "./metaAgent.schema.js";

const ORG = "org-1";
const WS = "ws-1";
const AGENT = {
  id: "agent-row",
  agentId: "meta-agent-1",
  channel: "whatsapp",
  businessManagerId: null as string | null,
};

const db = prisma as any;
const http = axios as unknown as ReturnType<typeof vi.fn>;

function metaReplies(...bodies: { status?: number; data?: unknown; headers?: object }[]) {
  for (const body of bodies) {
    http.mockResolvedValueOnce({ status: 200, headers: {}, ...body });
  }
}
const lastCall = () => http.mock.calls.at(-1)![0];

beforeEach(() => {
  vi.clearAllMocks();
  db.whatsappSettings.findFirstOrThrow.mockResolvedValue({
    phoneId: "phone-1",
    wabaId: "waba-1",
    accessToken: "token",
    accessToken_iv: null,
  });
  db.metaBusinessAgent.findFirst.mockResolvedValue({ ...AGENT });
  db.metaBusinessAgent.findFirstOrThrow.mockResolvedValue({ ...AGENT });
  db.metaBusinessAgent.update.mockResolvedValue({});
});

describe("thread control", () => {
  test("sends the consumer as bare digits, not E.164", async () => {
    // Changelog 2026-08-27: "+15551234567 … returns a Consumer not found error".
    metaReplies({ data: { messaging_product: "whatsapp" } });
    await service.setThreadControl(ORG, WS, { action: "release", to: "+15551234567" });
    expect(lastCall().data.to).toBe("15551234567");
  });

  test("a pass names Meta AI, or it would go to the escalation partner", async () => {
    metaReplies({ data: {} });
    await service.setThreadControl(ORG, WS, { action: "pass", to: "+15551234567" });
    expect(lastCall().data.control_pass).toEqual({ target_role: "ai_agent" });
  });

  test("a release carries no control_pass, and forwards the reason as metadata", async () => {
    metaReplies({ data: {} });
    await service.setThreadControl(
      ORG,
      WS,
      { action: "release", to: "+15551234567" },
      "ticket_closed",
    );
    expect(lastCall().data.control_pass).toBeUndefined();
    expect(lastCall().data.metadata).toBe("ticket_closed");
  });

  test("both hand-backs record the thread as Meta AI's", async () => {
    metaReplies({ data: {} }, { data: {} });
    await service.setThreadControl(ORG, WS, { action: "pass", to: "+15551234567" });
    await service.setThreadControl(ORG, WS, { action: "release", to: "+15551234567" });
    expect(setMetaAgentThreadOwner).toHaveBeenCalledTimes(2);
    expect(vi.mocked(setMetaAgentThreadOwner).mock.calls[0][0]).toMatchObject({
      phone: "15551234567",
      owner: "AI",
    });
  });
});

describe("onboarding", () => {
  test("posts a JSON body and no channel query parameter", async () => {
    metaReplies({ data: { agent_id: "a-1" } });
    await service.onboardAgent(ORG, WS, { channel: "whatsapp" });
    expect(lastCall().data).toEqual({});
    expect(lastCall().params).toEqual({});
  });

  test("forwards a catalog id when one is given", async () => {
    // Changelog 2026-09-08: catalog_id now applies to WhatsApp numbers.
    metaReplies({ data: { agent_id: "a-1" } });
    await service.onboardAgent(ORG, WS, { channel: "whatsapp", catalog_id: "123456789" });
    expect(lastCall().data).toEqual({ catalog_id: "123456789" });
  });
});

describe("agent settings", () => {
  test("handoff.enabled is thread release; a custom message needs CUSTOM, not enabled", () => {
    // enabled: "Controls whether the agent will release thread control after
    // sending a handoff message."
    expect(
      agentSettingsBodySchema.safeParse({
        handoff: { enabled: true, message_selection: "DEFAULT" },
      }).success,
    ).toBe(true);
    expect(
      agentSettingsBodySchema.safeParse({
        handoff: { enabled: false, message_selection: "CUSTOM" },
      }).success,
    ).toBe(false);
    expect(
      agentSettingsBodySchema.safeParse({
        handoff: { enabled: false, message_selection: "CUSTOM", message: "One moment" },
      }).success,
    ).toBe(true);
  });

  test("a sync clears handoff and follow-up Meta reports as unconfigured", async () => {
    metaReplies({
      data: [
        {
          agent_id: "meta-agent-1",
          channel: "whatsapp",
          rollout: { enabled: true },
          handoff: null,
          followup: null,
        },
      ],
    });
    db.metaBusinessAgent.findFirst.mockResolvedValue({ ...AGENT, neverSayPhrases: ["x"] });
    await service.syncAgentSettings(ORG, WS);
    const data = db.metaBusinessAgent.update.mock.calls[0][0].data;
    expect(data.handoffEnabled).toBeNull();
    expect(data.handoffMessage).toBeNull();
    expect(data.followupEnabled).toBeNull();
    expect(data.rolloutEnabled).toBe(true);
  });

  test("a sync leaves the never-say phrases alone: Meta never returns them", async () => {
    metaReplies({ data: [{ agent_id: "meta-agent-1", channel: "whatsapp", rollout: {} }] });
    await service.syncAgentSettings(ORG, WS);
    expect(db.metaBusinessAgent.update.mock.calls[0][0].data).not.toHaveProperty("neverSayPhrases");
  });

  test("a sync picks our agent out of every configuration Meta lists", async () => {
    metaReplies({
      data: [
        { agent_id: "someone-else", channel: "whatsapp", rollout: { enabled: false } },
        { agent_id: "meta-agent-1", channel: "whatsapp", rollout: { enabled: true } },
      ],
    });
    await service.syncAgentSettings(ORG, WS);
    expect(db.metaBusinessAgent.update.mock.calls[0][0].data.rolloutEnabled).toBe(true);
  });
});

describe("allowlist", () => {
  test("refuses the 21st number before calling Meta", async () => {
    db.metaAgentAllowlistEntry.findMany.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({ consumerPhoneNumber: `+1555000${i}` })),
    );
    await expect(service.addAllowlistEntry(ORG, WS, "+15559999999")).rejects.toThrow(/full/);
    expect(http).not.toHaveBeenCalled();
  });

  test("refuses a number that is already listed", async () => {
    db.metaAgentAllowlistEntry.findMany.mockResolvedValue([
      { consumerPhoneNumber: "+15551234567" },
    ]);
    await expect(service.addAllowlistEntry(ORG, WS, "+15551234567")).rejects.toThrow(/already/);
  });

  test("a 404 on delete still removes our row: Meta no longer has it", async () => {
    db.metaAgentAllowlistEntry.findFirstOrThrow.mockResolvedValue({ id: "e-1", metaId: "m-1" });
    metaReplies({ status: 404, data: { title: "Not found", detail: "no such entry" } });
    await service.removeAllowlistEntry(ORG, WS, "e-1");
    expect(db.metaAgentAllowlistEntry.delete).toHaveBeenCalledWith({ where: { id: "e-1" } });
  });

  test("any other failure still stops the delete", async () => {
    db.metaAgentAllowlistEntry.findFirstOrThrow.mockResolvedValue({ id: "e-1", metaId: "m-1" });
    metaReplies({ status: 500, data: { title: "Oops", detail: "down" } });
    await expect(service.removeAllowlistEntry(ORG, WS, "e-1")).rejects.toBeInstanceOf(
      MetaAgentApiError,
    );
    expect(db.metaAgentAllowlistEntry.delete).not.toHaveBeenCalled();
  });
});

describe("error trace ids", () => {
  test("come from the body, or the X-FB-Request-ID header when there is none", async () => {
    metaReplies({ status: 400, data: { title: "Bad", detail: "d", fbtrace_id: "body-id" } });
    const fromBody = await service.testAgent(ORG, WS, { user_msg: "hi" }).catch((e) => e);
    expect(fromBody.fbtraceId).toBe("body-id");

    metaReplies({ status: 502, data: undefined, headers: { "x-fb-request-id": "header-id" } });
    const fromHeader = await service.testAgent(ORG, WS, { user_msg: "hi" }).catch((e) => e);
    expect(fromHeader.fbtraceId).toBe("header-id");
  });
});

describe("skills", () => {
  test("sends only title, description and skill, and keeps the review status", async () => {
    metaReplies({ data: { id: "s-1", status: "pending_review" } });
    await service.createSkill(ORG, WS, { title: "t", description: "d", skill: "s" });
    expect(lastCall().data).toEqual({ title: "t", description: "d", skill: "s" });
    expect(db.metaAgentSkill.create.mock.calls[0][0].data.status).toBe("pending_review");
  });

  test("a title may not start or end with a hyphen", () => {
    const withTitle = (title: string) =>
      skillBodySchema.safeParse({ title, description: "d", skill: "s" }).success;
    expect(withTitle("order-status")).toBe(true);
    expect(withTitle("-order")).toBe(false);
    expect(withTitle("order-")).toBe(false);
  });
});

describe("ui skills", () => {
  test("offers reply buttons", () => {
    expect(
      uiSkillBodySchema.safeParse({
        title: "confirm",
        component_type: "interactive_reply_buttons",
        instruction: "Ask yes or no",
      }).success,
    ).toBe(true);
  });

  test("a flow id is rejected on anything but a flow", () => {
    expect(
      uiSkillBodySchema.safeParse({
        title: "link",
        component_type: "cta_url",
        instruction: "Send the link",
        flow_id: "123",
      }).success,
    ).toBe(false);
  });
});

describe("connector tools", () => {
  test("the national phone number macro is accepted", () => {
    const tool = {
      name: "lookup",
      description: "d",
      user_auth_required: false,
      request_definition: {
        method: "GET",
        path: "/orders",
        query_parameters: {
          phone: {
            type: "string",
            binding: { kind: "macro", macro: "WHATSAPP_PHONE_NUMBER_NATIONAL" },
          },
        },
      },
    };
    expect(connectorToolBodySchema.safeParse(tool).success).toBe(true);
  });

  test("a child node Meta returns as a JSON string is read as a node", () => {
    const parsed = bodyNodeSchema.parse({
      type: "array",
      items: JSON.stringify({ type: "string" }),
    });
    expect(parsed.items).toEqual({ type: "string" });
  });

  test("objects and arrays cannot be bound, and only objects have properties", () => {
    expect(
      bodyNodeSchema.safeParse({
        type: "object",
        properties: {},
        binding: { kind: "default", value: "x" },
      }).success,
    ).toBe(false);
    expect(bodyNodeSchema.safeParse({ type: "string", properties: {} }).success).toBe(false);
    expect(bodyNodeSchema.safeParse({ type: "string", items: { type: "string" } }).success).toBe(
      false,
    );
  });

  test("a connector Meta never registered is refused before any call", async () => {
    db.metaAgentConnector.findFirstOrThrow.mockResolvedValue({ id: "c-1", metaId: null });
    await expect(service.getConnectorLogs(ORG, WS, "c-1", {})).rejects.toThrow(/not registered/);
    expect(http).not.toHaveBeenCalled();
  });
});

describe("budget", () => {
  test("is addressed by the Business Manager, looked up from the WABA once", async () => {
    vi.mocked(callMetaApi).mockResolvedValue({
      data: { on_behalf_of_business_info: { id: "bm-9" } },
    } as any);
    metaReplies({ data: { budgets: [] } });
    await service.syncAgentBudgets(ORG, WS);
    expect(callMetaApi).toHaveBeenCalledWith(
      "/waba-1?fields=on_behalf_of_business_info,owner_business_info",
      "GET",
      "token",
    );
    expect(lastCall().url).toMatch(/\/bm-9\/agent_budget$/);
    expect(db.metaBusinessAgent.update).toHaveBeenCalledWith({
      where: { id: AGENT.id },
      data: { businessManagerId: "bm-9" },
    });
  });

  test("a cached Business Manager id skips the lookup", async () => {
    db.metaBusinessAgent.findFirst.mockResolvedValue({ ...AGENT, businessManagerId: "bm-1" });
    metaReplies({ data: { budgets: [] } });
    await service.syncAgentBudgets(ORG, WS);
    expect(callMetaApi).not.toHaveBeenCalled();
  });

  test("a save replaces the whole set with a POST", async () => {
    db.metaBusinessAgent.findFirst.mockResolvedValue({ ...AGENT, businessManagerId: "bm-1" });
    const budgets = [
      { unit_type: "token" as const, time_window: "one_day" as const, max_budget: 5 },
    ];
    metaReplies({ data: { budgets: [{ ...budgets[0], budget_id: "b-1" }] } });
    await service.updateAgentBudgets(ORG, WS, { budgets });
    expect(lastCall().method).toBe("POST");
    expect(lastCall().data).toEqual({ budgets });
  });

  test("the same unit and window may appear only once", () => {
    const cap = { unit_type: "ai_turn", time_window: "seven_days", max_budget: 10 };
    expect(agentBudgetsBodySchema.safeParse({ budgets: [cap, cap] }).success).toBe(false);
    expect(agentBudgetsBodySchema.safeParse({ budgets: [] }).success).toBe(true);
    expect(agentBudgetsBodySchema.safeParse({ budgets: [{ ...cap, max_budget: 0 }] }).success).toBe(
      false,
    );
  });
});

describe("insights", () => {
  test("conversation ranges may span 90 days, tool call ranges 30, both inclusive", () => {
    expect(
      conversationInsightsQuerySchema.safeParse({
        start_date: "2026-06-01",
        end_date: "2026-08-29",
      }).success,
    ).toBe(true);
    expect(
      conversationInsightsQuerySchema.safeParse({
        start_date: "2026-06-01",
        end_date: "2026-08-30",
      }).success,
    ).toBe(false);
    expect(
      toolCallInsightsQuerySchema.safeParse({ start_date: "2026-09-01", end_date: "2026-09-30" })
        .success,
    ).toBe(true);
    expect(
      toolCallInsightsQuerySchema.safeParse({ start_date: "2026-09-01", end_date: "2026-10-01" })
        .success,
    ).toBe(false);
  });

  test("turns look a phone number up as digits, and pass a BSUID through", async () => {
    metaReplies({ data: { data: [] } }, { data: { data: [] } });
    await service.getConversationTurns(ORG, WS, { user: "+1 (555) 123-4567" });
    expect(lastCall().params.user_phone_number).toBe("15551234567");
    await service.getConversationTurns(ORG, WS, { user: "US.2788620304833812" });
    expect(lastCall().params.user_phone_number).toBe("US.2788620304833812");
  });
});

describe("connector create", () => {
  const base = { name: "n", description: "d", base_url: "https://api.example.com" };
  const apiKey = { headers: [{ field_name: "Authorization", prefix: "Bearer ", value: "k" }] };

  test("carries the credentials Meta requires for an API_KEY connector", () => {
    // Without them Meta answers "The request is not valid for this connector".
    expect(
      connectorBodySchema.safeParse({
        ...base,
        auth_type: "API_KEY",
        auth_config: { api_key: apiKey },
      }).success,
    ).toBe(true);
  });

  test("refuses credentials for the wrong auth type", () => {
    expect(
      connectorBodySchema.safeParse({
        ...base,
        auth_type: "NONE",
        auth_config: { api_key: apiKey },
      }).success,
    ).toBe(false);
  });
});
