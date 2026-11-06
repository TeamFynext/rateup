import { randomInt } from "node:crypto";

import type { ShopOrder, ShopStore } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { sendShopMessage } from "./notify.js";
import { ShopError } from "./shop.errors.js";

const VERIFY_MINUTES = 15;
/**
 * Most codes are sent within a minute or never: only codes this recent count against the
 * store's capacity, so abandoned ones stop holding it long before they expire.
 */
const CAPACITY_WINDOW_MINUTES = 5;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_PATTERN = /\bRU-([A-HJ-NP-Z2-9]{6})\b/i;
/** Live, unconfirmed codes a store may have at once: bounds what a script can make it hold. */
const MAX_PENDING_PER_STORE = 300;
/** Codes one visitor (by IP) may start at a store per VERIFY_MINUTES, so a few can't fill it. */
const MAX_PER_IP = 5;
/** Unpaid cash or transfer orders one number may hold at a store. */
export const MAX_OPEN_OFFLINE_ORDERS = 3;

export type VerifyPurpose = "back_in_stock" | "checkout";

export interface PhoneVerificationLink {
  code: string;
  waUrl: string;
  expiresAt: Date;
}

/**
 * A storefront order's number was typed by whoever filled the form, so it is only messaged
 * once its owner proved it, or once the order is paid (a payment is its own proof of intent).
 */
export function customerReachable(
  o: Pick<ShopOrder, "channel" | "phoneVerifiedAt" | "paidAt">,
): boolean {
  return o.channel !== "STOREFRONT" || Boolean(o.phoneVerifiedAt || o.paidAt);
}

export function newVerifyCode() {
  return Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/** The code in a customer's message, as sent by the prefilled wa.me link. */
export function readVerifyCode(text: string | null | undefined): string | null {
  const match = text ? CODE_PATTERN.exec(text) : null;
  return match ? match[1].toUpperCase() : null;
}

async function storeWhatsappNumber(orgId: string) {
  const wa = await prisma.whatsappSettings.findFirst({
    where: { orgId, phone: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { phone: true },
  });
  const digits = wa?.phone?.replace(/[^\d]/g, "") ?? "";
  return digits || null;
}

function link(number: string, prompt: string, code: string, expiresAt: Date) {
  const tagged = `RU-${code}`;
  return {
    code: tagged,
    waUrl: `https://wa.me/${number}?text=${encodeURIComponent(`${prompt} ${tagged}`)}`,
    expiresAt,
  };
}

export async function startPhoneVerification(input: {
  store: Pick<ShopStore, "id" | "orgId">;
  purpose: VerifyPurpose;
  prompt: string;
  variantId?: string;
  orderId?: string;
  method?: "online" | "cod" | "bank";
  /** The visitor's IP, for the per-visitor cap. */
  ip?: string | null;
}): Promise<PhoneVerificationLink> {
  const number = await storeWhatsappNumber(input.store.orgId);
  if (!number)
    throw new ShopError("PAYMENT_UNAVAILABLE", "This shop can't confirm numbers on WhatsApp yet");
  const now = new Date();

  // Pressing the button again reuses the live code rather than minting another.
  if (input.orderId) {
    const live = await prisma.shopPhoneVerification.findFirst({
      where: {
        storeId: input.store.id,
        orderId: input.orderId,
        method: input.method ?? null,
        confirmedAt: null,
        expiresAt: { gt: now },
      },
    });
    if (live) return link(number, input.prompt, live.code, live.expiresAt);
  }

  if (input.ip && !(await underIpCap(input.store.id, input.ip)))
    throw new ShopError(
      "LIMIT_REACHED",
      "Too many confirmation codes from here. Try again in a few minutes.",
    );
  const pending = await prisma.shopPhoneVerification.count({
    where: {
      storeId: input.store.id,
      confirmedAt: null,
      expiresAt: { gt: now },
      createdAt: { gt: new Date(now.getTime() - CAPACITY_WINDOW_MINUTES * 60_000) },
    },
  });
  if (pending >= MAX_PENDING_PER_STORE)
    throw new ShopError(
      "LIMIT_REACHED",
      "Too many requests right now. Try again in a few minutes.",
    );

  const expiresAt = new Date(now.getTime() + VERIFY_MINUTES * 60_000);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newVerifyCode();
    try {
      await prisma.shopPhoneVerification.create({
        data: {
          storeId: input.store.id,
          code,
          purpose: input.purpose,
          variantId: input.variantId ?? null,
          orderId: input.orderId ?? null,
          method: input.method ?? null,
          expiresAt,
        },
      });
      return link(number, input.prompt, code, expiresAt);
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err;
    }
  }
  throw new ShopError("CONFLICT", "Couldn't start the confirmation. Try again.");
}

/** Fails open when Redis is down: the store-wide cap still bounds the damage. */
async function underIpCap(storeId: string, ip: string) {
  const key = `shop:verify:${storeId}:${ip}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, VERIFY_MINUTES * 60);
    return count <= MAX_PER_IP;
  } catch (err) {
    log.warn({ err, storeId }, "Phone-check IP cap unavailable");
    return true;
  }
}

/**
 * An inbound WhatsApp message carrying a code. The number it came from is the proven one,
 * whatever was typed on the storefront. Returns true when the message was a code for this org.
 */
export async function confirmShopPhone(input: {
  orgId: string;
  contactId: string;
  phone: string;
  code: string;
  channelAccountId?: string | null;
}): Promise<boolean> {
  const store = await prisma.shopStore.findUnique({ where: { orgId: input.orgId } });
  if (!store) return false;
  const row = await prisma.shopPhoneVerification.findUnique({
    where: { storeId_code: { storeId: store.id, code: input.code } },
  });
  if (!row) return false;

  const reply = (text: string) =>
    sendShopMessage(
      {
        orgId: input.orgId,
        channel: "WHATSAPP",
        channelAccountId: input.channelAccountId,
        contactId: input.contactId,
        phone: input.phone,
      },
      { text },
    );

  if (row.confirmedAt) return true;
  const now = new Date();
  if (row.expiresAt <= now) {
    await reply("That code has expired. Go back to the shop and try again.");
    return true;
  }
  const claimed = await prisma.shopPhoneVerification.updateMany({
    where: { id: row.id, confirmedAt: null },
    data: { confirmedAt: now, phone: input.phone, contactId: input.contactId },
  });
  if (!claimed.count) return true;

  try {
    if (row.purpose === "back_in_stock" && row.variantId) {
      const { subscribeBackInStock } = await import("./recovery.service.js");
      const result = await subscribeBackInStock({
        storeId: store.id,
        variantId: row.variantId,
        contactId: input.contactId,
        channel: "WHATSAPP",
      });
      await reply(result.message);
    } else if (row.purpose === "checkout" && row.orderId && row.method) {
      await placeVerifiedOrder(row.orderId, store.id, row.method, input, reply);
    }
  } catch (err) {
    const message = err instanceof ShopError ? err.message : "Something went wrong";
    if (!(err instanceof ShopError))
      log.warn({ err, orgId: input.orgId }, "Phone check follow-up failed");
    await reply(message);
  }
  return true;
}

async function placeVerifiedOrder(
  orderId: string,
  storeId: string,
  method: string,
  who: { contactId: string; phone: string },
  reply: (text: string) => Promise<unknown>,
) {
  const order = await prisma.shopOrder.findFirst({ where: { id: orderId, storeId } });
  if (!order?.checkoutToken || order.status !== "DRAFT") {
    await reply("This order has already been placed or closed.");
    return;
  }
  await prisma.shopOrder.update({
    where: { id: order.id },
    data: {
      phoneVerifiedAt: new Date(),
      customerPhone: who.phone,
      contactId: order.contactId ?? who.contactId,
    },
  });
  const { payPublicCheckout } = await import("./checkout.service.js");
  try {
    await payPublicCheckout(order.checkoutToken, asMethod(method));
  } catch (err) {
    if (!(err instanceof ShopError)) throw err;
    await reply(`We couldn't place order #${order.number}: ${err.message}`);
  }
}

const asMethod = (m: string) => (m === "bank" || m === "online" ? m : "cod");

/** A proven number may hold only a few unpaid cash or transfer orders at one store. */
export async function assertOfflineOrderAllowed(storeId: string, phone: string | null) {
  if (!phone) return;
  const open = await prisma.shopOrder.count({
    where: {
      storeId,
      customerPhone: phone,
      status: "OPEN",
      paymentMethod: { in: ["cod", "bank"] },
      paymentStatus: { notIn: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] },
    },
  });
  if (open >= MAX_OPEN_OFFLINE_ORDERS)
    throw new ShopError(
      "LIMIT_REACHED",
      `You already have ${open} orders waiting for payment. Pay or cancel one first.`,
    );
}
