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
}));

vi.mock("./contact.service.js", () => ({ getCustomFields: vi.fn() }));

const events = vi.hoisted(() => ({ wanted: new Set<string>() }));
vi.mock("../integrations/events/integrationEvent.fanout.js", () => ({
  subscribedEventTypes: vi.fn(async () => events.wanted),
}));
vi.mock("../integrations/events/emitIntegrationEvent.js", () => ({
  emitIntegrationEvents: vi.fn(),
}));

vi.mock("../integrations/meta/conversions.service.js", () => ({
  triggerConversionsApiForContact: vi.fn(() => Promise.resolve()),
}));

import { UnrecoverableError } from "bullmq";
import prisma from "../../utils/prisma.js";
import redis from "../../utils/redisConnection.js";
import { readSpreadsheetObjects, readSpreadsheetRows } from "../../utils/spreadsheet.js";
import { contactImportQueue, enqueueContactImport } from "../../workers/bullmq/queues/index.js";
import { getCustomFields } from "./contact.service.js";
import { emitIntegrationEvents } from "../integrations/events/emitIntegrationEvent.js";
import { subscribedEventTypes } from "../integrations/events/integrationEvent.fanout.js";
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
  events.wanted = new Set();
});

/** The integration events some provider of the org is waiting for. */
function wanted(...types: string[]) {
  events.wanted = new Set(types);
}

/** The events the batch emitted, in order. */
function emitted(): any[] {
  const calls = (emitIntegrationEvents as Mock).mock.calls;
  return calls.length ? calls[0][1] : [];
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

  test("an upsert announces every row as updated, new ones included", async () => {
    wanted("contact.created", "contact.updated");
    db.contact.findMany.mockResolvedValue([
      { id: "c-ann", phone: "9190001", name: "Ann", source: "whatsapp" },
    ]);

    await importContactBatch(jobData({ updateExisting: true }), [
      ["Ann New", "9190001", ["Gold"]],
      ["Bob", "9190002", [""]],
    ]);

    // No "created" in update mode, as on main.
    expect(emitted().map((e) => e.type)).toEqual(["contact.updated", "contact.updated"]);
    expect(emitted()[0]).toMatchObject({
      contact: { id: "c-ann", name: "Ann New" },
      changed: ["details"],
    });
    expect(emitIntegrationEvents).toHaveBeenCalledWith(ORG, expect.any(Array));
  });

  test("a contact with a lifecycle says so, and is told to the Conversions API", async () => {
    wanted("contact.updated");
    db.contact.findMany.mockResolvedValue([
      { id: "c-ann", phone: "9190001", name: "Ann", lifecycleId: "lc-1" },
    ]);

    await importContactBatch(jobData({ updateExisting: true }), [["Ann New", "9190001", [""]]]);

    expect(emitted()[0].changed).toEqual(["details", "lifecycle"]);
    expect(triggerConversionsApiForContact).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c-ann", name: "Ann New" }),
      "lc-1",
    );
  });

  test("left-alone contacts send nothing when update is off", async () => {
    wanted("contact.created", "contact.updated");
    db.contact.findMany.mockResolvedValue([{ id: "c-ann", phone: "9190001", name: "Ann" }]);

    await importContactBatch(jobData(), [["Ann New", "9190001", ["Gold"]]]);

    expect(emitted()).toEqual([]);
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

  test("announces each created contact, in one bulk emit", async () => {
    wanted("contact.created");

    await importContactBatch(jobData(), [
      ["Ann", "9190001", [""]],
      ["Bob", "9190002", [""]],
    ]);

    expect(emitIntegrationEvents).toHaveBeenCalledTimes(1);
    expect(emitted().map((e) => [e.type, e.contact.phone])).toEqual([
      ["contact.created", "9190001"],
      ["contact.created", "9190002"],
    ]);
  });

  test("announces the group's new members as one event per group", async () => {
    wanted("contact_group.members_added");

    await importContactBatch(jobData({ contactGroupId: "g1" }), [
      ["Ann", "9190001", [""]],
      ["Bob", "9190002", [""]],
    ]);

    expect(emitted()).toEqual([
      {
        type: "contact_group.members_added",
        contactGroupId: "g1",
        contactIds: ["id-9190001", "id-9190002"],
      },
    ]);
  });

  // Every event used to be queued regardless, thousands per import, and dropped on arrival.
  test("queues only the events a provider of the org is waiting for", async () => {
    wanted("contact_group.members_added");

    await importContactBatch(jobData({ contactGroupId: "g1" }), [["Ann", "9190001", [""]]]);

    expect(subscribedEventTypes).toHaveBeenCalledWith(ORG);
    expect(emitted().map((e) => e.type)).toEqual(["contact_group.members_added"]);
  });

  test("queues nothing for an org nobody is listening for", async () => {
    await importContactBatch(jobData({ contactGroupId: "g1" }), [["Ann", "9190001", [""]]]);

    expect(emitted()).toEqual([]);
  });

  test("skips the subscription lookup when the batch changed nothing", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c-ann", phone: "9190001", name: "Ann" }]);

    await importContactBatch(jobData(), [["Ann", "9190001", [""]]]);

    expect(subscribedEventTypes).not.toHaveBeenCalled();
  });

  test("announces nothing when the transaction rolls back", async () => {
    wanted("contact.created");
    db.$transaction.mockRejectedValueOnce(new Error("deadlock"));

    await expect(importContactBatch(jobData(), [["Ann", "9190001", [""]]])).rejects.toThrow(
      "deadlock",
    );
    expect(emitIntegrationEvents).not.toHaveBeenCalled();
  });
});
