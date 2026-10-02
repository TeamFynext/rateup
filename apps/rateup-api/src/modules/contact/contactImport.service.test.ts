import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

vi.mock("../../utils/prisma.js", () => {
  const db: any = {
    contact: { findMany: vi.fn(), createManyAndReturn: vi.fn() },
    contactGroup: { findFirst: vi.fn() },
    integration: { findMany: vi.fn() },
    lifecycle: { findUnique: vi.fn() },
    contactGroupMap: { createManyAndReturn: vi.fn() },
    contactCustomFieldValue: { createMany: vi.fn(), deleteMany: vi.fn() },
    $executeRaw: vi.fn(),
  };
  // The batch runs in an interactive transaction; the client stands in for `tx`.
  db.$transaction = vi.fn((fn: (tx: unknown) => unknown) => fn(db));
  return { default: db };
});

vi.mock("../../utils/redisConnection.js", () => ({
  default: { get: vi.fn(), del: vi.fn() },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("../../utils/spreadsheet.js", () => ({
  readSpreadsheetObjects: vi.fn(),
  readSpreadsheetRows: vi.fn(),
}));

vi.mock("../../workers/bullmq/queues/index.js", () => ({
  contactImportQueue: { getJob: vi.fn() },
  contactImportRowsKey: (jobId: string) => `contactImport:${jobId}:rows`,
  EMPTY_IMPORT_PROGRESS: { processed: 0, created: 0, updated: 0, skipped: 0, addedToGroup: 0 },
  enqueueContactImport: vi.fn(),
  integrationTriggerQueue: { addBulk: vi.fn() },
  zapierTriggerQueue: { addBulk: vi.fn() },
}));

vi.mock("./contact.service.js", () => ({ getCustomFields: vi.fn() }));

vi.mock("../integrations/external/zapier/zapier.service.js", () => ({
  ZapierTriggers: {
    CONTACT_CREATE: "new_contact_create",
    CONTACT_UPDATED: "contact_updated",
    CONTACT_ADDED_TO_GROUP: "contact_added_to_group",
  },
}));

vi.mock("../integrations/external/zoho/zoho.service.js", () => ({
  pushCrmLeadStatus: vi.fn(),
  ZohoTriggers: {
    CONTACT_CREATE: "contact_created",
    CONTACT_UPDATE: "contact_updated",
    BIGIN_CONTACT_CREATE: "bigin_contact_created",
    BIGIN_CONTACT_UPDATE: "bigin_contact_updated",
    BIGIN_DEAL_CREATE: "bigin_deal_created",
    LEAD_CREATE: "lead_created",
  },
}));

vi.mock("../integrations/meta/conversions.service.js", () => ({
  triggerConversionsApiForContact: vi.fn(() => Promise.resolve()),
}));

vi.mock("../integrations/external/zoho/zoho.utils.js", () => ({
  buildZohoContactPayload: vi.fn((c: any) => ({ Last_Name: c.name })),
  buildZohoLeadPayload: vi.fn((c: any) => ({ Last_Name: c.name })),
}));

import { UnrecoverableError } from "bullmq";
import prisma from "../../utils/prisma.js";
import redis from "../../utils/redisConnection.js";
import { readSpreadsheetObjects, readSpreadsheetRows } from "../../utils/spreadsheet.js";
import {
  contactImportQueue,
  enqueueContactImport,
  integrationTriggerQueue,
  zapierTriggerQueue,
} from "../../workers/bullmq/queues/index.js";
import { getCustomFields } from "./contact.service.js";
import { pushCrmLeadStatus } from "../integrations/external/zoho/zoho.service.js";
import { triggerConversionsApiForContact } from "../integrations/meta/conversions.service.js";
import {
  CONTACT_IMPORT_ROW_LIMIT,
  getContactImportStatus,
  importContactBatch,
  runContactImport,
  startContactImport,
} from "./contactImport.service.js";

const db = prisma as any;
const ORG = "org-1";

beforeEach(() => {
  vi.clearAllMocks();
  (getCustomFields as Mock).mockResolvedValue([]);
  (enqueueContactImport as Mock).mockResolvedValue("contact-import-1");
  db.contact.findMany.mockResolvedValue([]);
  db.contact.createManyAndReturn.mockImplementation(({ data }: any) =>
    data.map((row: any) => ({ id: `id-${row.phone}`, ...row })),
  );
  db.contactGroupMap.createManyAndReturn.mockImplementation(({ data }: any) => data);
  db.integration.findMany.mockResolvedValue([]);
});

/** Integrations the org has connected, each subscribed to the given triggers. */
function connected(...integrations: { name: string; active?: boolean; triggers: string[] }[]) {
  db.integration.findMany.mockResolvedValue(
    integrations.map(({ name, active = true, triggers }) => ({
      name,
      active,
      credential: {
        triggerSubscriptions: triggers.map((t) => ({ subscribed_field: t, active: true })),
      },
    })),
  );
}

function file(mimetype = "text/csv") {
  return { mimetype, toBuffer: vi.fn().mockResolvedValue(Buffer.from("")) } as any;
}

function sheet(rows: Record<string, unknown>[]) {
  (readSpreadsheetObjects as Mock).mockResolvedValue({ data: rows });
}

/** The data and rows `startContactImport` handed to the queue. */
function queued() {
  const [data, rows] = (enqueueContactImport as Mock).mock.calls[0];
  return { data, rows };
}

// ===========================================================================
// startContactImport — validation on the request
// ===========================================================================

describe("startContactImport", () => {
  test("reads a header row by default and lower-cases the headers", async () => {
    sheet([]);

    await startContactImport(file(), { orgId: ORG, tags: [] });

    const opts = (readSpreadsheetObjects as Mock).mock.calls[0][2];
    expect(opts.transformHeader(" Name ")).toBe("name");
    expect(opts.transformValue(" 42 ")).toBe("42");
    expect(opts.transformValue(null)).toBe("");
  });

  test("assumes name,phone,<tags> column order when there is no header row", async () => {
    (readSpreadsheetRows as Mock).mockResolvedValue([["Ann", "919876543210", "gold"]]);
    (getCustomFields as Mock).mockResolvedValue([{ id: "f1", slug: "tier" }]);

    await startContactImport(file(), { orgId: ORG, tags: ["tier"], hasHeaderRow: false });

    expect(readSpreadsheetObjects).not.toHaveBeenCalled();
    expect(queued().rows).toEqual([["Ann", "919876543210", ["gold"]]]);
  });

  test("reports an empty file as an error the caller can render", async () => {
    sheet([]);

    await expect(startContactImport(file(), { orgId: ORG, tags: [] })).resolves.toEqual({
      data: [],
      status: "error",
      message: "The file contained no contacts.",
    });
    expect(enqueueContactImport).not.toHaveBeenCalled();
  });

  test("refuses a file over the row limit before queuing anything", async () => {
    sheet(
      Array.from({ length: CONTACT_IMPORT_ROW_LIMIT + 1 }, () => ({
        name: "Ann",
        phone: "919876543210",
      })),
    );

    const res: any = await startContactImport(file(), { orgId: ORG, tags: [] });

    expect(res.status).toBe("error");
    expect(res.message).toMatch(/up to 100,000/);
    expect(enqueueContactImport).not.toHaveBeenCalled();
  });

  test("refuses a group that is not the org's", async () => {
    sheet([{ name: "Ann", phone: "919876543210" }]);
    db.contactGroup.findFirst.mockResolvedValue(null);

    const res: any = await startContactImport(file(), {
      orgId: ORG,
      tags: [],
      contactGroupId: "g-other",
    });

    expect(db.contactGroup.findFirst).toHaveBeenCalledWith({
      where: { id: "g-other", team: { orgId: ORG } },
      select: { id: true },
    });
    expect(res).toMatchObject({ status: "error", message: "Contact group not found." });
  });

  test("names why each refused row was refused", async () => {
    sheet([{ name: "", phone: "919876543210" }, { name: "Ann", phone: "12" }, { name: "Bob" }]);

    const res: any = await startContactImport(file(), { orgId: ORG, tags: [] });

    expect(res.status).toBe("error");
    expect(res.data).toEqual([
      { name: "name is missing/invalid", phone: expect.any(String) },
      { name: "Ann", phone: "12: Invalid phone number" },
      { name: "Bob", phone: "phone is missing" },
    ]);
  });

  test("stores a number without its plus, and recovers scientific notation", async () => {
    sheet([
      { name: "Ann", phone: "+91 98765 43210" },
      { name: "Bob", phone: "9.19876543211E+11" },
    ]);

    await startContactImport(file(), { orgId: ORG, tags: [] });

    expect(queued().rows.map((row: any) => row[1])).toEqual(["919876543210", "919876543211"]);
  });

  test("queues the valid rows and carries the refused ones in the job", async () => {
    sheet([
      { name: "Ann", phone: "919876543210" },
      { name: "", phone: "" },
    ]);

    const res = await startContactImport(file(), { orgId: ORG, tags: [], updateExisting: true });

    expect(res).toEqual({
      status: "queued",
      jobId: "contact-import-1",
      total: 1,
      rejectedCount: 1,
      duplicateCount: 0,
    });
    expect(queued().data).toMatchObject({
      orgId: ORG,
      updateExisting: true,
      total: 1,
      rejectedCount: 1,
      rejected: [{ name: "name is missing/invalid", phone: "phone is missing" }],
    });
  });

  test("a number listed twice is imported once, with its last row", async () => {
    sheet([
      { name: "Ann", phone: "919876543210" },
      { name: "Ann Updated", phone: "+919876543210" },
    ]);

    const res: any = await startContactImport(file(), { orgId: ORG, tags: [] });

    expect(res).toMatchObject({ total: 1, duplicateCount: 1 });
    expect(queued().rows).toEqual([["Ann Updated", "919876543210", []]]);
  });

  test("carries values only for ticked fields the org actually has", async () => {
    sheet([{ name: "Ann", phone: "919876543210", tier: "Gold", city: "Kochi", ghost: "x" }]);
    (getCustomFields as Mock).mockResolvedValue([
      { id: "f-tier", slug: "tier" },
      { id: "f-city", slug: "city" },
    ]);

    await startContactImport(file(), { orgId: ORG, tags: ["city", "ghost"] });

    expect(queued().data.fieldIds).toEqual(["f-city"]);
    expect(queued().rows).toEqual([["Ann", "919876543210", ["Kochi"]]]);
  });
});

// ===========================================================================
// importContactBatch — one transaction on the worker
// ===========================================================================

const jobData = (over: Record<string, unknown> = {}) => ({
  orgId: ORG,
  updateExisting: false,
  fieldIds: ["f-tier"],
  total: 0,
  rejected: [],
  rejectedCount: 0,
  duplicateCount: 0,
  ...over,
});

describe("importContactBatch", () => {
  test("creates the new contacts with their custom field values", async () => {
    const res = await importContactBatch(jobData(), [["Ann", "9190001", ["Gold"]]]);

    expect(db.contact.createManyAndReturn).toHaveBeenCalledWith({
      data: [{ orgId: ORG, name: "Ann", phone: "9190001", source: "CSV IMPORT" }],
      skipDuplicates: true,
    });
    expect(db.contactCustomFieldValue.createMany).toHaveBeenCalledWith({
      data: [{ contactId: "id-9190001", fieldId: "f-tier", value: "Gold" }],
    });
    expect(res).toEqual({ created: 1, updated: 0, skipped: 0, addedToGroup: 0 });
  });

  test("leaves an existing contact and its fields alone when update is off", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c-ann", phone: "9190001", name: "Ann" }]);

    const res = await importContactBatch(jobData(), [["Ann New", "9190001", ["Gold"]]]);

    expect(db.contact.createManyAndReturn).not.toHaveBeenCalled();
    expect(db.$executeRaw).not.toHaveBeenCalled();
    expect(db.contactCustomFieldValue.deleteMany).not.toHaveBeenCalled();
    expect(db.contactCustomFieldValue.createMany).not.toHaveBeenCalled();
    expect(res).toEqual({ created: 0, updated: 0, skipped: 1, addedToGroup: 0 });
  });

  // Update-existing writes what main's upsert wrote: the name, a CSV IMPORT source, and —
  // for a row with any values — all of the contact's old values replaced by the file's.
  test("updates an existing contact the way main's upsert did", async () => {
    db.contact.findMany.mockResolvedValue([
      { id: "c-ann", phone: "9190001", name: "Ann", source: "whatsapp" },
      { id: "c-bob", phone: "9190002", name: "Bob", source: "whatsapp" },
    ]);

    const res = await importContactBatch(jobData({ updateExisting: true }), [
      ["Ann New", "9190001", ["Gold"]],
      ["Bob New", "9190002", [""]],
    ]);

    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(db.$executeRaw.mock.calls[0].join(" ")).toMatch(/source =/);
    // Bob has no values in the file, so his are left alone.
    expect(db.contactCustomFieldValue.deleteMany).toHaveBeenCalledWith({
      where: { contactId: { in: ["c-ann"] } },
    });
    expect(db.contactCustomFieldValue.createMany).toHaveBeenCalledWith({
      data: [{ contactId: "c-ann", fieldId: "f-tier", value: "Gold" }],
    });
    expect(res).toEqual({ created: 0, updated: 2, skipped: 0, addedToGroup: 0 });
  });

  test("sends main's update events for every upserted row, new ones included", async () => {
    connected(
      { name: "zapier", triggers: ["contact_updated", "new_contact_create"] },
      {
        name: "zoho",
        triggers: ["contact_created", "contact_updated", "bigin_contact_updated", "lead_created"],
      },
    );
    db.contact.findMany.mockResolvedValue([
      {
        id: "c-ann",
        phone: "9190001",
        name: "Ann",
        source: "whatsapp",
        integrationIds: { zoho: { contact: { id: "z-ann" } }, bigin: { contact: { id: "b-ann" } } },
      },
    ]);

    await importContactBatch(jobData({ updateExisting: true }), [
      ["Ann New", "9190001", ["Gold"]],
      ["Bob", "9190002", [""]],
    ]);

    const zapier = (zapierTriggerQueue.addBulk as Mock).mock.calls[0][0];
    // No "new contact" event in update mode, as on main.
    expect(zapier.map((j: any) => j.name)).toEqual(["contact_updated", "contact_updated"]);
    expect(zapier[0].data.data.contact_updated).toEqual({
      name: "Ann New",
      phone: "9190001",
      source: "CSV IMPORT",
      customFields: [{ id: "f-tier", value: "Gold" }],
    });
    const zoho = (integrationTriggerQueue.addBulk as Mock).mock.calls[0][0];
    expect(zoho.map((j: any) => j.name)).toEqual([
      "zoho-contact-update",
      "zoho-bigin-contact-update",
      "zoho-contact-update",
      "zoho-bigin-contact-update",
    ]);
    expect(zoho[0].data.data).toMatchObject({ zohoContactId: "z-ann" });
    expect(zoho[1].data.data).toMatchObject({ biginContactId: "b-ann" });
  });

  test("a contact with a lifecycle gets main's lead status, deal and conversions calls", async () => {
    connected({ name: "zoho", triggers: ["bigin_deal_created"] });
    db.lifecycle.findUnique.mockResolvedValue({ name: "Customer" });
    db.contact.findMany.mockResolvedValue([
      {
        id: "c-ann",
        phone: "9190001",
        name: "Ann",
        lifecycleId: "lc-1",
        integrationIds: { zoho: { lead: { id: "lead-1" } } },
      },
    ]);

    await importContactBatch(jobData({ updateExisting: true }), [["Ann New", "9190001", [""]]]);

    expect(pushCrmLeadStatus).toHaveBeenCalledWith(
      ORG,
      "lead-1",
      { lifecycleId: "lc-1", lifecycleName: "Customer" },
      expect.any(Object),
    );
    const zoho = (integrationTriggerQueue.addBulk as Mock).mock.calls[0][0];
    expect(zoho.map((j: any) => j.name)).toEqual(["zoho-bigin-deal-update"]);
    expect(triggerConversionsApiForContact).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c-ann", name: "Ann New" }),
      "lc-1",
    );
  });

  test("left-alone contacts send nothing when update is off", async () => {
    connected({ name: "zapier", triggers: ["contact_updated", "new_contact_create"] });
    db.contact.findMany.mockResolvedValue([{ id: "c-ann", phone: "9190001", name: "Ann" }]);

    await importContactBatch(jobData(), [["Ann New", "9190001", ["Gold"]]]);

    expect(zapierTriggerQueue.addBulk).not.toHaveBeenCalled();
    expect(pushCrmLeadStatus).not.toHaveBeenCalled();
  });

  test("adds every row to the group, new or existing", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c-ann", phone: "9190001", name: "Ann" }]);

    const res = await importContactBatch(jobData({ contactGroupId: "g1" }), [
      ["Ann", "9190001", [""]],
      ["Bob", "9190002", [""]],
    ]);

    expect(db.contactGroupMap.createManyAndReturn).toHaveBeenCalledWith({
      data: [
        { contactId: "id-9190002", contactGroupId: "g1" },
        { contactId: "c-ann", contactGroupId: "g1" },
      ],
      skipDuplicates: true,
    });
    expect(res.addedToGroup).toBe(2);
  });

  test("fires the subscribed Zapier and Zoho events in bulk", async () => {
    connected(
      { name: "zapier", triggers: ["new_contact_create"] },
      {
        name: "zoho",
        triggers: ["contact_created", "bigin_contact_created", "lead_created"],
      },
    );

    await importContactBatch(jobData(), [["Ann", "9190001", [""]]]);

    const zapier = (zapierTriggerQueue.addBulk as Mock).mock.calls[0][0];
    expect(zapier).toHaveLength(1);
    expect(zapier[0].name).toBe("new_contact_create");
    const zoho = (integrationTriggerQueue.addBulk as Mock).mock.calls[0][0];
    expect(zoho.map((j: any) => j.name)).toEqual([
      "zoho-contact-create",
      "zoho-bigin-contact-create",
      "zoho-lead-create",
    ]);
  });

  // Every job used to be queued regardless: four per contact, and Zoho logs each one it
  // receives at info even when the trigger is off.
  test("queues nothing for an org with neither integration", async () => {
    await importContactBatch(jobData({ contactGroupId: "g1" }), [["Ann", "9190001", [""]]]);

    expect(db.integration.findMany).toHaveBeenCalledTimes(1);
    expect(zapierTriggerQueue.addBulk).not.toHaveBeenCalled();
    expect(integrationTriggerQueue.addBulk).not.toHaveBeenCalled();
  });

  test("queues only the triggers a subscription is waiting for", async () => {
    connected(
      { name: "zapier", triggers: ["contact_added_to_group"] },
      { name: "zoho", triggers: ["lead_created"] },
    );

    await importContactBatch(jobData({ contactGroupId: "g1" }), [["Ann", "9190001", [""]]]);

    const zapier = (zapierTriggerQueue.addBulk as Mock).mock.calls[0][0];
    expect(zapier.map((j: any) => j.name)).toEqual(["contact_added_to_group"]);
    const zoho = (integrationTriggerQueue.addBulk as Mock).mock.calls[0][0];
    expect(zoho.map((j: any) => j.name)).toEqual(["zoho-lead-create"]);
  });

  test("an inactive Zoho integration gets nothing, as processIntegration would drop it", async () => {
    connected({ name: "zoho", active: false, triggers: ["contact_created"] });

    await importContactBatch(jobData(), [["Ann", "9190001", [""]]]);

    expect(integrationTriggerQueue.addBulk).not.toHaveBeenCalled();
  });

  test("a subscription that was switched off does not count", async () => {
    db.integration.findMany.mockResolvedValue([
      {
        name: "zapier",
        active: true,
        credential: {
          triggerSubscriptions: [{ subscribed_field: "new_contact_create", active: false }],
        },
      },
    ]);

    await importContactBatch(jobData(), [["Ann", "9190001", [""]]]);

    expect(zapierTriggerQueue.addBulk).not.toHaveBeenCalled();
  });

  test("skips the integration lookup when the batch changed nothing", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c-ann", phone: "9190001", name: "Ann" }]);

    await importContactBatch(jobData(), [["Ann", "9190001", [""]]]);

    expect(db.integration.findMany).not.toHaveBeenCalled();
  });

  test("announces nothing when the transaction rolls back", async () => {
    db.$transaction.mockRejectedValueOnce(new Error("deadlock"));

    await expect(importContactBatch(jobData(), [["Ann", "9190001", [""]]])).rejects.toThrow(
      "deadlock",
    );
    expect(zapierTriggerQueue.addBulk).not.toHaveBeenCalled();
    expect(integrationTriggerQueue.addBulk).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// runContactImport — batching and resuming
// ===========================================================================

function job(over: Record<string, unknown> = {}) {
  return {
    id: "contact-import-1",
    data: jobData({ fieldIds: [] }),
    progress: 0,
    updateProgress: vi.fn(),
    ...over,
  } as any;
}

function rowsInRedis(count: number) {
  const rows = Array.from({ length: count }, (_, i) => [`N${i}`, `91900${i}`, []]);
  (redis.get as Mock).mockResolvedValue(JSON.stringify(rows));
}

describe("runContactImport", () => {
  test("writes a thousand rows per batch and saves progress after each", async () => {
    rowsInRedis(2500);
    const j = job();

    const res = await runContactImport(j);

    expect(db.$transaction).toHaveBeenCalledTimes(3);
    expect(j.updateProgress.mock.calls.map((c: any) => c[0].processed)).toEqual([1000, 2000, 2500]);
    expect(res).toMatchObject({ processed: 2500, created: 2500 });
    expect(redis.del).toHaveBeenCalledWith("contactImport:contact-import-1:rows");
  });

  test("a retry resumes after the last batch that committed", async () => {
    rowsInRedis(2500);
    const j = job({
      progress: { processed: 2000, created: 2000, updated: 0, skipped: 0, addedToGroup: 0 },
    });

    const res = await runContactImport(j);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.contact.createManyAndReturn.mock.calls[0][0].data).toHaveLength(500);
    expect(res).toMatchObject({ processed: 2500, created: 2500 });
  });

  test("keeps the rows for the next attempt when a batch fails", async () => {
    rowsInRedis(10);
    db.$transaction.mockRejectedValueOnce(new Error("connection reset"));

    await expect(runContactImport(job())).rejects.toThrow("connection reset");
    expect(redis.del).not.toHaveBeenCalled();
  });

  test("gives up without retrying when the rows have expired", async () => {
    (redis.get as Mock).mockResolvedValue(null);

    await expect(runContactImport(job())).rejects.toBeInstanceOf(UnrecoverableError);
  });
});

// ===========================================================================
// getContactImportStatus
// ===========================================================================

describe("getContactImportStatus", () => {
  function stored(state: string, over: Record<string, unknown> = {}) {
    (contactImportQueue.getJob as Mock).mockResolvedValue({
      data: jobData({ total: 21000, rejected: [], rejectedCount: 3, duplicateCount: 1 }),
      progress: 0,
      getState: vi.fn().mockResolvedValue(state),
      ...over,
    });
  }

  test("hides another org's import", async () => {
    stored("active");

    expect(await getContactImportStatus("contact-import-1", "org-other")).toBeNull();
  });

  test("hides an import that no longer exists", async () => {
    (contactImportQueue.getJob as Mock).mockResolvedValue(undefined);

    expect(await getContactImportStatus("contact-import-1", ORG)).toBeNull();
  });

  test("a waiting job with nothing written is queued", async () => {
    stored("waiting");

    expect(await getContactImportStatus("contact-import-1", ORG)).toMatchObject({
      state: "queued",
      processed: 0,
      total: 21000,
      rejectedCount: 3,
    });
  });

  test("a job waiting to retry after writing rows still reads as running", async () => {
    stored("delayed", {
      progress: { processed: 4000, created: 4000, updated: 0, skipped: 0, addedToGroup: 0 },
    });

    expect(await getContactImportStatus("contact-import-1", ORG)).toMatchObject({
      state: "running",
      processed: 4000,
    });
  });

  test("a finished job reports its result", async () => {
    stored("completed", {
      returnvalue: { processed: 21000, created: 20000, updated: 0, skipped: 1000, addedToGroup: 0 },
    });

    expect(await getContactImportStatus("contact-import-1", ORG)).toMatchObject({
      state: "completed",
      created: 20000,
      skipped: 1000,
    });
  });

  test("a job out of attempts is failed", async () => {
    stored("failed");

    expect((await getContactImportStatus("contact-import-1", ORG))?.state).toBe("failed");
  });
});
