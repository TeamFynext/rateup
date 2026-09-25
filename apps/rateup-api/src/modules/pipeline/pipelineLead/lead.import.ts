import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

import type { LeadSource, PipelineType } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { readSpreadsheetRows, toCsv } from "../../../utils/spreadsheet.js";
import { LEADS_PIPELINE_TYPE } from "../pipelineTypes.js";
import { createLead, LeadExistsForContactError } from "./lead.service.js";

dayjs.extend(customParseFormat);

/** Rows one upload may carry. Each is a full `createLead`, so this bounds the request. */
export const LEAD_IMPORT_ROW_LIMIT = 1000;

export type ImportColumn =
  | "name"
  | "phone"
  | "email"
  | "company"
  | "stage"
  | "source"
  | "assignee"
  | "expectedClose"
  | "note";

/**
 * Headers are matched after lower-casing and dropping everything but letters, so
 * "Assignee email", "assignee_email" and "ASSIGNEE-EMAIL" are one column.
 */
const HEADER_ALIASES: Record<ImportColumn, readonly string[]> = {
  name: ["name", "leadname", "customername", "contactname", "title"],
  phone: ["phone", "phonenumber", "mobile", "whatsapp", "whatsappnumber"],
  email: ["email", "emailaddress"],
  company: ["company", "business", "businesscompany"],
  stage: ["stage", "leadstage", "column"],
  source: ["source"],
  assignee: ["assignee", "assigneeemail", "assignedto"],
  expectedClose: ["expectedclose", "expectedclosedate", "closedate"],
  note: ["note", "notes"],
};

const HEADER_TO_COLUMN = new Map<string, ImportColumn>(
  Object.entries(HEADER_ALIASES).flatMap(([column, aliases]) =>
    aliases.map((alias) => [alias, column as ImportColumn] as const),
  ),
);

const normaliseHeader = (header: string) => header.toLowerCase().replace(/[^a-z]/g, "");

/** The template's columns, headed the way the importer reads them back. */
export function templateColumns(type: PipelineType): Array<{ key: ImportColumn; header: string }> {
  const leads = type === LEADS_PIPELINE_TYPE;
  return [
    { key: "name", header: "Name" },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
    ...(leads ? [{ key: "company" as const, header: "Company" }] : []),
    { key: "stage", header: "Stage" },
    ...(leads ? [{ key: "source" as const, header: "Source" }] : []),
    { key: "assignee", header: "Assignee email" },
    ...(leads ? [{ key: "expectedClose" as const, header: "Expected close" }] : []),
    { key: "note", header: "Note" },
  ];
}

const LEAD_SOURCES: readonly LeadSource[] = [
  "WHATSAPP",
  "INSTAGRAM",
  "MESSENGER",
  "WEBCHAT",
  "SURVEY",
  "REFERRAL",
  "LOYALTY",
  "MANUAL",
];

/** Why a row was left out. Codes rather than sentences, so the UI can translate them. */
export type ImportSkipReason =
  | "MISSING_NAME"
  | "INVALID_PHONE"
  | "INVALID_EMAIL"
  | "UNKNOWN_STAGE"
  | "UNKNOWN_SOURCE"
  | "UNKNOWN_ASSIGNEE"
  | "INVALID_DATE"
  | "ALREADY_ON_BOARD"
  | "FAILED";

export interface ImportSkip {
  /** The spreadsheet row, counting the header as row 1. */
  row: number;
  name: string;
  reason: ImportSkipReason;
  /** The offending cell, when there is one. */
  value?: string;
}

export interface LeadImportResult {
  created: number;
  skipped: ImportSkip[];
}

export class LeadImportFileError extends Error {
  constructor(
    readonly code: "EMPTY" | "NO_NAME_COLUMN" | "TOO_MANY_ROWS" | "NO_STAGES",
    message: string,
  ) {
    super(message);
    this.name = "LeadImportFileError";
  }
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return dayjs(value).format("YYYY-MM-DD");
  return String(value).trim();
}

/** Digits with the country code, the way the board stores a typed number; null if invalid. */
function parsePhone(raw: string): string | null {
  // A number cell in Excel can come back as 9.19876543210E+11.
  const expanded = /e\+?\d+$/i.test(raw) ? Number(raw).toFixed(0) : raw;
  const digits = expanded.replace(/[^\d]/g, "");
  if (!digits) return null;
  return isValidPhoneNumber(`+${digits}`) ? digits : null;
}

function parseDate(raw: string): Date | null {
  const parsed = dayjs(raw, ["YYYY-MM-DD", "DD/MM/YYYY", "D/M/YYYY", "DD-MM-YYYY"], true);
  return parsed.isValid() ? parsed.toDate() : null;
}

async function assigneesByEmail(pipelineId: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; email: string | null }>>`
    SELECT DISTINCT u.id, u.email
    FROM "User" u
    INNER JOIN "TeamMember" tm ON u.id = tm."userId"
    INNER JOIN "PipelineTeam" pt ON tm."teamId" = pt."teamId"
    WHERE pt."pipelineId" = ${pipelineId}::uuid
      AND u.active = true
      AND u."deletedAt" IS NULL;
  `;
  return new Map(
    rows.filter((row) => row.email).map((row) => [row.email!.toLowerCase(), row.id] as const),
  );
}

/**
 * Puts every valid row of a spreadsheet on the board. A bad row is reported and skipped,
 * never fatal: an upload of 400 with three typos should land 397. The rows go in quietly
 * (see `quiet` on `createLead`), so an import sends no messages and pushes nothing out.
 */
export async function importLeads(input: {
  pipelineId: string;
  userId: string;
  buffer: Buffer;
  mimetype: string;
}): Promise<LeadImportResult> {
  const pipeline = await prisma.pipeline.findUniqueOrThrow({
    where: { id: input.pipelineId },
    select: {
      type: true,
      stages: { orderBy: { order: "asc" }, select: { id: true, name: true, status: true } },
    },
  });
  const defaultStage =
    pipeline.stages.find((stage) => stage.status === "OPEN") ?? pipeline.stages[0];
  if (!defaultStage) throw new LeadImportFileError("NO_STAGES", "This board has no columns yet.");

  // Raw rows with the blanks kept, so a reported row number is the one the person sees.
  const [header = [], ...body] = await readSpreadsheetRows(input.buffer, input.mimetype, {
    keepEmptyRows: true,
  });
  const columns = header.map((cell) => HEADER_TO_COLUMN.get(normaliseHeader(cellText(cell))));
  const rows = body
    .map((cells, index) => ({
      row: Object.fromEntries(
        columns.flatMap((column, i) => (column ? [[column, cells[i]] as const] : [])),
      ) as Partial<Record<ImportColumn, unknown>>,
      rowNumber: index + 2,
    }))
    .filter(({ row }) => Object.values(row).some((value) => cellText(value) !== ""));

  if (rows.length === 0) throw new LeadImportFileError("EMPTY", "The file has no rows.");
  if (rows.length > LEAD_IMPORT_ROW_LIMIT) {
    throw new LeadImportFileError(
      "TOO_MANY_ROWS",
      `A file can hold up to ${LEAD_IMPORT_ROW_LIMIT} rows.`,
    );
  }
  if (!columns.includes("name")) {
    throw new LeadImportFileError("NO_NAME_COLUMN", "The file needs a Name column.");
  }

  const isLeads = pipeline.type === LEADS_PIPELINE_TYPE;
  const stageByName = new Map(pipeline.stages.map((stage) => [stage.name.toLowerCase(), stage]));
  const assignees = await assigneesByEmail(input.pipelineId);
  const emailSchema = z.email();

  const result: LeadImportResult = { created: 0, skipped: [] };

  for (const { row, rowNumber } of rows) {
    const cell = (column: ImportColumn) => cellText(row[column]);
    const name = cell("name");
    const skip = (reason: ImportSkipReason, value?: string) =>
      result.skipped.push({ row: rowNumber, name, reason, ...(value ? { value } : {}) });

    if (!name) {
      skip("MISSING_NAME");
      continue;
    }

    const rawPhone = cell("phone");
    const phone = rawPhone ? parsePhone(rawPhone) : null;
    if (rawPhone && !phone) {
      skip("INVALID_PHONE", rawPhone);
      continue;
    }

    const email = cell("email");
    if (email && !emailSchema.safeParse(email).success) {
      skip("INVALID_EMAIL", email);
      continue;
    }

    const stageName = cell("stage");
    const stage = stageName ? stageByName.get(stageName.toLowerCase()) : defaultStage;
    if (!stage) {
      skip("UNKNOWN_STAGE", stageName);
      continue;
    }

    const rawSource = isLeads ? cell("source") : "";
    const source = rawSource
      ? LEAD_SOURCES.find((candidate) => candidate === rawSource.toUpperCase().replace(/\s/g, ""))
      : "MANUAL";
    if (!source) {
      skip("UNKNOWN_SOURCE", rawSource);
      continue;
    }

    const assigneeEmail = cell("assignee");
    const assigneeId = assigneeEmail ? assignees.get(assigneeEmail.toLowerCase()) : undefined;
    if (assigneeEmail && !assigneeId) {
      skip("UNKNOWN_ASSIGNEE", assigneeEmail);
      continue;
    }

    const rawClose = isLeads ? cell("expectedClose") : "";
    const expectedClose = rawClose ? parseDate(rawClose) : null;
    if (rawClose && !expectedClose) {
      skip("INVALID_DATE", rawClose);
      continue;
    }

    try {
      const lead = await createLead({
        pipelineId: input.pipelineId,
        stageId: stage.id,
        name,
        company: isLeads ? cell("company") || null : null,
        phone,
        email: email || null,
        source,
        channel:
          source === "WHATSAPP" || source === "INSTAGRAM" || source === "MESSENGER"
            ? source
            : "NONE",
        expectedCloseAt: expectedClose?.toISOString() ?? null,
        assigneeIds: assigneeId ? [assigneeId] : undefined,
        userId: input.userId,
        quiet: true,
      });
      const note = cell("note");
      if (note) {
        await prisma.leadNote.create({
          data: { leadId: lead.id, text: note.slice(0, 4000), authorId: input.userId },
        });
      }
      result.created += 1;
    } catch (error) {
      if (error instanceof LeadExistsForContactError) {
        skip("ALREADY_ON_BOARD");
      } else {
        skip("FAILED");
      }
    }
  }

  return result;
}

/** A starter file in the board's own shape: its columns, and its real stage names. */
export async function buildImportTemplate(pipelineId: string, format: "csv" | "xlsx") {
  const pipeline = await prisma.pipeline.findUniqueOrThrow({
    where: { id: pipelineId },
    select: {
      type: true,
      stages: { orderBy: { order: "asc" }, select: { name: true, status: true } },
    },
  });
  const columns = templateColumns(pipeline.type);
  const open = pipeline.stages.filter((stage) => stage.status === "OPEN");
  const example: Array<Record<ImportColumn, string>> = [
    {
      name: "Anjali Sharma",
      phone: "919876543210",
      email: "anjali@example.com",
      company: "Sharma Traders",
      stage: open[0]?.name ?? pipeline.stages[0]?.name ?? "",
      source: "WHATSAPP",
      assignee: "",
      expectedClose: dayjs().add(30, "day").format("YYYY-MM-DD"),
      note: "Asked for a price list",
    },
    {
      name: "Rahul Verma",
      phone: "919812345678",
      email: "",
      company: "",
      stage: open[1]?.name ?? open[0]?.name ?? pipeline.stages[0]?.name ?? "",
      source: "REFERRAL",
      assignee: "",
      expectedClose: "",
      note: "",
    },
  ];

  if (format === "csv") {
    return toCsv([
      columns.map((column) => column.header),
      ...example.map((row) => columns.map((column) => row[column.key])),
    ]);
  }

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Import");
  sheet.columns = columns.map((column) => ({ header: column.header, key: column.key, width: 22 }));
  sheet.getRow(1).font = { bold: true };
  for (const row of example) sheet.addRow(row);
  // Kept as text so Excel does not turn +91… into 9.19E+11 or drop the plus.
  sheet.getColumn("phone").numFmt = "@";
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
