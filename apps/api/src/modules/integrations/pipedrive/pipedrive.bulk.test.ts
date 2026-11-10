import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findUnique: vi.fn(), update: vi.fn() },
    integrationEntityLink: { findMany: vi.fn() },
    contact: { findMany: vi.fn() },
    lead: { findMany: vi.fn() },
  },
}));
vi.mock("../../../utils/redisConnection.js", () => ({
  default: { set: vi.fn(async () => "OK"), del: vi.fn() },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));
vi.mock("../shared/entityLink.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shared/entityLink.js")>()),
  recordLink: vi.fn(),
}));
vi.mock("./pipedrive.inbound.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./pipedrive.inbound.js")>()),
  importPipedrivePerson: vi.fn(),
}));
vi.mock("./pipedrive.deals.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./pipedrive.deals.js")>()),
  processPipedriveDealJob: vi.fn(),
}));

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./pipedrive.client.js", () => ({ pipedriveClientFor: vi.fn(async () => client) }));

import prisma from "../../../utils/prisma.js";
import redisConnection from "../../../utils/redisConnection.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import { recordLink } from "../shared/entityLink.js";
import {
  bulkTiming,
  processPipedriveBulkJob,
  PIPEDRIVE_BULK,
  startPipedriveBulk,
} from "./pipedrive.bulk.js";
import { processPipedriveDealJob } from "./pipedrive.deals.js";
import { importPipedrivePerson } from "./pipedrive.inbound.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;
const importPerson = importPipedrivePerson as unknown as Mock;
const dealJob = processPipedriveDealJob as unknown as Mock;

const credential = (over: Record<string, unknown> = {}) => ({
  access_token: "at",
  refresh_token: "rt",
  apiDomain: "https://acme.pipedrive.com",
  companyId: 9100,
  ...over,
});

const integration = (over: Record<string, unknown> = {}) =>
  ({ id: "int-1", orgId: "org-1", active: true, credential: credential(over) }) as never;

const job = (kind: "import" | "export") => ({
  integrationName: "pipedrive",
  triggerKey: PIPEDRIVE_BULK,
  orgId: "org-1",
  data: { kind },
});

/** Pipedrive's persons, in pages. */
let personPages: unknown[][] = [];

beforeEach(() => {
  vi.clearAllMocks();
  bulkTiming.sleep = vi.fn(async () => undefined);
  personPages = [];
  client.get.mockImplementation(async (_url: string, options: { params: { cursor?: string } }) => {
    const index = Number(options.params.cursor ?? 0);
    return {
      data: {
        data: personPages[index] ?? [],
        additional_data: { next_cursor: index + 1 < personPages.length ? String(index + 1) : null },
      },
    };
  });
  client.post.mockResolvedValue({ data: { data: { id: 900 } } });
  db.integration.findUnique.mockResolvedValue({ credential: credential() });
  db.integrationEntityLink.findMany.mockResolvedValue([]);
  db.contact.findMany.mockResolvedValue([]);
  db.lead.findMany.mockResolvedValue([]);
});

const savedRun = (kind: "import" | "export") =>
  db.integration.update.mock.calls.at(-1)?.[0].data.credential.bulk[kind];

describe("starting a run", () => {
  test("queues one attempt and marks it running", async () => {
    db.integration.findUnique.mockResolvedValue(integration());
    await startPipedriveBulk("org-1", "export");
    expect(integrationTriggerQueue.add).toHaveBeenCalledWith(
      "pipedrive-bulk-export",
      expect.objectContaining({ data: { kind: "export" } }),
      { attempts: 1, removeOnComplete: true },
    );
    expect(savedRun("export")).toMatchObject({ status: "running", created: 0 });
  });

  test("refuses a second run of the same kind while one is going", async () => {
    db.integration.findUnique.mockResolvedValue(
      integration({
        bulk: { import: { status: "running", startedAt: new Date().toISOString() } },
      }),
    );
    await expect(startPipedriveBulk("org-1", "import")).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("importing persons", () => {
  test("imports new persons page by page, skipping linked and deleted ones", async () => {
    personPages = [
      [
        { id: 1, name: "One", phones: [{ value: "+911111111111" }] },
        { id: 2, name: "Linked" },
      ],
      [
        { id: 3, name: "Gone", is_deleted: true },
        { id: 4, name: "No phone", emails: [{ value: "x@y.z" }] },
      ],
    ];
    db.integrationEntityLink.findMany.mockImplementation(async ({ where }) =>
      where.externalId.in.includes("2") ? [{ rateupId: "c-2", externalId: "2" }] : [],
    );
    importPerson
      .mockResolvedValueOnce({ outcome: "created" })
      .mockResolvedValueOnce({ outcome: "no_phone" });

    const run = await processPipedriveBulkJob(integration(), job("import"));

    expect(run).toMatchObject({ status: "done", created: 1, skipped: 3, failed: 0 });
    expect(importPerson).toHaveBeenCalledWith(
      { id: "int-1", orgId: "org-1" },
      "1",
      expect.objectContaining({ phone: "911111111111" }),
    );
  });
});

describe("sending contacts", () => {
  const contacts = [
    { id: "c-1", name: "By email", email: "a@x.com", phone: null },
    { id: "c-2", name: "By formatted phone", email: null, phone: "919876543210" },
    { id: "c-3", name: "New", email: "new@x.com", phone: "15550100" },
    { id: "c-4", name: "Same email as new", email: "new@x.com", phone: null },
    { id: "c-5", name: "Nothing to send", email: null, phone: null },
  ];

  beforeEach(() => {
    personPages = [
      [
        { id: 11, emails: [{ value: "A@x.com" }] },
        { id: 12, phones: [{ value: "+91 98765 43210" }] },
      ],
    ];
    // As the database holds them: phone and email are primary identities.
    const rows = contacts.map(({ email, phone, ...rest }) => ({
      ...rest,
      identities: [
        ...(phone ? [{ kind: "PHONE", value: phone }] : []),
        ...(email ? [{ kind: "EMAIL", value: email }] : []),
      ],
    }));
    db.contact.findMany.mockReset().mockResolvedValueOnce(rows).mockResolvedValue([]);
  });

  test("matches against every person once, links matches, creates the rest", async () => {
    const run = await processPipedriveBulkJob(integration(), job("export"));

    expect(run).toMatchObject({ status: "done", linked: 3, created: 1, skipped: 1, failed: 0 });
    // One read of the persons, no searches.
    expect(client.get).toHaveBeenCalledTimes(1);
    expect(client.post).toHaveBeenCalledTimes(1);
    expect(client.post).toHaveBeenCalledWith("/v2/persons", {
      name: "New",
      emails: [{ value: "new@x.com", primary: true, label: "work" }],
      phones: [{ value: "+15550100", primary: true, label: "mobile" }],
    });
    const links = (recordLink as unknown as Mock).mock.calls.map(([, link]) => [
      link.rateupId,
      link.externalId,
    ]);
    expect(links).toEqual([
      ["c-1", "11"],
      ["c-2", "12"],
      ["c-3", "900"],
      ["c-4", "900"],
    ]);
  });

  test("a contact a live push holds is skipped, not duplicated", async () => {
    (redisConnection.set as unknown as Mock)
      .mockResolvedValueOnce("OK")
      .mockResolvedValueOnce("OK")
      .mockResolvedValueOnce("OK")
      .mockResolvedValueOnce(null);
    const run = await processPipedriveBulkJob(integration(), job("export"));
    expect(run).toMatchObject({ created: 1, linked: 2, skipped: 2 });
  });

  test("Pipedrive's limit, after the retries, stops the run with a plain message", async () => {
    client.post.mockRejectedValue({ isAxiosError: true, response: { status: 429 } });
    const run = await processPipedriveBulkJob(integration(), job("export"));

    expect(bulkTiming.sleep).toHaveBeenCalledTimes(3);
    expect(run.status).toBe("failed");
    expect(run.error).toMatch(/API limit/);
    expect(savedRun("export")).toMatchObject({ status: "failed", linked: 2 });
  });
});

describe("sending deals", () => {
  test("with deals on, unlinked leads go through the deal path", async () => {
    db.lead.findMany.mockResolvedValueOnce([{ id: "l-1" }, { id: "l-2" }, { id: "l-3" }]);
    db.integrationEntityLink.findMany.mockImplementation(async ({ where }) =>
      where.entityType === "lead" ? [{ rateupId: "l-2", externalId: "5" }] : [],
    );
    dealJob.mockResolvedValueOnce("created").mockRejectedValueOnce(new Error("bad"));

    const run = await processPipedriveBulkJob(
      integration({
        syncDeals: true,
        dealPipelineId: 1,
        stageMappings: [{ stageId: "col-new", pipedriveStageId: 11 }],
      }),
      job("export"),
    );

    expect(run.deals).toEqual({ created: 1, skipped: 1, failed: 1 });
    const where = db.lead.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { stageId: { in: ["col-new"] } },
      { stage: { status: { in: ["WON", "LOST"] } } },
    ]);
  });

  test("with deals off, no leads are sent", async () => {
    const run = await processPipedriveBulkJob(integration(), job("export"));
    expect(run.deals).toBeUndefined();
    expect(db.lead.findMany).not.toHaveBeenCalled();
  });
});
