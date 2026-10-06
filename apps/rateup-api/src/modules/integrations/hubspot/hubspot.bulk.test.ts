import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findUnique: vi.fn(), update: vi.fn() },
    contact: { findMany: vi.fn() },
    lead: { findMany: vi.fn() },
    integrationEntityLink: { findMany: vi.fn() },
  },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));
vi.mock("../shared/entityLink.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shared/entityLink.js")>()),
  findLinkByExternalId: vi.fn(),
  recordLink: vi.fn(),
}));
vi.mock("./hubspot.inbound.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./hubspot.inbound.js")>()),
  importHubSpotContact: vi.fn(),
}));
vi.mock("./hubspot.deals.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./hubspot.deals.js")>()),
  processHubSpotDealJob: vi.fn(),
}));

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./hubspot.auth.js", () => ({ hubSpotClientFor: vi.fn(async () => client) }));

import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import { findLinkByExternalId, recordLink } from "../shared/entityLink.js";
import { OAuthConnectError } from "../shared/oauthConnectError.js";
import {
  bulkTiming,
  HUBSPOT_BULK,
  processHubSpotBulkJob,
  startHubSpotBulk,
} from "./hubspot.bulk.js";
import { processHubSpotDealJob } from "./hubspot.deals.js";
import { importHubSpotContact } from "./hubspot.inbound.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;
const importContact = importHubSpotContact as unknown as Mock;
const sendDeal = processHubSpotDealJob as unknown as Mock;
const addJob = integrationTriggerQueue.add as unknown as Mock;

const BASE = { access_token: "at", refresh_token: "rt", portalId: 4401 };

const integration = (credential: Record<string, unknown> = {}) =>
  ({ id: "int-1", orgId: "org-1", active: true, credential: { ...BASE, ...credential } }) as never;

const job = (kind: "import" | "export") => ({
  integrationName: "hubspot",
  triggerKey: HUBSPOT_BULK,
  orgId: "org-1",
  data: { kind },
});

/** The last run saved for a kind, as the credential holds it. */
const savedRun = (kind: "import" | "export") => {
  const calls = db.integration.update.mock.calls;
  return calls[calls.length - 1][0].data.credential.bulk[kind];
};

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status } });

beforeEach(() => {
  vi.clearAllMocks();
  bulkTiming.sleep = vi.fn(async () => {});
  db.integration.findUnique.mockResolvedValue({ credential: BASE });
  db.integrationEntityLink.findMany.mockResolvedValue([]);
  (findLinkByExternalId as Mock).mockResolvedValue(null);
});

describe("starting a run", () => {
  test("marks it running and queues one attempt", async () => {
    db.integration.findUnique.mockResolvedValue(integration());
    await startHubSpotBulk("org-1", "import");

    expect(savedRun("import")).toMatchObject({ status: "running", created: 0 });
    expect(addJob).toHaveBeenCalledWith(
      "hubspot-bulk-import",
      expect.objectContaining({ triggerKey: HUBSPOT_BULK, data: { kind: "import" } }),
      { attempts: 1, removeOnComplete: true },
    );
  });

  test("a second run of the same kind waits for the first; a stale one does not block", async () => {
    const running = (startedAt: string) =>
      integration({ bulk: { import: { status: "running", startedAt } } });

    db.integration.findUnique.mockResolvedValue(running(new Date().toISOString()));
    await expect(startHubSpotBulk("org-1", "import")).rejects.toBeInstanceOf(OAuthConnectError);

    db.integration.findUnique.mockResolvedValue(running("2020-01-01T00:00:00.000Z"));
    await expect(startHubSpotBulk("org-1", "import")).resolves.toBeUndefined();
  });
});

describe("importing from HubSpot", () => {
  test("pages through every contact and counts what became of each", async () => {
    client.get
      .mockResolvedValueOnce({
        data: {
          results: [
            { id: "1", properties: { phone: "+919800000001" } },
            { id: "2", properties: { phone: "+919800000002" } },
          ],
          paging: { next: { after: "2" } },
        },
      })
      .mockResolvedValueOnce({
        data: {
          results: [
            { id: "3", properties: { email: "x@example.com" } },
            { id: "4", properties: {} },
          ],
        },
      });
    (findLinkByExternalId as Mock).mockImplementation(async (_key, id) =>
      id === "4" ? { rateupId: "c-4" } : null,
    );
    importContact
      .mockResolvedValueOnce({ outcome: "created" })
      .mockResolvedValueOnce({ outcome: "linked" })
      .mockResolvedValueOnce({ outcome: "no_phone" });

    const run = await processHubSpotBulkJob(integration(), job("import"));

    expect(client.get.mock.calls[1][1].params.after).toBe("2");
    expect(run).toMatchObject({ status: "done", created: 1, linked: 1, skipped: 2, failed: 0 });
    expect(savedRun("import")).toMatchObject({ status: "done", created: 1 });
  });

  test("a rate limit is waited out, and a failure is recorded on the run", async () => {
    client.get
      .mockRejectedValueOnce(httpError(429))
      .mockResolvedValueOnce({ data: { results: [] } });
    await expect(processHubSpotBulkJob(integration(), job("import"))).resolves.toMatchObject({
      status: "done",
    });
    expect(bulkTiming.sleep).toHaveBeenCalledWith(10_000);

    client.get.mockRejectedValueOnce(httpError(401));
    await expect(processHubSpotBulkJob(integration(), job("import"))).resolves.toMatchObject({
      status: "failed",
      error: "HTTP 401",
    });
  });
});

describe("sending existing contacts to HubSpot", () => {
  const contacts = [
    { id: "c-1", name: "Asha Nair", email: "asha@example.com", phone: "919800000001" },
    { id: "c-2", name: "Ravi", email: null, phone: "919800000002" },
    { id: "c-3", name: "Meera", email: "meera@example.com", phone: null },
    { id: "c-4", name: "Linked", email: "l@example.com", phone: null },
  ];

  beforeEach(() => {
    db.contact.findMany.mockResolvedValueOnce(contacts).mockResolvedValue([]);
    db.integrationEntityLink.findMany.mockResolvedValue([{ rateupId: "c-4" }]);
  });

  test("links by email and phone in two calls, then creates the rest in one", async () => {
    client.post.mockImplementation(async (path: string) => {
      if (path.endsWith("/batch/read")) {
        return { data: { results: [{ id: "501", properties: { email: "asha@example.com" } }] } };
      }
      if (path.endsWith("/search")) {
        return { data: { results: [{ id: "502", properties: { phone: "+919800000002" } }] } };
      }
      return { data: { results: [{ id: "601", properties: { email: "meera@example.com" } }] } };
    });

    const run = await processHubSpotBulkJob(integration(), job("export"));

    expect(client.post).toHaveBeenCalledTimes(3);
    expect(client.post.mock.calls[0][1]).toMatchObject({
      idProperty: "email",
      inputs: [{ id: "asha@example.com" }, { id: "meera@example.com" }],
    });
    // Only numbers whose owner was not found by email are searched.
    expect(client.post.mock.calls[1][1].filterGroups[0].filters[0]).toEqual({
      propertyName: "phone",
      operator: "IN",
      values: ["+919800000002"],
    });
    expect(client.post.mock.calls[2][1].inputs).toEqual([
      { properties: { firstname: "Meera", email: "meera@example.com" } },
    ]);
    const links = (recordLink as Mock).mock.calls.map(([, link]) => [
      link.rateupId,
      link.externalId,
    ]);
    expect(links).toEqual([
      ["c-1", "501"],
      ["c-2", "502"],
      ["c-3", "601"],
    ]);
    expect(run).toMatchObject({ status: "done", linked: 2, created: 1, skipped: 1 });
    expect(run.deals).toBeUndefined();
  });

  test("a batch create refused as a whole falls back to one create each", async () => {
    client.post.mockImplementation(
      async (path: string, body: { properties?: { email?: string } }) => {
        if (path.endsWith("/batch/read") || path.endsWith("/search"))
          return { data: { results: [] } };
        if (path.endsWith("/batch/create")) throw httpError(400);
        if (body.properties?.email === "meera@example.com") throw httpError(400);
        return { data: { id: `new-${body.properties?.email ?? "phone"}` } };
      },
    );

    const run = await processHubSpotBulkJob(integration(), job("export"));
    expect(run).toMatchObject({ created: 2, failed: 1 });
  });

  test("with deals on, unlinked leads in mapped columns are sent as deals", async () => {
    client.post.mockResolvedValue({ data: { results: [] } });
    db.lead.findMany.mockResolvedValueOnce([{ id: "lead-1" }, { id: "lead-2" }, { id: "lead-3" }]);
    db.integrationEntityLink.findMany
      .mockResolvedValueOnce([{ rateupId: "c-4" }])
      .mockResolvedValueOnce([{ rateupId: "lead-3" }]);
    sendDeal.mockResolvedValueOnce("created").mockResolvedValueOnce("unmapped");

    const run = await processHubSpotBulkJob(
      integration({
        syncDeals: true,
        dealPipelineId: "default",
        stageMappings: [{ stageId: "col-1", hubspotStageId: "s1" }],
      }),
      job("export"),
    );

    expect(db.lead.findMany.mock.calls[0][0].where).toEqual({
      pipeline: { orgId: "org-1", type: "LEADS" },
      stageId: { in: ["col-1"] },
    });
    expect(sendDeal).toHaveBeenCalledTimes(2);
    expect(run.deals).toEqual({ created: 1, skipped: 2, failed: 0 });
  });
});
