import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    pipeline: { findUniqueOrThrow: vi.fn() },
    lead: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("./lead.service.js", () => {
  class LeadExistsForContactError extends Error {}
  return { createLead: vi.fn(), LeadExistsForContactError };
});

vi.mock("hucre", () => ({ write: vi.fn(async () => new Uint8Array([1])) }));

import { write } from "hucre";

import { Prisma } from "../../../../generated/prisma/client.js";

import prisma from "../../../utils/prisma.js";
import { buildLeadExport, exportFilename } from "./lead.export.js";
import { templateColumns } from "./lead.import.js";

// oxlint-disable-next-line typescript/no-explicit-any
const db = prisma as any;

function lead(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `Lead ${id}`,
    phone: "919876543210",
    email: null,
    company: "Sharma Traders",
    source: "WHATSAPP",
    status: "OPEN",
    expectedCloseAt: new Date("2026-10-31T00:00:00Z"),
    createdAt: new Date("2026-09-01T09:30:00Z"),
    stage: { name: "Qualified" },
    assignees: [],
    labels: [],
    ...overrides,
  };
}

/** The sheet handed to the writer on the last call. */
function writtenSheet() {
  const [[args]] = vi.mocked(write).mock.calls as unknown as [
    [
      {
        sheets: Array<{ columns: Array<{ header: string }>; data: Array<Record<string, string>> }>;
      },
    ],
  ];
  return args.sheets[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  db.pipeline.findUniqueOrThrow.mockResolvedValue({
    name: "Sales leads",
    type: "LEADS",
    rottingEnabled: false,
  });
});

describe("exporting a pipeline", () => {
  test("heads the sheet like the import template, then adds status, labels and created", async () => {
    db.$queryRaw.mockResolvedValue([]);
    db.lead.findMany.mockResolvedValue([]);

    await buildLeadExport("p1", { filter: "open", format: "xlsx" }, "u1");

    const importHeaders = templateColumns("LEADS")
      .filter((column) => column.key !== "note")
      .map((column) => column.header);
    expect(writtenSheet().columns.map((column) => column.header)).toEqual([
      ...importHeaders,
      "Status",
      "Labels",
      "Created",
    ]);
  });

  test("keeps board order and flattens assignees and labels into one cell each", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "b" }, { id: "a" }]);
    db.lead.findMany.mockResolvedValue([
      lead("a"),
      lead("b", {
        assignees: [
          { assignee: { email: "asha@shop.com" } },
          { assignee: { email: "ravi@shop.com" } },
        ],
        labels: [{ label: { name: "Hot" } }, { label: { name: "VIP" } }],
      }),
    ]);

    await buildLeadExport("p1", { filter: "open", format: "ods" }, "u1");

    const { data } = writtenSheet();
    expect(data.map((row) => row.name)).toEqual(["Lead b", "Lead a"]);
    expect(data[0]).toMatchObject({
      phone: "919876543210",
      email: "",
      stage: "Qualified",
      assignee: "asha@shop.com, ravi@shop.com",
      labels: "Hot, VIP",
      expectedClose: "2026-10-31",
      status: "OPEN",
    });
    expect(vi.mocked(write).mock.calls[0][0]).toMatchObject({ format: "ods" });
  });

  test("applies the board's filters, so the file holds what the board shows", async () => {
    db.$queryRaw.mockResolvedValue([]);

    await buildLeadExport("p1", { filter: "won", search: "sharma", format: "xlsx" }, "u1");

    // The WHERE clause is `leadWhere`'s Prisma.Sql, passed into the tagged template whole.
    const where = db.$queryRaw.mock.calls[0]
      .slice(1)
      .find((value: unknown) => value instanceof Prisma.Sql) as Prisma.Sql;
    expect(where.sql).toContain(`l.status = 'WON'`);
    expect(where.values).toEqual(expect.arrayContaining(["p1", "%sharma%"]));
  });
});

describe("exportFilename", () => {
  test("names the file after the board and the day", () => {
    expect(exportFilename("Sales leads!", "xlsx")).toMatch(/^sales-leads-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(exportFilename("日本", "ods")).toMatch(/^pipeline-\d{4}-\d{2}-\d{2}\.ods$/);
  });
});
