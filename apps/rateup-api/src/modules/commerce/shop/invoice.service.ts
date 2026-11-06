import { randomUUID } from "node:crypto";
import { inStoreCheckout, storeLabel } from "./checkoutVia.js";

import sharp from "sharp";

import type { Prisma } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { fetchPublicBytes } from "../../../utils/publicFetch.js";
import { privateBucket, signedFileUrl, uploadFile } from "../../../utils/upload/s3Upload.js";
import { sendShopMessage, type SendOutcome } from "./notify.js";
import { buildInvoicePdf, formatInvoiceNumber, type InvoiceData } from "./invoice.js";
import { ShopError } from "./shop.errors.js";
import { storeLogoUrl } from "./storeLogo.js";

/** Payment states an order has an invoice in: it was paid, even if money went back since. */
const INVOICEABLE = new Set(["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]);

type InvoiceSnapshot = Pick<InvoiceData, "store" | "order">;

const SNAPSHOT_EVENT = "invoice_numbered";
/** Numbers an edited prefix already used ("INV-1" + "0012" vs "INV-" + "10012") are skipped. */
const MAX_SKIPS = 50;

function snapshotOf(
  order: Prisma.ShopOrderGetPayload<{ include: { store: true; items: true } }>,
): InvoiceSnapshot {
  const { store } = order;
  return {
    store: {
      name: store.name,
      businessAddress: store.businessAddress,
      taxId: store.taxId,
      taxRate: store.taxRate === null ? null : String(store.taxRate),
      pricesIncludeTax: store.pricesIncludeTax,
    },
    order: {
      number: order.number,
      currency: order.currency,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      shippingAddress: order.shippingAddress,
      shippingRate: order.shippingRate,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paidAt: order.paidAt,
      subtotal: String(order.subtotal),
      discountTotal: String(order.discountTotal),
      discountCode: order.discountCode,
      pointsDiscount: String(order.pointsDiscount),
      pointsRedeemed: order.pointsRedeemed,
      shippingTotal: String(order.shippingTotal),
      taxTotal: String(order.taxTotal),
      total: String(order.total),
      items: [...order.items]
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((i) => ({
          title: i.title,
          variantTitle: i.variantTitle,
          sku: i.sku,
          unitPrice: String(i.unitPrice),
          quantity: i.quantity,
          lineTotal: String(i.lineTotal),
        })),
    },
  };
}

/**
 * Gives the order its invoice number, once, and records what the invoice says alongside it, so
 * a PDF drawn later (after a failed upload, say) matches the number rather than today's order.
 * The row lock makes two racing callers agree on one number for the order; the store's atomic
 * increment keeps numbers unique across orders, and a rolled-back transaction gives its
 * number back.
 */
export async function issueInvoiceNumber(orderId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ShopOrder" WHERE id = ${orderId}::uuid FOR UPDATE`;
    const order = await tx.shopOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: { store: true, items: true },
    });
    if (order.invoiceNumber && order.invoiceIssuedAt) {
      return { number: order.invoiceNumber, issuedAt: order.invoiceIssuedAt };
    }
    let number = "";
    for (let skip = 0; ; skip++) {
      const store = await tx.shopStore.update({
        where: { id: order.storeId },
        data: { invoiceNumberSeq: { increment: 1 } },
        select: { invoiceNumberSeq: true, invoicePrefix: true },
      });
      number = formatInvoiceNumber(store.invoicePrefix, store.invoiceNumberSeq);
      const taken = await tx.shopOrder.findFirst({
        where: { storeId: order.storeId, invoiceNumber: number },
        select: { id: true },
      });
      if (!taken) break;
      if (skip >= MAX_SKIPS) throw new ShopError("CONFLICT", "Change the invoice prefix and retry");
    }
    const issuedAt = new Date();
    await tx.shopOrder.update({
      where: { id: orderId },
      data: { invoiceNumber: number, invoiceIssuedAt: issuedAt },
    });
    await tx.shopOrderEvent.create({
      data: {
        orderId,
        type: SNAPSHOT_EVENT,
        message: `Invoice number ${number} assigned`,
        data: snapshotOf(order) as unknown as Prisma.InputJsonValue,
      },
    });
    return { number, issuedAt };
  });
}

/** What the invoice was numbered with; orders numbered before snapshots fall back to live data. */
async function invoiceContent(
  orderId: string,
): Promise<InvoiceSnapshot & { logoUrl: string | null }> {
  const order = await prisma.shopOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: { store: true, items: { orderBy: { title: "asc" } } },
  });
  const saved = await prisma.shopOrderEvent.findFirst({
    where: { orderId, type: SNAPSHOT_EVENT },
    orderBy: { createdAt: "asc" },
    select: { data: true },
  });
  const snap = saved?.data as unknown as InvoiceSnapshot | null | undefined;
  if (!snap?.order) return { ...snapshotOf(order), logoUrl: storeLogoUrl(order.store.logoUrl) };
  return {
    store: snap.store,
    order: { ...snap.order, paidAt: snap.order.paidAt ? new Date(snap.order.paidAt) : null },
    logoUrl: storeLogoUrl(order.store.logoUrl),
  };
}

/**
 * The store logo as PNG for the PDF. A logo that can't be fetched leaves the invoice without
 * one. The URL is merchant-supplied (and imports bring other hosts' images), so it goes
 * through the public-only fetch rather than an allow-list of our own CDN.
 */
async function fetchLogo(url: string | null): Promise<InvoiceData["logo"]> {
  if (!url) return null;
  try {
    // A small file can still decode to a huge bitmap; refuse anything past ~25 MP.
    const png = await sharp(await fetchPublicBytes(url), { limitInputPixels: 25_000_000 })
      .resize(160, 160, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return { bytes: new Uint8Array(png), type: "png" };
  } catch (err) {
    log.warn({ err, url }, "Invoice logo could not be loaded");
    return null;
  }
}

const fileName = (number: string) => `${number.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;

/** A link to the order's PDF that stops working after `expiresIn` seconds. */
export function invoiceLink(key: string, number: string, expiresIn: number) {
  return signedFileUrl(key, { expiresIn, filename: fileName(number) });
}

/** For a person opening it now from the dashboard or the customer's link. */
export const INVOICE_VIEW_SECONDS = 10 * 60;

/** The order's invoice, created on first ask. An issued invoice is never redrawn. */
export async function ensureInvoice(orderId: string) {
  const existing = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    select: {
      orgId: true,
      invoiceNumber: true,
      invoiceKey: true,
      paymentStatus: true,
      checkoutVia: true,
    },
  });
  if (!existing) throw new ShopError("NOT_FOUND", "Order not found");
  if (existing.invoiceNumber && existing.invoiceKey) {
    return { number: existing.invoiceNumber, key: existing.invoiceKey };
  }
  // The store invoiced the sale; a RateUp number for it would be a second invoice.
  if (inStoreCheckout(existing.checkoutVia))
    throw new ShopError(
      "CONFLICT",
      `This order was paid in ${storeLabel(existing.checkoutVia)}, which invoices it`,
    );
  if (!INVOICEABLE.has(existing.paymentStatus)) {
    throw new ShopError("CONFLICT", "An invoice is issued once the order is paid");
  }

  const { number, issuedAt } = await issueInvoiceNumber(orderId);
  const content = await invoiceContent(orderId);
  const pdf = await buildInvoicePdf({
    number,
    issuedAt,
    store: content.store,
    logo: await fetchLogo(content.logoUrl),
    order: content.order,
  });
  const key = `shop-invoices/${existing.orgId}/${randomUUID()}/${fileName(number)}`;
  await uploadFile({
    Bucket: privateBucket(),
    Key: key,
    Body: Buffer.from(pdf),
    ContentType: "application/pdf",
    ContentDisposition: `inline; filename="${fileName(number)}"`,
  });
  // Two callers can both get here for one order; the first upload wins and the other's file
  // is simply never linked.
  const { count } = await prisma.shopOrder.updateMany({
    where: { id: orderId, invoiceKey: null },
    data: { invoiceKey: key },
  });
  if (!count) {
    const winner = await prisma.shopOrder.findUniqueOrThrow({
      where: { id: orderId },
      select: { invoiceKey: true },
    });
    return { number, key: winner.invoiceKey ?? key };
  }
  await prisma.shopOrderEvent.create({
    data: { orderId, type: "invoice_issued", message: `Invoice ${number} issued` },
  });
  return { number, key };
}

/** The invoice with a fresh short-lived link, for staff. */
export async function openInvoice(orderId: string) {
  const { number, key } = await ensureInvoice(orderId);
  return { number, url: await invoiceLink(key, number, INVOICE_VIEW_SECONDS) };
}

async function existingInvoiceLink(where: { id: string } | { checkoutToken: string }) {
  const order = await prisma.shopOrder.findUnique({
    where,
    select: { invoiceKey: true, invoiceNumber: true },
  });
  if (!order?.invoiceKey || !order.invoiceNumber)
    throw new ShopError("NOT_FOUND", "Invoice not found");
  return {
    number: order.invoiceNumber,
    url: await invoiceLink(order.invoiceKey, order.invoiceNumber, INVOICE_VIEW_SECONDS),
  };
}

/** An issued invoice for anyone who can see the order; issuing one stays a manage action. */
export const viewInvoice = (orderId: string) => existingInvoiceLink({ id: orderId });

/**
 * The customer's way to their invoice: the checkout token proves the order is theirs. The
 * checkout page offers it on every paid order, so one not issued yet (auto-send off, staff
 * never opened it) is issued now, under the same rules staff issue it by.
 */
export async function invoiceLinkForToken(token: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { checkoutToken: token },
    select: { id: true },
  });
  if (!order) throw new ShopError("NOT_FOUND", "Invoice not found");
  const { number, key } = await ensureInvoice(order.id);
  return invoiceLink(key, number, INVOICE_VIEW_SECONDS);
}

export type InvoiceSendResult =
  | { sent: true; number: string; channel: string }
  | {
      sent: false;
      number?: string;
      reason: "already_sent" | "turned_off" | Extract<SendOutcome, { sent: false }>["reason"];
    };

const invoiceTokenUrl = (token: string) =>
  `${(process.env.API_URL ?? "").replace(/\/+$/, "")}/api/public/shop/checkout/${token}/invoice`;

const NOT_SENT: Record<Extract<SendOutcome, { sent: false }>["reason"], string> = {
  no_recipient: "no way to reach the customer",
  window_closed: "the 24-hour window is closed, and a document can only be sent inside it",
  disabled: "turned off",
  failed: "the channel refused it",
};

/**
 * Sends the invoice to the customer on the order's channel. The order is claimed before the
 * send so a retried job never sends twice; a resend from staff (`force`) skips that check.
 * A refused send hands the claim back and throws, so the queue retries; a send that can't
 * work (window closed, nobody to reach) is logged on the order and not retried.
 */
export async function sendInvoice(
  orderId: string,
  opts: { force?: boolean; actorUserId?: string | null } = {},
): Promise<InvoiceSendResult> {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    select: {
      orgId: true,
      number: true,
      channel: true,
      channelAccountId: true,
      contactId: true,
      customerPhone: true,
      invoiceSentAt: true,
      checkoutToken: true,
      store: { select: { name: true, invoiceAutoSend: true } },
    },
  });
  if (!order) throw new ShopError("NOT_FOUND", "Order not found");
  if (!opts.force) {
    if (!order.store.invoiceAutoSend) return { sent: false, reason: "turned_off" };
    if (order.invoiceSentAt) return { sent: false, reason: "already_sent" };
  }

  const { number, key } = await ensureInvoice(orderId);
  const invoice = { number };
  const previous = order.invoiceSentAt;
  if (opts.force) {
    await prisma.shopOrder.update({ where: { id: orderId }, data: { invoiceSentAt: new Date() } });
  } else {
    const { count } = await prisma.shopOrder.updateMany({
      where: { id: orderId, invoiceSentAt: null },
      data: { invoiceSentAt: new Date() },
    });
    if (!count) return { sent: false, reason: "already_sent", ...invoice };
  }

  const outcome = await sendShopMessage(
    {
      orgId: order.orgId,
      channel: order.channel,
      channelAccountId: order.channelAccountId,
      contactId: order.contactId,
      phone: order.customerPhone,
    },
    {
      text: `Here is your invoice ${invoice.number} for order #${order.number}. Thank you for shopping with ${order.store.name}!`,
      document: {
        // Meta fetches a document link once, when it sends; a day covers its retries.
        url: await invoiceLink(key, number, 24 * 3600),
        filename: fileName(number),
        label: "View invoice",
        // A DM button is tapped whenever the customer likes, so it goes through the token
        // route, which hands out a fresh link each time.
        linkUrl: order.checkoutToken ? invoiceTokenUrl(order.checkoutToken) : undefined,
      },
    },
  );

  if (outcome.sent) {
    await prisma.shopOrderEvent.create({
      data: {
        orderId,
        type: "invoice_sent",
        message: `Invoice ${invoice.number} sent to the customer`,
        actorUserId: opts.actorUserId ?? null,
      },
    });
    return { sent: true, channel: outcome.channel, ...invoice };
  }

  await prisma.shopOrder.update({ where: { id: orderId }, data: { invoiceSentAt: previous } });
  await prisma.shopOrderEvent.create({
    data: {
      orderId,
      type: "message_not_sent",
      message: `Invoice ${invoice.number} not sent: ${outcome.detail ?? NOT_SENT[outcome.reason]}`,
      actorUserId: opts.actorUserId ?? null,
    },
  });
  if (outcome.reason === "failed" && !opts.force) {
    throw new Error(`Invoice send failed: ${outcome.detail ?? "refused"}`);
  }
  return { sent: false, reason: outcome.reason, ...invoice };
}
