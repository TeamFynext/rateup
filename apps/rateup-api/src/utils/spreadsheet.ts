import { z } from "zod";
import { parseCsv, parseCsvObjects } from "hucre/csv";
import { read, readXlsxObjects, readOdsObjects, write } from "hucre";
import type { CellValue, CsvWriteOptions } from "hucre";

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

/** The spreadsheet formats plus CSV, for exports that also offer a plain-text file. */
export const tabularExportFormats = ["csv", ...spreadsheetExportFormats] as const;
export type TabularExportFormat = (typeof tabularExportFormats)[number];
export const tabularExportFormatSchema = z.enum(tabularExportFormats);

const tabularExportContentTypes: Record<TabularExportFormat, string> = {
  ...spreadsheetExportContentTypes,
  csv: "text/csv; charset=utf-8",
};

/**
 * hucre's CSV output, readied for a file people open in Excel: the BOM makes it read
 * the file as UTF-8, and a cell starting with = + - @ is quoted so it stays text.
 */
const csvExportOptions: CsvWriteOptions = { bom: true, escapeFormulae: true };

/** One column of an export: its heading, and how to read its cell off an item. */
export interface ExportColumn<T> {
  header: string;
  /** Width in characters; kept by XLSX, dropped by CSV and ODS. */
  width?: number;
  value: (item: T) => CellValue;
}

/**
 * A one-sheet export in any {@link TabularExportFormat}, from a single column list.
 *
 * The sheet goes to hucre as `rows` with the header row included, not as
 * `columns` + `data`: hucre 1.1.0's text writers read only `rows`, so the object form
 * comes out as an empty CSV.
 */
export function writeTabularExport<T>(
  name: string,
  columns: ReadonlyArray<ExportColumn<T>>,
  items: readonly T[],
  format: TabularExportFormat,
): Promise<Uint8Array> {
  return write({
    sheets: [
      {
        name,
        columns: columns.map(({ header, width }) => ({ header, width })),
        rows: [
          columns.map((column) => column.header),
          ...items.map((item) => columns.map((column) => column.value(item))),
        ],
      },
    ],
    format,
    csv: csvExportOptions,
  });
}

export function getSpreadsheetContentType(format: TabularExportFormat): string {
  return tabularExportContentTypes[format];
}

export function getSpreadsheetFilename(basename: string, format: TabularExportFormat): string {
  return `${basename}.${format}`;
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";

  let text = String(value);

  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
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

/**
 * Raw rows (array of arrays), for files without a usable header row. `keepEmptyRows`
 * leaves blank rows in place, so an index still matches the row a person sees.
 */
export async function readSpreadsheetRows(
  buffer: Buffer,
  mimetype: string,
  { keepEmptyRows = false }: { keepEmptyRows?: boolean } = {},
): Promise<unknown[][]> {
  if (detectSpreadsheetFormat(mimetype) === "csv") {
    return parseCsv(buffer.toString("utf-8"), { skipEmptyRows: !keepEmptyRows });
  }
  // xlsx vs ods is auto-detected from content here — no need to branch on mimetype.
  const wb = await read(buffer);
  return wb.sheets[0]?.rows ?? [];
}
