import { z } from "zod";
import { parseCsv, parseCsvObjects } from "hucre/csv";
import { read, readXlsxObjects, readOdsObjects } from "hucre";
import type { CellValue } from "hucre";

export const ODS_MIMETYPE = "application/vnd.oasis.opendocument.spreadsheet";
export const CSV_MIMETYPES = ["text/csv", "application/vnd.ms-excel"];

// --- Export (write) side ---

export const spreadsheetExportFormats = ["xlsx", "ods"] as const;
export type SpreadsheetExportFormat = (typeof spreadsheetExportFormats)[number];
export const spreadsheetExportFormatSchema = z.enum(spreadsheetExportFormats);

export const spreadsheetExportContentTypes: Record<SpreadsheetExportFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ods: ODS_MIMETYPE,
};

export function getSpreadsheetContentType(format: SpreadsheetExportFormat): string {
  return spreadsheetExportContentTypes[format];
}

export function getSpreadsheetFilename(basename: string, format: SpreadsheetExportFormat): string {
  return `${basename}.${format}`;
}

// --- Import (read) side ---

export type SpreadsheetInputFormat = "csv" | "xlsx" | "ods";

export function detectSpreadsheetFormat(mimetype: string): SpreadsheetInputFormat {
  if (CSV_MIMETYPES.includes(mimetype)) return "csv";
  if (mimetype === ODS_MIMETYPE) return "ods";
  return "xlsx";
}

export async function readSpreadsheetObjects(
  buffer: Buffer,
  mimetype: string,
  options: {
    transformHeader?: (header: string) => string;
    transformValue?: (value: CellValue) => CellValue;
  } = {},
): Promise<{ data: Record<string, unknown>[] }> {
  const format = detectSpreadsheetFormat(mimetype);
  if (format === "csv") {
    return parseCsvObjects(buffer.toString("utf-8"), {
      header: true,
      skipEmptyRows: true,
      ...options,
    }) as { data: Record<string, unknown>[] };
  }
  const reader = format === "ods" ? readOdsObjects : readXlsxObjects;
  return reader(buffer, options) as Promise<{ data: Record<string, unknown>[] }>;
}

/** Raw rows (array of arrays), for files without a usable header row. */
export async function readSpreadsheetRows(buffer: Buffer, mimetype: string): Promise<unknown[][]> {
  if (detectSpreadsheetFormat(mimetype) === "csv") {
    return parseCsv(buffer.toString("utf-8"), { skipEmptyRows: true });
  }
  // xlsx vs ods is auto-detected from content here — no need to branch on mimetype.
  const wb = await read(buffer);
  return wb.sheets[0]?.rows ?? [];
}
