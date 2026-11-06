import { inflateSync } from "node:zlib";

import { describe, expect, test } from "vite-plus/test";

import { buildInvoicePdf, formatInvoiceNumber, totalLines, type InvoiceData } from "./invoice.js";

/** Every string the PDF draws. pdf-lib writes standard-font text as hex inside deflated streams. */
function drawnText(pdf: Uint8Array) {
  const raw = Buffer.from(pdf).toString("latin1");
  const out: string[] = [];
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let body: string;
    try {
      body = inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
    } catch {
      body = m[1];
    }
    for (const hex of body.matchAll(/<([0-9A-Fa-f]+)> Tj/g)) {
      out.push(Buffer.from(hex[1], "hex").toString("latin1"));
    }
  }
  return out.join("\n");
}

const data: InvoiceData = {
  number: "INV-0007",
  issuedAt: new Date("2026-10-18T10:00:00Z"),
  store: {
    name: "Fern & Field Coffee",
    businessAddress: "12 Harbor Street\nPortland, OR 97201\nhello@fernfield.test",
    taxId: "TX-555-0100",
    taxRate: 8,
    pricesIncludeTax: false,
  },
  logo: null,
  order: {
    number: 1042,
    currency: "USD",
    customerName: "Olivia Bennett",
    customerPhone: "+1 555 0164",
    customerEmail: null,
    shippingAddress: { line1: "48 Elm Road", city: "Salem", region: "OR", country: "US" },
    shippingRate: { rateId: "r1", name: "Standard", price: 5 },
    paymentMethod: "stripe",
    paymentStatus: "PAID",
    paidAt: new Date("2026-10-18T09:59:00Z"),
    subtotal: 40,
    discountTotal: 4,
    discountCode: "WELCOME10",
    pointsDiscount: 0,
    pointsRedeemed: 0,
    shippingTotal: 5,
    taxTotal: 2.88,
    total: 43.88,
    items: [
      {
        title: "Morning Ridge Coffee",
        variantTitle: "Ground / 500 g",
        sku: "MR-500-G",
        unitPrice: 20,
        quantity: 2,
        lineTotal: 40,
      },
    ],
  },
};

describe("invoice numbers", () => {
  test("pad the sequence after the store's prefix", () => {
    expect(formatInvoiceNumber("INV-", 7)).toBe("INV-0007");
    expect(formatInvoiceNumber("", 12345)).toBe("12345");
  });
});

describe("invoice totals", () => {
  test("list only the lines the order has, total last", () => {
    expect(totalLines(data)).toEqual([
      { label: "Subtotal", value: "USD 40.00" },
      { label: "Discount (WELCOME10)", value: "-USD 4.00" },
      { label: "Delivery (Standard)", value: "USD 5.00" },
      { label: "Tax 8%", value: "USD 2.88" },
      { label: "Total", value: "USD 43.88", bold: true },
    ]);
  });
});

describe("invoice PDF", () => {
  test("prints the seller, the buyer, the lines and the totals", async () => {
    const text = drawnText(await buildInvoicePdf(data));
    for (const expected of [
      "Fern & Field Coffee",
      "Tax ID: TX-555-0100",
      "INV-0007",
      "2026-10-18",
      "#1042",
      "Card (Stripe)",
      "Olivia Bennett",
      "48 Elm Road",
      "Morning Ridge Coffee",
      "Ground / 500 g · SKU MR-500-G",
      "Discount (WELCOME10)",
      "USD 43.88",
    ]) {
      expect(text).toContain(expected);
    }
  });

  test("survives characters the built-in font can't draw", async () => {
    const text = drawnText(
      await buildInvoicePdf({
        ...data,
        order: { ...data.order, customerName: "Zoë 李 Ålund" },
      }),
    );
    expect(text).toContain("Zoë ? Ålund");
  });

  test("runs onto a second page for a long order", async () => {
    const items = Array.from({ length: 60 }, (_, i) => ({
      ...data.order.items[0],
      title: `Item ${i + 1}`,
    }));
    const text = drawnText(await buildInvoicePdf({ ...data, order: { ...data.order, items } }));
    expect(text).toContain("Invoice INV-0007 (continued)");
    expect(text).toContain("Item 60");
  });
});
