import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const { contact, lead, queueAdd } = vi.hoisted(() => ({
  contact: { findFirst: vi.fn(), update: vi.fn() },
  lead: { findFirst: vi.fn() },
  queueAdd: vi.fn(),
}));
vi.mock("../../../../utils/prisma.js", () => ({
  default: { contact, lead, integration: { findFirst: vi.fn() } },
}));

vi.mock("../../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: (...a: unknown[]) => queueAdd(...a) },
}));

vi.mock("../../../pipeline/pipelineLead/lead.service.js", () => ({
  moveLead: vi.fn(),
  resolvePipelineForContact: vi.fn(),
  setContactStage: vi.fn(),
}));

// The real receiver pulls in the whole provider registry.
vi.mock("../../shared/inboundWebhookContract.js", () => ({
  InboundWebhookRejected: class InboundWebhookRejected extends Error {},
}));

vi.mock("./zoho.auth.js", () => ({ getValidZohoAccessToken: vi.fn() }));
vi.mock("./zoho.client.js", () => ({ getZohoRecordById: vi.fn() }));

import { InboundWebhookRejected } from "../../shared/inboundWebhookContract.js";
import {
  moveLead,
  resolvePipelineForContact,
  setContactStage,
} from "../../../pipeline/pipelineLead/lead.service.js";
import { getValidZohoAccessToken } from "./zoho.auth.js";
import { getZohoRecordById } from "./zoho.client.js";
import { handleZohoInbound, processZohoInboundJob } from "./zoho.inbound.js";
import { ZOHO_INBOUND } from "./zoho.types.js";

type Mock = ReturnType<typeof vi.fn>;

const ORG = "11111111-1111-1111-1111-111111111111";

const on = (...fields: string[]) => fields.map((f) => ({ subscribed_field: f, active: true }));

const integration = (credential: Record<string, unknown> = {}) =>
  ({
    id: "int-1",
    orgId: ORG,
    name: "zoho",
    active: true,
    credential: {
      zohoWebhookSecret: "shared-secret",
      api_domain: "https://www.zohoapis.in",
      crmWebhook: { channelId: "chan-crm", product: "crm" },
      biginWebhook: { channelId: "chan-bigin", product: "bigin" },
      triggerSubscriptions: on("contact_webhook", "lead_webhook", "bigin_deal_webhook"),
      ...credential,
    },
  }) as any;

const delivery = (over: Record<string, unknown> = {}) =>
  ({
    body: {
      channel_id: "chan-crm",
      token: "shared-secret",
      ids: ["z-1"],
      module: "Contacts",
      operation: "update",
      ...over,
    },
  }) as any;

beforeEach(() => {
  vi.clearAllMocks();
  (getValidZohoAccessToken as unknown as Mock).mockResolvedValue("zoho-access");
  contact.findFirst.mockResolvedValue(null);
  lead.findFirst.mockResolvedValue(null);
});

describe("handleZohoInbound", () => {
  test("queues the record, with the product read from the channel", async () => {
    await handleZohoInbound(integration(), delivery());

    expect(queueAdd).toHaveBeenCalledOnce();
    expect(queueAdd.mock.calls[0][1]).toEqual({
      integrationName: "zoho",
      triggerKey: ZOHO_INBOUND,
      orgId: ORG,
      data: { product: "crm", module: "Contacts", recordId: "z-1" },
    });
  });

  test("tells the products apart by channel", async () => {
    await handleZohoInbound(integration(), delivery({ channel_id: "chan-bigin", module: "Deals" }));

    expect(queueAdd.mock.calls[0][1].data).toEqual({
      product: "bigin",
      module: "Deals",
      recordId: "z-1",
    });
  });

  test("reads a Bigin notification naming the deals module by its API name", async () => {
    await handleZohoInbound(
      integration(),
      delivery({ channel_id: "chan-bigin", module: "Pipelines" }),
    );

    expect(queueAdd.mock.calls[0][1].data).toMatchObject({ product: "bigin", module: "Deals" });
  });

  // Previously only the first id of a batch was processed.
  test("queues every record in a batch", async () => {
    await handleZohoInbound(integration(), delivery({ ids: ["z-1", "z-2"] }));

    expect(queueAdd.mock.calls.map((call) => call[1].data.recordId)).toEqual(["z-1", "z-2"]);
  });

  test("rejects a token that does not match the stored secret", async () => {
    await expect(handleZohoInbound(integration(), delivery({ token: "guessed" }))).rejects.toThrow(
      InboundWebhookRejected,
    );
    expect(queueAdd).not.toHaveBeenCalled();
  });

  test("rejects every token when no secret is stored", async () => {
    await expect(
      handleZohoInbound(integration({ zohoWebhookSecret: undefined }), delivery()),
    ).rejects.toThrow(InboundWebhookRejected);
  });

  test("rejects a delivery on a channel this integration does not hold", async () => {
    await expect(
      handleZohoInbound(integration(), delivery({ channel_id: "chan-other" })),
    ).rejects.toThrow(InboundWebhookRejected);
  });

  test("ignores a delete: there is no record left to fetch", async () => {
    await handleZohoInbound(integration(), delivery({ operation: "delete" }));

    expect(queueAdd).not.toHaveBeenCalled();
  });

  test("ignores a module Rateup does not sync", async () => {
    await handleZohoInbound(integration(), delivery({ module: "Accounts" }));

    expect(queueAdd).not.toHaveBeenCalled();
  });

  test("ignores a module whose switch is off", async () => {
    await handleZohoInbound(
      integration({ triggerSubscriptions: on("lead_webhook") }),
      delivery({ module: "Contacts" }),
    );

    expect(queueAdd).not.toHaveBeenCalled();
  });
});

describe("processZohoInboundJob", () => {
  const job = (data: Record<string, unknown>) =>
    ({ integrationName: "zoho", triggerKey: ZOHO_INBOUND, orgId: ORG, data }) as any;

  test("fetches the named record from the right product", async () => {
    (getZohoRecordById as unknown as Mock).mockResolvedValue({ data: [{ id: "z-1" }] });

    await processZohoInboundJob(
      integration(),
      job({ product: "bigin", module: "Deals", recordId: "z-1" }),
    );

    expect(getZohoRecordById).toHaveBeenCalledWith(
      "zoho-access",
      "Deals",
      "z-1",
      "https://www.zohoapis.in",
      "bigin",
    );
  });

  test("writes the CRM lead onto its linked contact and moves it to the mapped column", async () => {
    (getZohoRecordById as unknown as Mock).mockResolvedValue({
      data: [{ id: "z-1", Full_Name: "Ann Smith", Lead_Status: "Qualified Lead" }],
    });
    contact.findFirst.mockResolvedValue({ id: "c-1", orgId: ORG });
    contact.update.mockResolvedValue({ id: "c-1", orgId: ORG });
    (resolvePipelineForContact as unknown as Mock).mockResolvedValue("pipe-1");

    await processZohoInboundJob(
      integration({
        crm: {
          leadLifecycleMappings: [
            { stageId: "stage-q", stageName: "Qualified", zohoLeadStatus: "Qualified Lead" },
          ],
        },
      }),
      job({ product: "crm", module: "Leads", recordId: "z-1" }),
    );

    expect(contact.findFirst.mock.calls[0][0].where.integrationIds).toEqual({
      path: ["zoho", "lead", "id"],
      equals: "z-1",
    });
    expect(contact.update.mock.calls[0][0].data.name).toBe("Ann Smith");
    expect(setContactStage).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: "c-1", stageId: "stage-q", syncIntegrations: false }),
    );
  });

  // A board-only lead holds its own Bigin deal id; the contact lookup cannot find it.
  test("moves a board-only lead when its Bigin deal changes stage", async () => {
    (getZohoRecordById as unknown as Mock).mockResolvedValue({
      data: [{ id: "deal-1", Stage: "Closed Won" }],
    });
    lead.findFirst.mockResolvedValue({ id: "lead-1", stageId: "stage-q" });

    await processZohoInboundJob(
      integration({
        bigin: {
          pipeline: {
            lifecycleStageMappings: [{ stageId: "stage-w", biginStageName: "Closed Won" }],
          },
        },
      }),
      job({ product: "bigin", module: "Deals", recordId: "deal-1" }),
    );

    expect(moveLead).toHaveBeenCalledWith("lead-1", "stage-w", null, false);
  });
});
