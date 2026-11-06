import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

import { formatDuration } from "../kit/format.ts";
import type { ReportImage } from "./loadImage.ts";
import type { Report, ReportBlock, ReportStat, Tone } from "./reportModel.ts";

/**
 * Lays a Report out on A4 as real text, tables and vector charts.
 *
 * Colours are the app's light-theme tokens, spelled as hex because a PDF has no CSS
 * variables: keep them in step with `src/styles/foundation.css`.
 */
const COLOR = {
  navy: "#0f2540",
  ink: "#1b2027",
  muted: "#6b7480",
  border: "#e4e7ec",
  surface: "#f7f8fa",
  primary: "#2e68a8",
  destructive: "#c4342c",
  good: "#15803d",
} as const;

const PAGE = { width: 595.28, height: 841.89, margin: 40 } as const;
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
/** Space kept clear for the footer on every page. */
const BOTTOM = PAGE.height - PAGE.margin - 16;

const TONE: Record<Tone, string> = {
  good: COLOR.good,
  bad: COLOR.destructive,
  neutral: COLOR.muted,
};

class Layout {
  y: number = PAGE.margin;

  constructor(readonly doc: jsPDF) {}

  /** Starts a new page when `height` would not fit below the cursor. */
  ensure(height: number) {
    if (this.y + height > BOTTOM) {
      this.doc.addPage();
      this.y = PAGE.margin;
    }
  }

  text(
    value: string,
    x: number,
    y: number,
    style: { size: number; color: string; bold?: boolean; align?: "left" | "right" | "center" },
  ) {
    this.doc.setFont("helvetica", style.bold ? "bold" : "normal");
    this.doc.setFontSize(style.size);
    this.doc.setTextColor(style.color);
    this.doc.text(value, x, y, { align: style.align ?? "left", baseline: "top" });
  }

  /** Draws `image` as large as fits the box, centred in it, keeping its proportions. */
  image(image: ReportImage, x: number, y: number, width: number, height: number) {
    const scale = Math.min(width / image.width, height / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    this.doc.addImage(image.data, "PNG", x + (width - w) / 2, y + (height - h) / 2, w, h);
  }

  /** Shortens `value` with an ellipsis until it fits `width` at the current font. */
  fit(value: string, width: number, size: number, bold = false) {
    this.doc.setFont("helvetica", bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    if (this.doc.getTextWidth(value) <= width) return value;
    let cut = value;
    while (cut.length > 1 && this.doc.getTextWidth(`${cut}…`) > width) cut = cut.slice(0, -1);
    return `${cut}…`;
  }
}

export interface ReportBranding {
  org: { name: string | null; logo: ReportImage | null };
  /** RateUp's square mark, for the footer. */
  rateupIcon: ReportImage | null;
  /** "Generated 19 Sep 2026, 12:50 PM". */
  generated: string;
}

const BAND_HEIGHT = 64;

function drawHeader(layout: Layout, report: Report, org: ReportBranding["org"]) {
  const { doc } = layout;
  doc.setFillColor(COLOR.navy);
  doc.rect(0, 0, PAGE.width, BAND_HEIGHT, "F");

  // Logos are drawn on white: most are made for light backgrounds and vanish on navy.
  const tile = 36;
  const tileY = (BAND_HEIGHT - tile) / 2;
  doc.setFillColor("#ffffff");
  doc.roundedRect(PAGE.margin, tileY, tile, tile, 6, 6, "F");
  if (org.logo) {
    layout.image(org.logo, PAGE.margin + 4, tileY + 4, tile - 8, tile - 8);
  } else {
    const initials = (org.name ?? "").trim().slice(0, 2).toUpperCase() || "—";
    layout.text(initials, PAGE.margin + tile / 2, tileY + 12, {
      size: 12,
      color: COLOR.navy,
      bold: true,
      align: "center",
    });
  }

  const nameX = PAGE.margin + tile + 12;
  const rightLabel = "Analytics report";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const nameWidth = PAGE.width - PAGE.margin - doc.getTextWidth(rightLabel) - 24 - nameX;
  layout.text(layout.fit(org.name ?? "", nameWidth, 14, true), nameX, BAND_HEIGHT / 2 - 8, {
    size: 14,
    color: "#ffffff",
    bold: true,
  });
  layout.text(rightLabel, PAGE.width - PAGE.margin, BAND_HEIGHT / 2 - 5, {
    size: 9,
    color: "#c7d3e3",
    align: "right",
  });

  layout.y = BAND_HEIGHT + 24;
  layout.text(report.title, PAGE.margin, layout.y, { size: 22, color: COLOR.ink, bold: true });
  layout.y += 32;
  const scope = report.scope.filter(Boolean).join("   ·   ");
  layout.text(layout.fit(scope, CONTENT_WIDTH, 9.5), PAGE.margin, layout.y, {
    size: 9.5,
    color: COLOR.muted,
  });
  layout.y += 20;
  doc.setDrawColor(COLOR.border);
  doc.setLineWidth(0.75);
  doc.line(PAGE.margin, layout.y, PAGE.width - PAGE.margin, layout.y);
  layout.y += 18;
}

function drawSection(layout: Layout, block: Extract<ReportBlock, { kind: "section" }>) {
  // Keep a heading with at least the start of what follows it.
  layout.ensure(90);
  layout.y += 6;
  layout.text(block.title, PAGE.margin, layout.y, { size: 13, color: COLOR.ink, bold: true });
  layout.y += 18;
  if (block.note) {
    layout.text(block.note, PAGE.margin, layout.y, { size: 8.5, color: COLOR.muted });
    layout.y += 14;
  }
  layout.y += 4;
}

function drawStat(layout: Layout, stat: ReportStat, x: number, y: number, width: number) {
  const { doc } = layout;
  doc.setDrawColor(COLOR.border);
  doc.setLineWidth(0.75);
  doc.roundedRect(x, y, width, 70, 6, 6, "S");
  const inner = width - 20;
  layout.text(layout.fit(stat.label.toUpperCase(), inner, 7), x + 10, y + 10, {
    size: 7,
    color: COLOR.muted,
    bold: true,
  });
  if (stat.placeholder) {
    layout.text(layout.fit(stat.value, inner, 10), x + 10, y + 28, {
      size: 10,
      color: COLOR.muted,
    });
  } else {
    layout.text(layout.fit(stat.value, inner, 16, true), x + 10, y + 24, {
      size: 16,
      color: COLOR.ink,
      bold: true,
    });
  }
  const detail = stat.change ?? (stat.note ? { text: stat.note, tone: "neutral" as const } : null);
  if (detail) {
    layout.text(layout.fit(detail.text, inner, 7.5), x + 10, y + 50, {
      size: 7.5,
      color: TONE[detail.tone],
    });
  }
}

function drawStats(layout: Layout, block: Extract<ReportBlock, { kind: "stats" }>) {
  const columns = 4;
  const gap = 10;
  const width = (CONTENT_WIDTH - gap * (columns - 1)) / columns;
  for (let i = 0; i < block.items.length; i += columns) {
    layout.ensure(80);
    block.items.slice(i, i + columns).forEach((stat, index) => {
      drawStat(layout, stat, PAGE.margin + index * (width + gap), layout.y, width);
    });
    layout.y += 80;
  }
  layout.y += 6;
}

function drawBlockTitle(layout: Layout, title: string, note?: string) {
  layout.text(title, PAGE.margin, layout.y, { size: 10.5, color: COLOR.ink, bold: true });
  layout.y += 15;
  if (note) {
    layout.text(note, PAGE.margin, layout.y, { size: 8, color: COLOR.muted });
    layout.y += 13;
  }
  layout.y += 2;
}

/** A readable y-axis step for counts: 1, 2 or 5 times a power of ten, never below 1. */
function countStep(max: number, steps: number) {
  const raw = Math.max(max, 1) / steps;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = [1, 2, 5, 10].find((m) => m * power >= raw) ?? 10;
  return Math.max(1, unit * power);
}

/** Steps a clock reads naturally, in seconds: 10s, 30s, 1m, 5m, 15m, 1h… */
const DURATION_STEPS = [
  1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600, 43200, 86400,
];

function durationStep(max: number, steps: number) {
  const raw = Math.max(max, 1) / steps;
  return DURATION_STEPS.find((step) => step >= raw) ?? Math.ceil(raw / 86400) * 86400;
}

function drawBars(layout: Layout, block: Extract<ReportBlock, { kind: "bars" }>) {
  const { doc } = layout;
  const chartHeight = 130;
  layout.ensure(chartHeight + 70);
  drawBlockTitle(layout, block.title, block.note);

  const axisWidth = 46;
  const left = PAGE.margin + axisWidth;
  const width = CONTENT_WIDTH - axisWidth;
  const top = layout.y + 4;
  const bottom = top + chartHeight;
  const isDuration = block.unit === "seconds";
  const format = isDuration
    ? (value: number) => formatDuration(value) ?? ""
    : (value: number) => Math.round(value).toLocaleString();

  const highest = Math.max(...block.points.map((p) => p.values.reduce((a, b) => a + b, 0)));
  const step = isDuration ? durationStep(highest, 4) : countStep(highest, 4);
  const max = step * 4;

  doc.setLineWidth(0.5);
  doc.setLineDashPattern([2, 2], 0);
  for (let i = 0; i <= 4; i++) {
    const y = bottom - (chartHeight * i) / 4;
    doc.setDrawColor(COLOR.border);
    doc.line(left, y, left + width, y);
    layout.text(format(step * i), left - 6, y - 4, { size: 7, color: COLOR.muted, align: "right" });
  }
  doc.setLineDashPattern([], 0);

  const slot = width / block.points.length;
  const barWidth = Math.min(28, slot * 0.6);
  // Label every nth bar so the dates never overlap.
  const labelEvery = Math.max(1, Math.ceil(block.points.length / Math.floor(width / 42)));
  block.points.forEach((point, index) => {
    const x = left + slot * index + (slot - barWidth) / 2;
    let y = bottom;
    point.values.forEach((value, series) => {
      if (value <= 0) return;
      const height = (value / max) * chartHeight;
      y -= height;
      doc.setFillColor(COLOR[block.series[series]?.color ?? "primary"]);
      doc.rect(x, y, barWidth, height, "F");
    });
    if (index % labelEvery === 0) {
      layout.text(point.label, x + barWidth / 2, bottom + 5, {
        size: 7,
        color: COLOR.muted,
        align: "center",
      });
    }
  });
  layout.y = bottom + 20;

  if (block.series.length > 1) {
    let x = PAGE.margin + axisWidth;
    for (const series of block.series) {
      doc.setFillColor(COLOR[series.color]);
      doc.rect(x, layout.y + 1, 7, 7, "F");
      layout.text(series.name, x + 11, layout.y, { size: 8, color: COLOR.ink });
      x += 11 + doc.getTextWidth(series.name) + 16;
    }
    layout.y += 14;
  }
  layout.y += 14;
}

function drawTable(layout: Layout, block: Extract<ReportBlock, { kind: "table" }>) {
  layout.ensure(80);
  drawBlockTitle(layout, block.title, block.note);
  let finalY = layout.y;
  autoTable(layout.doc, {
    startY: layout.y,
    margin: {
      left: PAGE.margin,
      right: PAGE.margin,
      top: PAGE.margin,
      bottom: PAGE.height - BOTTOM,
    },
    head: [block.columns.map((column) => column.label)],
    body: block.rows,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: COLOR.ink,
      cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      lineColor: COLOR.border,
      overflow: "ellipsize",
    },
    headStyles: {
      fillColor: COLOR.surface,
      textColor: COLOR.muted,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    bodyStyles: { lineWidth: { bottom: 0.5 } },
    columnStyles: Object.fromEntries(
      block.columns.map((column, index) => [index, { halign: column.align ?? "left" }]),
    ),
    didParseCell: (data) => {
      if (data.section === "body" && block.flagged?.includes(data.row.index)) {
        data.cell.styles.textColor = COLOR.destructive;
      }
      if (data.section === "head")
        data.cell.styles.halign = block.columns[data.column.index]?.align ?? "left";
    },
    didDrawPage: (data) => {
      finalY = data.cursor?.y ?? finalY;
    },
  });
  layout.y = finalY + 22;
}

function drawEmpty(layout: Layout, block: Extract<ReportBlock, { kind: "empty" }>) {
  layout.ensure(60);
  drawBlockTitle(layout, block.title);
  const { doc } = layout;
  doc.setFillColor(COLOR.surface);
  doc.roundedRect(PAGE.margin, layout.y, CONTENT_WIDTH, 34, 6, 6, "F");
  layout.text(block.text, PAGE.margin + CONTENT_WIDTH / 2, layout.y + 12, {
    size: 8.5,
    color: COLOR.muted,
    align: "center",
  });
  layout.y += 50;
}

function drawFooters(layout: Layout, branding: ReportBranding) {
  const { doc } = layout;
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const y = PAGE.height - PAGE.margin + 4;
    doc.setDrawColor(COLOR.border);
    doc.setLineWidth(0.5);
    doc.line(PAGE.margin, y - 10, PAGE.width - PAGE.margin, y - 10);

    let x = PAGE.margin;
    if (branding.rateupIcon) {
      layout.image(branding.rateupIcon, x, y - 2, 12, 12);
      x += 16;
    }
    layout.text("RateUp", x, y, { size: 8.5, color: COLOR.ink, bold: true });
    x += doc.getTextWidth("RateUp") + 8;
    layout.text(branding.generated, x, y + 0.5, { size: 7.5, color: COLOR.muted });
    layout.text(`${page} / ${pages}`, PAGE.width - PAGE.margin, y + 0.5, {
      size: 7.5,
      color: COLOR.muted,
      align: "right",
    });
  }
}

export function createReportPdf(report: Report, branding: ReportBranding) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setProperties({
    title: [branding.org.name, report.title].filter(Boolean).join(" — "),
    creator: "RateUp",
  });
  const layout = new Layout(doc);
  drawHeader(layout, report, branding.org);

  for (const block of report.blocks) {
    switch (block.kind) {
      case "section":
        drawSection(layout, block);
        break;
      case "stats":
        drawStats(layout, block);
        break;
      case "bars":
        drawBars(layout, block);
        break;
      case "table":
        drawTable(layout, block);
        break;
      case "empty":
        drawEmpty(layout, block);
        break;
    }
  }

  drawFooters(layout, branding);
  return doc;
}
