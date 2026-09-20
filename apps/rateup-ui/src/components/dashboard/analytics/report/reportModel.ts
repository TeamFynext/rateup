/**
 * A report as data: what the PDF says, independent of how it is drawn. The builders
 * produce one of these from API responses, and the renderer lays it out.
 */

export type Tone = "good" | "bad" | "neutral";

export interface ReportStat {
  label: string;
  value: string;
  /** The value is a sentence standing in for a number ("No replies yet"): drawn smaller and muted. */
  placeholder?: boolean;
  note?: string;
  change?: { text: string; tone: Tone };
}

export interface ReportSeries {
  name: string;
  /** "primary" is the chart blue, "destructive" the failure red. */
  color: "primary" | "destructive";
}

export type ReportBlock =
  | { kind: "section"; title: string; note?: string }
  | { kind: "stats"; items: ReportStat[] }
  | {
      kind: "bars";
      title: string;
      note?: string;
      series: ReportSeries[];
      /** One value per series, stacked. */
      points: { label: string; values: number[] }[];
      /** Seconds get time-shaped axis steps (30s, 1m, 5m…) and duration labels. */
      unit?: "count" | "seconds";
    }
  | {
      kind: "table";
      title: string;
      note?: string;
      columns: { label: string; align?: "left" | "right" }[];
      rows: string[][];
      /** Indexes of rows that need attention; drawn in the failure red. */
      flagged?: number[];
    }
  | { kind: "empty"; title: string; text: string };

export interface Report {
  title: string;
  /** "12 Sep – 18 Sep 2026", "Team: Support", … */
  scope: string[];
  blocks: ReportBlock[];
}

export type Translate = (key: string, values?: Record<string, unknown>) => string;
