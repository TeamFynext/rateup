import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

import { addressLines } from "./address.js";
import { toNumber } from "./pricing.js";
import type { ShopSelectedShipping } from "./shop.types.js";

export function formatInvoiceNumber(prefix: string, seq: number) {
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export interface InvoiceData {
  number: string;
  issuedAt: Date;
  store: {
    name: string;
    businessAddress: string | null;
    taxId: string | null;
    taxRate: unknown;
    pricesIncludeTax: boolean;
  };
  /** PNG or JPEG bytes; anything else is converted before it gets here. */
  logo?: { bytes: Uint8Array; type: "png" | "jpg" } | null;
  order: {
    number: number;
    currency: string;
    customerName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    shippingAddress: unknown;
    shippingRate: unknown;
    paymentMethod: string | null;
    paymentStatus: string;
    paidAt: Date | null;
    subtotal: unknown;
    discountTotal: unknown;
    discountCode: string | null;
    pointsDiscount: unknown;
    pointsRedeemed: number;
    shippingTotal: unknown;
    taxTotal: unknown;
    total: unknown;
    items: {
      title: string;
      variantTitle: string | null;
      sku: string | null;
      unitPrice: unknown;
      quantity: number;
      lineTotal: unknown;
    }[];
  };
}

const PAYMENT_METHODS: Record<string, string> = {
  stripe: "Card (Stripe)",
  razorpay: "Online (Razorpay)",
  cod: "Cash on delivery",
  bank: "Bank transfer",
  cash: "Cash",
  manual: "Recorded by the store",
  online: "Online payment",
};

const PAYMENT_STATUS: Record<string, string> = {
  PAID: "Paid",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded",
};

export const paymentMethodLabel = (method: string | null) =>
  method ? (PAYMENT_METHODS[method] ?? method.replace(/[_-]+/g, " ")) : "—";

export { addressLines } from "./address.js";

const money = (currency: string, n: unknown) =>
  `${currency} ${toNumber(n as number).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** The rows under the line items, in print order. Zero lines are left out except the total. */
export function totalLines(data: InvoiceData): { label: string; value: string; bold?: boolean }[] {
  const o = data.order;
  const c = o.currency;
  const rows: { label: string; value: string; bold?: boolean }[] = [
    { label: "Subtotal", value: money(c, o.subtotal) },
  ];
  if (toNumber(o.discountTotal as number) > 0) {
    rows.push({
      label: o.discountCode ? `Discount (${o.discountCode})` : "Discount",
      value: `-${money(c, o.discountTotal)}`,
    });
  }
  if (toNumber(o.pointsDiscount as number) > 0) {
    rows.push({
      label: `Loyalty points (${o.pointsRedeemed})`,
      value: `-${money(c, o.pointsDiscount)}`,
    });
  }
  const shipping = o.shippingRate as ShopSelectedShipping | null;
  if (shipping || toNumber(o.shippingTotal as number) > 0) {
    rows.push({
      label: shipping?.name ? `Delivery (${shipping.name})` : "Delivery",
      value: money(c, o.shippingTotal),
    });
  }
  if (toNumber(o.taxTotal as number) > 0) {
    const rate = data.store.taxRate == null ? null : toNumber(data.store.taxRate as number);
    const label = `Tax${rate ? ` ${rate}%` : ""}${data.store.pricesIncludeTax ? " (included)" : ""}`;
    rows.push({ label, value: money(c, o.taxTotal) });
  }
  rows.push({ label: "Total", value: money(c, o.total), bold: true });
  return rows;
}

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.42, 0.45, 0.5);
const RULE = rgb(0.86, 0.87, 0.9);

/**
 * The standard PDF fonts only cover Latin-1 (WinAnsi), so a character outside it would throw
 * mid-render. Accents are folded first, and whatever is left becomes "?".
 */
function printable(font: PDFFont, text: string) {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    if (canEncode(font, ch)) {
      out += ch;
      continue;
    }
    const folded = ch.normalize("NFKD").replace(/\p{M}/gu, "");
    out += folded && [...folded].every((c) => canEncode(font, c)) ? folded : "?";
  }
  return out;
}

function canEncode(font: PDFFont, ch: string) {
  try {
    font.encodeText(ch);
    return true;
  } catch {
    return false;
  }
}

function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function buildInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Invoice ${data.number}`);
  doc.setAuthor(data.store.name);
  doc.setCreationDate(data.issuedAt);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  if (data.logo) {
    try {
      logo =
        data.logo.type === "png"
          ? await doc.embedPng(data.logo.bytes)
          : await doc.embedJpg(data.logo.bytes);
    } catch {
      logo = null;
    }
  }

  const [width, height] = A4;
  const right = width - MARGIN;
  let page: PDFPage = doc.addPage(A4);
  let y = height - MARGIN;

  const text = (
    value: string,
    x: number,
    opts: { size?: number; font?: PDFFont; color?: typeof INK; align?: "left" | "right" } = {},
  ) => {
    const font = opts.font ?? regular;
    const size = opts.size ?? 10;
    const safe = printable(font, value);
    const drawX = opts.align === "right" ? x - font.widthOfTextAtSize(safe, size) : x;
    page.drawText(safe, { x: drawX, y, size, font, color: opts.color ?? INK });
  };

  // Header: the seller on the left, the invoice facts on the right.
  const headerTop = y;
  let left = MARGIN;
  if (logo) {
    const scaled = logo.scaleToFit(56, 56);
    page.drawImage(logo, { x: MARGIN, y: y - scaled.height + 14, ...scaled });
    left = MARGIN + scaled.width + 12;
  }
  text(data.store.name, left, { size: 16, font: bold });
  y -= 18;
  for (const line of (data.store.businessAddress ?? "").split("\n").filter((l) => l.trim())) {
    text(line.trim(), left, { size: 9, color: MUTED });
    y -= 12;
  }
  if (data.store.taxId) {
    text(`Tax ID: ${data.store.taxId}`, left, { size: 9, color: MUTED });
    y -= 12;
  }
  const leftBottom = y;

  y = headerTop;
  text("INVOICE", right, { size: 20, font: bold, align: "right" });
  y -= 22;
  const facts: [string, string][] = [
    ["Invoice", data.number],
    ["Date", data.issuedAt.toISOString().slice(0, 10)],
    ["Order", `#${data.order.number}`],
    ["Payment", paymentMethodLabel(data.order.paymentMethod)],
    ["Status", PAYMENT_STATUS[data.order.paymentStatus] ?? data.order.paymentStatus],
  ];
  for (const [label, value] of facts) {
    text(label, right - 130, { size: 9, color: MUTED });
    text(value, right, { size: 9, font: bold, align: "right" });
    y -= 13;
  }
  y = Math.min(y, leftBottom) - 18;

  // Bill to.
  text("BILL TO", MARGIN, { size: 8, font: bold, color: MUTED });
  y -= 14;
  const o = data.order;
  const customer = [
    o.customerName,
    o.customerPhone,
    o.customerEmail,
    ...addressLines(o.shippingAddress),
  ].filter((l): l is string => !!l);
  for (const line of customer.length ? customer : ["—"]) {
    text(line, MARGIN, { size: 10 });
    y -= 13;
  }
  y -= 14;

  // Line items.
  const cols = { qty: right - 200, unit: right - 90, amount: right };
  const itemWidth = cols.qty - MARGIN - 40;
  const tableHeader = () => {
    text("ITEM", MARGIN, { size: 8, font: bold, color: MUTED });
    text("QTY", cols.qty, { size: 8, font: bold, color: MUTED, align: "right" });
    text("UNIT PRICE", cols.unit, { size: 8, font: bold, color: MUTED, align: "right" });
    text("AMOUNT", cols.amount, { size: 8, font: bold, color: MUTED, align: "right" });
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: right, y }, thickness: 0.75, color: RULE });
    y -= 14;
  };
  const ensureRoom = (needed: number) => {
    if (y - needed >= MARGIN + 20) return;
    page = doc.addPage(A4);
    y = height - MARGIN;
    text(`Invoice ${data.number} (continued)`, MARGIN, { size: 9, color: MUTED });
    y -= 24;
    tableHeader();
  };
  tableHeader();
  for (const item of o.items) {
    const title = wrap(bold, printable(bold, item.title), 10, itemWidth);
    const detail = [item.variantTitle, item.sku ? `SKU ${item.sku}` : null]
      .filter(Boolean)
      .join(" · ");
    const detailLines = detail ? wrap(regular, printable(regular, detail), 8.5, itemWidth) : [];
    ensureRoom(title.length * 13 + detailLines.length * 11 + 10);
    text(String(item.quantity), cols.qty, { size: 10, align: "right" });
    text(money(o.currency, item.unitPrice), cols.unit, { size: 10, align: "right" });
    text(money(o.currency, item.lineTotal), cols.amount, { size: 10, align: "right" });
    for (const line of title) {
      text(line, MARGIN, { size: 10, font: bold });
      y -= 13;
    }
    for (const line of detailLines) {
      text(line, MARGIN, { size: 8.5, color: MUTED });
      y -= 11;
    }
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y: y + 2 },
      end: { x: right, y: y + 2 },
      thickness: 0.5,
      color: RULE,
    });
    y -= 10;
  }

  // Totals.
  const totals = totalLines(data);
  ensureRoom(totals.length * 16 + 40);
  y -= 4;
  for (const row of totals) {
    if (row.bold) {
      page.drawLine({
        start: { x: right - 220, y: y + 12 },
        end: { x: right, y: y + 12 },
        thickness: 0.75,
        color: RULE,
      });
      y -= 4;
    }
    const font = row.bold ? bold : regular;
    const size = row.bold ? 12 : 10;
    text(row.label, right - 220, { size, font, color: row.bold ? INK : MUTED });
    text(row.value, right, { size, font, align: "right" });
    y -= row.bold ? 18 : 15;
  }

  y = MARGIN;
  text("Thank you for your order.", MARGIN, { size: 9, color: MUTED });

  return doc.save();
}
