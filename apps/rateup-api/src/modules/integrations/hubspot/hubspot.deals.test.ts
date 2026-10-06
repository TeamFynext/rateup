import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: { lead: { findUnique: vi.fn() } },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));
vi.mock("../shared/entityLink.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shared/entityLink.js")>()),
  findLinkByRateupId: vi.fn(),
  recordLink: vi.fn(),
  removeLink: vi.fn(),
}));
vi.mock("./hubspot.contacts.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./hubspot.contacts.js")>()),
  hubSpotContactIdFor: vi.fn(),
}));

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock("./hubspot.auth.js", () => ({ hubSpotClientFor: vi.fn(async () => client) }));

import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import type { IntegrationEventOf } from "../events/integrationEvent.types.js";
import {
  findLinkByRateupId,
  hashSyncPayload,
  recordLink,
  removeLink,
} from "../shared/entityLink.js";
import { HUBSPOT_JOB_OPTIONS, hubSpotContactIdFor } from "./hubspot.contacts.js";
import {
  handleHubSpotDealEvent,
  HUBSPOT_DEAL_UPSERT,
  listHubSpotDealPipelines,
  processHubSpotDealJob,
} from "./hubspot.deals.js";

type Mock = ReturnType<typeof vi.fn>;
const findLead = prisma.lead.findUnique as unknown as Mock;
const findLink = findLinkByRateupId as unknown as Mock;
const addJob = integrationTriggerQueue.add as unknown as Mock;
const contactIdFor = hubSpotContactIdFor as unknown as Mock;

const LINK = { integrationId: "int-1", entityType: "lead" };

const integration = (credential: Record<string, unknown> = {}) =>
  ({
    id: "int-1",
    orgId: "org-1",
    credential: {
      access_token: "at",
      refresh_token: "rt",
      portalId: 4401,
      syncDeals: true,
      dealPipelineId: "default",
      stageMappings: [
        { stageId: "col-new", hubspotStageId: "appointmentscheduled" },
        { stageId: "col-won", hubspotStageId: "closedwon" },
      ],
      ...credential,
    },
  }) as never;

const lead = (over: Record<string, unknown> = {}) => ({
  id: "lead-1",
  name: "Asha Nair — bulk order",
  stageId: "col-new",
  pipeline: { orgId: "org-1", type: "LEADS" },
  contact: { id: "c-1", name: "Asha Nair", email: "asha@example.com", phone: "919876543210" },
  ...over,
});

const PROPERTIES = {
  dealname: "Asha Nair — bulk order",
  pipeline: "default",
  dealstage: "appointmentscheduled",
};

const job = {
  integrationName: "hubspot",
  triggerKey: HUBSPOT_DEAL_UPSERT,
  orgId: "org-1",
  data: { leadId: "lead-1" },
};

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), {
    isAxiosError: true,
    response: { status, data: {} },
  });

const stageEvent = (
  over: Partial<IntegrationEventOf<"lead.stage_changed">> = {},
): IntegrationEventOf<"lead.stage_changed"> => ({
  type: "lead.stage_changed",
  lead: {
    id: "lead-1",
    contactId: "c-1",
    name: "Asha",
    email: null,
    phone: null,
    source: "MANUAL",
  },
  stage: {
    id: "col-new",
    name: "New",
    status: "OPEN",
    pipelineId: "p-1",
    pipelineName: "Leads",
    pipelineType: "LEADS",
  },
  contact: null,
  origin: "rateup",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  findLead.mockResolvedValue(lead());
  findLink.mockResolvedValue(null);
  contactIdFor.mockResolvedValue("501");
  client.post.mockResolvedValue({ data: { id: "9001" } });
});

describe("lead events", () => {
  const context = { orgId: "org-1", integration: integration() };

  test("a move on the Leads board is queued by id, with the contact's id", async () => {
    await handleHubSpotDealEvent(stageEvent(), context);
    expect(addJob).toHaveBeenCalledWith(
      "hubspot-deal-upsert",
      expect.objectContaining({
        triggerKey: HUBSPOT_DEAL_UPSERT,
        data: { leadId: "lead-1" },
        rateupLeadId: "lead-1",
        rateupContactId: "c-1",
      }),
      HUBSPOT_JOB_OPTIONS,
    );
  });

  test("a lead arriving on the board is queued too", async () => {
    await handleHubSpotDealEvent({ ...stageEvent(), type: "lead.created" }, context);
    expect(addJob).toHaveBeenCalledTimes(1);
  });

  test("a move an integration made is not sent back, and other boards are not followed", async () => {
    await handleHubSpotDealEvent(stageEvent({ origin: "integration" }), context);
    await handleHubSpotDealEvent(
      stageEvent({ stage: { ...stageEvent().stage, pipelineType: "SALES" } }),
      context,
    );
    expect(addJob).not.toHaveBeenCalled();
  });
});

describe("sending a lead as a deal", () => {
  test("nothing is sent while the switch is off or no pipeline is picked", async () => {
    await expect(processHubSpotDealJob(integration({ syncDeals: false }), job)).resolves.toBe(
      "sync_off",
    );
    await expect(
      processHubSpotDealJob(integration({ dealPipelineId: undefined }), job),
    ).resolves.toBe("sync_off");
    expect(findLead).not.toHaveBeenCalled();
  });

  test("a lead deleted, or no longer on the Leads board, is skipped", async () => {
    findLead.mockResolvedValueOnce(null);
    await expect(processHubSpotDealJob(integration(), job)).resolves.toBe("lead_gone");
    findLead.mockResolvedValueOnce(lead({ pipeline: { orgId: "org-1", type: "SALES" } }));
    await expect(processHubSpotDealJob(integration(), job)).resolves.toBe("lead_gone");
  });

  test("a lead in an unmapped column sends nothing", async () => {
    findLead.mockResolvedValue(lead({ stageId: "col-unmapped" }));
    await expect(processHubSpotDealJob(integration(), job)).resolves.toBe("unmapped");
    expect(client.post).not.toHaveBeenCalled();
  });

  test("a new deal goes on the lead's contact, in the mapped stage", async () => {
    await expect(processHubSpotDealJob(integration(), job)).resolves.toBe("created");

    expect(contactIdFor).toHaveBeenCalledWith(
      expect.objectContaining({ id: "int-1" }),
      client,
      lead().contact,
    );
    expect(client.post).toHaveBeenCalledWith("/crm/v3/objects/deals", {
      properties: PROPERTIES,
      associations: [
        {
          to: { id: "501" },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
        },
      ],
    });
    expect(recordLink).toHaveBeenCalledWith(LINK, {
      rateupId: "lead-1",
      externalId: "9001",
      payload: PROPERTIES,
    });
  });

  test("a lead with no contact, or one HubSpot cannot hold, gets a deal on its own", async () => {
    contactIdFor.mockResolvedValue(null);
    await processHubSpotDealJob(integration(), job);
    expect(client.post).toHaveBeenCalledWith("/crm/v3/objects/deals", { properties: PROPERTIES });

    findLead.mockResolvedValue(lead({ contact: null }));
    contactIdFor.mockClear();
    await processHubSpotDealJob(integration(), job);
    expect(contactIdFor).not.toHaveBeenCalled();
  });

  test("a linked deal is moved to the mapped stage", async () => {
    findLead.mockResolvedValue(lead({ stageId: "col-won" }));
    findLink.mockResolvedValue({ externalId: "9001", lastSyncHash: hashSyncPayload(PROPERTIES) });

    await expect(processHubSpotDealJob(integration(), job)).resolves.toBe("updated");
    expect(client.patch).toHaveBeenCalledWith("/crm/v3/objects/deals/9001", {
      properties: { ...PROPERTIES, dealstage: "closedwon" },
    });
    expect(client.post).not.toHaveBeenCalled();
  });

  test("a push identical to the last one makes no call", async () => {
    findLink.mockResolvedValue({ externalId: "9001", lastSyncHash: hashSyncPayload(PROPERTIES) });
    await expect(processHubSpotDealJob(integration(), job)).resolves.toBe("unchanged");
    expect(client.patch).not.toHaveBeenCalled();
  });

  test("a deal deleted in HubSpot is created again", async () => {
    findLink.mockResolvedValue({ externalId: "9001", lastSyncHash: "older" });
    client.patch.mockRejectedValueOnce(httpError(404));

    await expect(processHubSpotDealJob(integration(), job)).resolves.toBe("created");
    expect(removeLink).toHaveBeenCalledWith(LINK, "lead-1");
    expect(client.post).toHaveBeenCalledTimes(1);
  });

  test("any other HubSpot error fails the job, so it is retried", async () => {
    client.post.mockRejectedValueOnce(httpError(429));
    await expect(processHubSpotDealJob(integration(), job)).rejects.toThrow("HTTP 429");
    expect(recordLink).not.toHaveBeenCalled();
  });
});

describe("deal pipelines", () => {
  test("pipelines and their stages come back in HubSpot's order", async () => {
    client.get.mockResolvedValue({
      data: {
        results: [
          { id: "p2", label: "Renewals", displayOrder: 1, stages: [] },
          {
            id: "default",
            label: "Sales Pipeline",
            displayOrder: 0,
            stages: [
              { id: "closedwon", label: "Closed won", displayOrder: 5 },
              { id: "appointmentscheduled", label: "Appointment scheduled", displayOrder: 0 },
            ],
          },
        ],
      },
    });

    const pipelines = await listHubSpotDealPipelines(client as never);
    expect(client.get).toHaveBeenCalledWith("/crm/v3/pipelines/deals");
    expect(pipelines.map((p) => p.id)).toEqual(["default", "p2"]);
    expect(pipelines[0].stages.map((s) => s.id)).toEqual(["appointmentscheduled", "closedwon"]);
  });
});
