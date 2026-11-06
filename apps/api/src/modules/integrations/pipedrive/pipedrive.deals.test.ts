import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: { lead: { findUnique: vi.fn() } },
}));
vi.mock("../../../utils/redisConnection.js", () => ({
  default: { set: vi.fn(), del: vi.fn() },
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
vi.mock("./pipedrive.contacts.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./pipedrive.contacts.js")>()),
  pipedrivePersonIdFor: vi.fn(),
}));

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock("./pipedrive.client.js", () => ({ pipedriveClientFor: vi.fn(async () => client) }));

import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import {
  findLinkByRateupId,
  hashSyncPayload,
  recordLink,
  removeLink,
} from "../shared/entityLink.js";
import { PIPEDRIVE_JOB_OPTIONS, pipedrivePersonIdFor } from "./pipedrive.contacts.js";
import {
  handlePipedriveDealEvent,
  listPipedrivePipelines,
  PIPEDRIVE_DEAL_UPSERT,
  processPipedriveDealJob,
  toPipedriveDealFields,
} from "./pipedrive.deals.js";

type Mock = ReturnType<typeof vi.fn>;
const findLead = prisma.lead.findUnique as unknown as Mock;
const findLink = findLinkByRateupId as unknown as Mock;
const addJob = integrationTriggerQueue.add as unknown as Mock;
const personIdFor = pipedrivePersonIdFor as unknown as Mock;

const LINK = { integrationId: "int-1", entityType: "lead" };

const SETTINGS = {
  dealPipelineId: 1,
  stageMappings: [{ stageId: "col-new", pipedriveStageId: 11 }],
};

const integration = (credential: Record<string, unknown> = {}) =>
  ({
    id: "int-1",
    orgId: "org-1",
    credential: {
      access_token: "at",
      refresh_token: "rt",
      apiDomain: "https://acme.pipedrive.com",
      companyId: 9100,
      syncDeals: true,
      ...SETTINGS,
      ...credential,
    },
  }) as never;

const lead = (over: Record<string, unknown> = {}) => ({
  id: "lead-1",
  name: "Asha Nair — bulk order",
  stageId: "col-new",
  stage: { status: "OPEN" },
  lostReason: null,
  pipeline: { orgId: "org-1", type: "LEADS" },
  contact: { id: "c-1", name: "Asha Nair", email: "asha@example.com", phone: "919876543210" },
  ...over,
});

const OPEN = { title: "Asha Nair — bulk order", pipeline_id: 1, stage_id: 11, status: "open" };

const job = {
  integrationName: "pipedrive",
  triggerKey: PIPEDRIVE_DEAL_UPSERT,
  orgId: "org-1",
  data: { leadId: "lead-1" },
};

beforeEach(() => {
  vi.clearAllMocks();
  findLead.mockResolvedValue(lead());
  findLink.mockResolvedValue(null);
  personIdFor.mockResolvedValue(77);
  client.post.mockResolvedValue({ data: { data: { id: 900 } } });
  client.patch.mockResolvedValue({ data: { data: { id: 900 } } });
});

describe("a lead as deal fields", () => {
  test("an open column sends its mapped stage", () => {
    expect(toPipedriveDealFields(lead() as never, SETTINGS)).toEqual(OPEN);
  });

  test("an unmapped open column sends nothing", () => {
    expect(toPipedriveDealFields(lead({ stageId: "col-other" }) as never, SETTINGS)).toBeNull();
  });

  test("a Won column marks the deal won and leaves its stage", () => {
    expect(
      toPipedriveDealFields(
        lead({ stageId: "col-won", stage: { status: "WON" } }) as never,
        SETTINGS,
      ),
    ).toEqual({ title: "Asha Nair — bulk order", pipeline_id: 1, status: "won" });
  });

  test("a Lost column marks the deal lost, with the lead's lost reason", () => {
    expect(
      toPipedriveDealFields(
        lead({ stage: { status: "LOST" }, lostReason: { label: "Too expensive" } }) as never,
        SETTINGS,
      ),
    ).toEqual({
      title: "Asha Nair — bulk order",
      pipeline_id: 1,
      status: "lost",
      lost_reason: "Too expensive",
    });
  });
});

describe("lead events", () => {
  const context = { orgId: "org-1", integration: integration() } as never;
  const event = (over: Record<string, unknown> = {}) =>
    ({
      type: "lead.stage_changed",
      lead: { id: "lead-1", contactId: "c-1" },
      stage: { pipelineType: "LEADS" },
      origin: "user",
      ...over,
    }) as never;

  test("a move on the Leads board queues a push with only the lead's id", async () => {
    await handlePipedriveDealEvent(event(), context);
    expect(addJob).toHaveBeenCalledWith(
      "pipedrive-deal-upsert",
      expect.objectContaining({ data: { leadId: "lead-1" }, rateupContactId: "c-1" }),
      PIPEDRIVE_JOB_OPTIONS,
    );
  });

  test("other boards, and moves made by an integration, send nothing", async () => {
    await handlePipedriveDealEvent(event({ stage: { pipelineType: "SUPPORT" } }), context);
    await handlePipedriveDealEvent(event({ origin: "integration" }), context);
    expect(addJob).not.toHaveBeenCalled();
  });
});

describe("sending a lead", () => {
  test("nothing is sent with the switch off or no pipeline picked", async () => {
    expect(await processPipedriveDealJob(integration({ syncDeals: false }), job)).toBe("sync_off");
    expect(await processPipedriveDealJob(integration({ dealPipelineId: undefined }), job)).toBe(
      "sync_off",
    );
  });

  test("a lead on another board or org is not sent", async () => {
    findLead.mockResolvedValue(lead({ pipeline: { orgId: "org-1", type: "SUPPORT" } }));
    expect(await processPipedriveDealJob(integration(), job)).toBe("lead_gone");
    findLead.mockResolvedValue(lead({ pipeline: { orgId: "org-2", type: "LEADS" } }));
    expect(await processPipedriveDealJob(integration(), job)).toBe("lead_gone");
  });

  test("a lead in an unmapped column is not sent", async () => {
    findLead.mockResolvedValue(lead({ stageId: "col-other" }));
    expect(await processPipedriveDealJob(integration(), job)).toBe("unmapped");
    expect(client.post).not.toHaveBeenCalled();
  });

  test("a new lead becomes a deal on its contact's person, and is linked", async () => {
    expect(await processPipedriveDealJob(integration(), job)).toBe("created");
    expect(client.post).toHaveBeenCalledWith("/v2/deals", { ...OPEN, person_id: 77 });
    expect(recordLink).toHaveBeenCalledWith(LINK, {
      rateupId: "lead-1",
      externalId: "900",
      payload: OPEN,
    });
  });

  test("a lead with no contact becomes a deal without a person", async () => {
    findLead.mockResolvedValue(lead({ contact: null }));
    await processPipedriveDealJob(integration(), job);
    expect(client.post).toHaveBeenCalledWith("/v2/deals", OPEN);
    expect(personIdFor).not.toHaveBeenCalled();
  });

  test("a linked lead that has not changed is skipped", async () => {
    findLink.mockResolvedValue({ externalId: "900", lastSyncHash: hashSyncPayload(OPEN) });
    expect(await processPipedriveDealJob(integration(), job)).toBe("unchanged");
    expect(client.patch).not.toHaveBeenCalled();
  });

  test("a linked lead moved to Won marks its deal won", async () => {
    findLink.mockResolvedValue({ externalId: "900", lastSyncHash: hashSyncPayload(OPEN) });
    findLead.mockResolvedValue(lead({ stageId: "col-won", stage: { status: "WON" } }));

    expect(await processPipedriveDealJob(integration(), job)).toBe("updated");
    expect(client.patch).toHaveBeenCalledWith("/v2/deals/900", {
      title: "Asha Nair — bulk order",
      pipeline_id: 1,
      status: "won",
    });
  });

  test("a deal deleted in Pipedrive is created again", async () => {
    findLink.mockResolvedValue({ externalId: "900", lastSyncHash: "old" });
    client.patch.mockResolvedValue({ data: { data: { id: 900, is_deleted: true } } });

    expect(await processPipedriveDealJob(integration(), job)).toBe("created");
    expect(removeLink).toHaveBeenCalledWith(LINK, "lead-1");
  });

  test("a 404 on the linked deal also creates it again", async () => {
    findLink.mockResolvedValue({ externalId: "900", lastSyncHash: "old" });
    client.patch.mockRejectedValue({ isAxiosError: true, response: { status: 404 } });

    expect(await processPipedriveDealJob(integration(), job)).toBe("created");
  });

  test("any other failure is left to the queue's retry", async () => {
    findLink.mockResolvedValue({ externalId: "900", lastSyncHash: "old" });
    client.patch.mockRejectedValue({ isAxiosError: true, response: { status: 429 } });

    await expect(processPipedriveDealJob(integration(), job)).rejects.toMatchObject({
      response: { status: 429 },
    });
    expect(client.post).not.toHaveBeenCalled();
  });
});

test("pipelines come with their live stages, in Pipedrive's order, across pages", async () => {
  client.get.mockImplementation(async (url: string, options: { params: { cursor?: string } }) => {
    if (url === "/v2/pipelines") {
      return {
        data: {
          data: [
            { id: 2, name: "Renewals", order_nr: 2 },
            { id: 1, name: "Sales", order_nr: 1 },
            { id: 3, name: "Old", order_nr: 3, is_deleted: true },
          ],
        },
      };
    }
    if (!options.params.cursor) {
      return {
        data: {
          data: [
            { id: 12, name: "Proposal", order_nr: 2, pipeline_id: 1 },
            { id: 21, name: "Due", order_nr: 1, pipeline_id: 2 },
          ],
          additional_data: { next_cursor: "page-2" },
        },
      };
    }
    return {
      data: {
        data: [
          { id: 11, name: "Qualified", order_nr: 1, pipeline_id: 1 },
          { id: 13, name: "Gone", order_nr: 3, pipeline_id: 1, is_deleted: true },
        ],
      },
    };
  });

  expect(await listPipedrivePipelines(client as never)).toEqual([
    {
      id: 1,
      name: "Sales",
      stages: [
        { id: 11, name: "Qualified" },
        { id: 12, name: "Proposal" },
      ],
    },
    { id: 2, name: "Renewals", stages: [{ id: 21, name: "Due" }] },
  ]);
});
