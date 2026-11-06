import dayjs from "dayjs";
import { write } from "hucre";

import prisma from "../../../utils/prisma.js";
import type { SpreadsheetExportFormat } from "../../../utils/spreadsheet.js";
import type { ExportLeadsQuerySchema } from "../pipeline.schema.js";
import { leadWhere } from "./lead.filters.js";
import { templateColumns } from "./lead.import.js";

/** Leads hydrated per round trip; the id list itself is read in one indexed query. */
const HYDRATE_BATCH = 1000;

/**
 * The board as a spreadsheet: the leads the given filters show, in board order
 * (stage by stage, newest arrival first).
 *
 * The first columns are the import template's, headed the same way, so an export
 * can be edited and uploaded again. The importer ignores headers it does not know,
 * which is what lets Status, Labels and Created ride along after them.
 */
export async function buildLeadExport(
  pipelineId: string,
  query: ExportLeadsQuerySchema,
  userId: string,
): Promise<{ buffer: Uint8Array; pipelineName: string }> {
  const pipeline = await prisma.pipeline.findUniqueOrThrow({
    where: { id: pipelineId },
    select: { name: true, type: true, rottingEnabled: true },
  });

  const ids = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT l.id
    FROM "Lead" l
    JOIN "PipelineStage" s ON s.id = l."stageId"
    WHERE ${leadWhere(
      { ...query, pipelineId, limit: 1 },
      { userId, rottingEnabled: pipeline.rottingEnabled },
    )}
    ORDER BY s."order" ASC, l."stageEnteredAt" DESC, l.id DESC
  `;

  const rows: Array<Record<string, string>> = [];
  for (let i = 0; i < ids.length; i += HYDRATE_BATCH) {
    const batch = ids.slice(i, i + HYDRATE_BATCH).map((row) => row.id);
    const leads = await prisma.lead.findMany({
      where: { id: { in: batch } },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        company: true,
        source: true,
        status: true,
        expectedCloseAt: true,
        createdAt: true,
        stage: { select: { name: true } },
        assignees: { select: { assignee: { select: { email: true } } } },
        labels: { select: { label: { select: { name: true } } } },
      },
    });
    // `findMany` does not keep the order of an `in`, so the board order is reapplied.
    const byId = new Map(leads.map((lead) => [lead.id, lead]));
    for (const id of batch) {
      const lead = byId.get(id);
      if (!lead) continue;
      rows.push({
        name: lead.name,
        phone: lead.phone ?? "",
        email: lead.email ?? "",
        company: lead.company ?? "",
        stage: lead.stage.name,
        source: lead.source,
        // Several assignees share the one column; the importer reads the first.
        assignee: lead.assignees.map((row) => row.assignee.email).join(", "),
        expectedClose: lead.expectedCloseAt ? dayjs(lead.expectedCloseAt).format("YYYY-MM-DD") : "",
        note: "",
        status: lead.status,
        labels: lead.labels.map((row) => row.label.name).join(", "),
        createdAt: dayjs(lead.createdAt).format("YYYY-MM-DD HH:mm"),
      });
    }
  }

  const columns = [
    ...templateColumns(pipeline.type).filter((column) => column.key !== "note"),
    { key: "status", header: "Status" },
    { key: "labels", header: "Labels" },
    { key: "createdAt", header: "Created" },
  ];

  const buffer = await write({
    sheets: [
      {
        name: "Leads",
        columns: columns.map((column) => ({
          header: column.header,
          key: column.key,
          autoWidth: true,
        })),
        data: rows.map((row) =>
          Object.fromEntries(columns.map((column) => [column.key, row[column.key] ?? ""])),
        ),
      },
    ],
    format: query.format,
  });

  return { buffer, pipelineName: pipeline.name };
}

/** A filename-safe version of the board's name, e.g. "Sales leads" → "sales-leads". */
export function exportFilename(pipelineName: string, format: SpreadsheetExportFormat): string {
  const slug =
    pipelineName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "pipeline";
  return `${slug}-${dayjs().format("YYYY-MM-DD")}.${format}`;
}
