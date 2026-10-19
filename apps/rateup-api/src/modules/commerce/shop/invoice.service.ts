import { randomUUID } from "node:crypto";
import { inStoreCheckout, storeLabel } from "./checkoutVia.js";

import sharp from "sharp";

import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { fetchPublicBytes } from "../../../utils/publicFetch.js";
import { privateBucket, signedFileUrl, uploadFile } from "../../../utils/upload/s3Upload.js";
import { sendShopMessage, type SendOutcome } from "./notify.js";
import { buildInvoicePdf, formatInvoiceNumber, type InvoiceData } from "./invoice.js";
import { ShopError } from "./shop.errors.js";

/** Payment states an order has an invoice in: it was paid, even if money went back since. */
const INVOICEABLE = new Set(["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]);

/**
 * Gives the order its invoice number, once. The row lock makes two racing callers agree on
 * one number for the order; the store's atomic increment keeps numbers unique across orders,
 * and a rolled-back transaction gives its number back, so the sequence has no gaps.
 */
export async function issueInvoiceNumber(orderId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ShopOrder" WHERE id = ${orderId}::uuid FOR UPDATE`;
    const order = await tx.shopOrder.findUniqueOrThrow({
      where: { id: orderId },
      select: { storeId: true, invoiceNumber: true, invoiceIssuedAt: true },
    });
    if (order.invoiceNumber && order.invoiceIssuedAt) {
      return { number: order.invoiceNumber, issuedAt: order.invoiceIssuedAt };
    }
    const store = await tx.shopStore.update({
      where: { id: order.storeId },
      data: { invoiceNumberSeq: { increment: 1 } },
      select: { invoiceNumberSeq: true, invoicePrefix: true },
    });
    const number = formatInvoiceNumber(store.invoicePrefix, store.invoiceNumberSeq);
    const issuedAt = new Date();
    await tx.shopOrder.update({
      where: { id: orderId },
      data: { invoiceNumber: number, invoiceIssuedAt: issuedAt },
    });
    return { number, issuedAt };
  });
}

/**
 * The store logo as PNG for the PDF. A logo that can't be fetched leaves the invoice without
 * one. The URL is merchant-supplied (and imports bring other hosts' images), so it goes
 * through the public-only fetch rather than an allow-list of our own CDN.
 */
async function fetchLogo(url: string | null): Promise<InvoiceData["logo"]> {
  if (!url) return null;
  try {
    const png = await sharp(await fetchPublicBytes(url))
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
    select: { invoiceNumber: true, invoiceKey: true, paymentStatus: true, checkoutVia: true },
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
  const order = await prisma.shopOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: { store: true, items: { orderBy: { title: "asc" } } },
  });
  const pdf = await buildInvoicePdf({
    number,
    issuedAt,
    store: order.store,
    logo: await fetchLogo(order.store.logoUrl),
    order,
  });
  const key = `shop-invoices/${order.orgId}/${randomUUID()}/${fileName(number)}`;
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

/** The customer's way back to their invoice: the checkout token proves it is theirs. */
export const invoiceLinkForToken = async (token: string) =>
  (await existingInvoiceLink({ checkoutToken: token })).url;

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
