import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    pipeline: { findUniqueOrThrow: vi.fn() },
    leadNote: { create: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("./lead.service.js", () => {
  class LeadExistsForContactError extends Error {}
  return { createLead: vi.fn(), LeadExistsForContactError };
});

import prisma from "../../../utils/prisma.js";
import { buildImportTemplate, importLeads, LeadImportFileError } from "./lead.import.js";
import { createLead, LeadExistsForContactError } from "./lead.service.js";

// oxlint-disable-next-line typescript/no-explicit-any
const db = prisma as any;
const create = vi.mocked(createLead);

const STAGES = [
  { id: "s-new", name: "New Lead", status: "OPEN" },
  { id: "s-qual", name: "Qualified", status: "OPEN" },
  { id: "s-won", name: "Won", status: "WON" },
];

function csv(text: string) {
  return { buffer: Buffer.from(text), mimetype: "text/csv", pipelineId: "p1", userId: "u1" };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.pipeline.findUniqueOrThrow.mockResolvedValue({ type: "LEADS", stages: STAGES });
  db.$queryRaw.mockResolvedValue([{ id: "user-a", email: "Asha@Shop.com" }]);
  create.mockResolvedValue({ id: "lead-1" } as never);
});

describe("importing leads", () => {
  test("puts each row on its named column, quietly, with the number as digits", async () => {
    const result = await importLeads(
      csv(
        "Name,Phone,Stage,Assignee email,Source\n" +
          "Anjali,+91 98765 43210,qualified,asha@shop.com,referral\n" +
          "Rahul,,,,\n",
      ),
    );

    expect(result).toEqual({ created: 2, skipped: [] });
    expect(create.mock.calls[0][0]).toMatchObject({
      name: "Anjali",
      phone: "919876543210",
      stageId: "s-qual",
      source: "REFERRAL",
      assigneeIds: ["user-a"],
      quiet: true,
    });
    // No stage named: the board's first open column.
    expect(create.mock.calls[1][0]).toMatchObject({ name: "Rahul", stageId: "s-new", phone: null });
  });

  test("skips a bad row with its spreadsheet row number and keeps going", async () => {
    const result = await importLeads(
      csv(
        "Name,Phone,Stage,Assignee email\n" +
          "Good,,,\n" +
          "Bad phone,12345,,\n" +
          "Bad stage,,Nowhere,\n" +
          "Stranger,,,someone@else.com\n" +
          ",,,\n" +
          ",919876543210,,\n",
      ),
    );

    expect(result.created).toBe(1);
    expect(result.skipped).toEqual([
      { row: 3, name: "Bad phone", reason: "INVALID_PHONE", value: "12345" },
      { row: 4, name: "Bad stage", reason: "UNKNOWN_STAGE", value: "Nowhere" },
      { row: 5, name: "Stranger", reason: "UNKNOWN_ASSIGNEE", value: "someone@else.com" },
      { row: 7, name: "", reason: "MISSING_NAME" },
    ]);
  });

  test("reports a contact already on the board instead of failing the file", async () => {
    create.mockRejectedValueOnce(
      new LeadExistsForContactError("lead-9", "Anjali", "s-new", "New Lead"),
    );

    const result = await importLeads(csv("Name,Phone\nAnjali,919876543210\nRahul,\n"));

    expect(result.created).toBe(1);
    expect(result.skipped).toEqual([{ row: 2, name: "Anjali", reason: "ALREADY_ON_BOARD" }]);
  });

  test("a Support board ignores the sales-only columns", async () => {
    db.pipeline.findUniqueOrThrow.mockResolvedValue({
      type: "SUPPORT",
      stages: [{ id: "s1", name: "New", status: "OPEN" }],
    });

    await importLeads(csv("Name,Company,Source,Expected close\nTicket,Acme,nonsense,soon\n"));

    expect(create.mock.calls[0][0]).toMatchObject({
      company: null,
      source: "MANUAL",
      expectedCloseAt: null,
    });
  });

  test("adds the note column as the card's first note", async () => {
    await importLeads(csv("Name,Note\nAnjali,Wants a demo\n"));

    expect(db.leadNote.create).toHaveBeenCalledWith({
      data: { leadId: "lead-1", text: "Wants a demo", authorId: "u1" },
    });
  });

  test("refuses a file with no Name column", async () => {
    await expect(importLeads(csv("Phone\n919876543210\n"))).rejects.toBeInstanceOf(
      LeadImportFileError,
    );
    expect(create).not.toHaveBeenCalled();
  });
});

describe("the import template", () => {
  test("carries the board's own columns and stage names", async () => {
    const leads = String(await buildImportTemplate("p1", "csv")).split("\n");
    expect(leads[0]).toBe(
      "Name,Phone,Email,Company,Stage,Source,Assignee email,Expected close,Note",
    );
    expect(leads[1]).toContain("New Lead");

    db.pipeline.findUniqueOrThrow.mockResolvedValue({
      type: "PROJECTS",
      stages: [{ name: "To do", status: "OPEN" }],
    });
    const projects = String(await buildImportTemplate("p1", "csv")).split("\n");
    expect(projects[0]).toBe("Name,Phone,Email,Stage,Assignee email,Note");
  });

  test("reads back its Excel copy, dates and phone numbers included", async () => {
    const template = await buildImportTemplate("p1", "xlsx");

    const result = await importLeads({
      buffer: Buffer.from(template),
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pipelineId: "p1",
      userId: "u1",
    });

    expect(result).toEqual({ created: 2, skipped: [] });
    expect(create.mock.calls[0][0]).toMatchObject({ phone: "919876543210", stageId: "s-new" });
  });

  test("reads back what it writes", async () => {
    const template = String(await buildImportTemplate("p1", "csv"));

    const result = await importLeads(csv(template));

    expect(result).toEqual({ created: 2, skipped: [] });
  });
});
