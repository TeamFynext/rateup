import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { callMetaApi } from "../../whatsapp/wa_axios.js";
import { getWaSettings } from "../../whatsapp/settings/wa_settings.service.js";
import { toNumber } from "./pricing.js";
import type { ShopAttribution } from "./shop.types.js";

/** Meta drops a Conversions API event whose time is more than seven days old. */
const MAX_EVENT_AGE_MS = 7 * 24 * 3_600_000;

interface PurchaseOrder {
  id: string;
  number: number;
  currency: string;
  total: unknown;
  paidAt: Date;
}

/**
 * A Purchase for the Conversions API for Business Messaging: the click id ties the sale to
 * the click-to-WhatsApp ad, and the order id as `event_id` lets Meta drop a resend.
 */
export function buildPurchaseEvent(order: PurchaseOrder, ctwaClid: string, wabaId: string) {
  return {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(order.paidAt.getTime() / 1000),
        event_id: order.id,
        action_source: "business_messaging",
        messaging_channel: "whatsapp",
        user_data: { whatsapp_business_account_id: wabaId, ctwa_clid: ctwaClid },
        custom_data: {
          currency: order.currency,
          value: toNumber(order.total as number),
          order_id: String(order.number),
        },
      },
    ],
  };
}

export type AdConversionOutcome =
  | "sent"
  | "not_from_ad"
  | "already_sent"
  | "not_set_up"
  | "too_old"
  | "missing";

/**
 * Tells Meta that a sale an ad click started was paid. Sent once per order: the order is
 * claimed before the call and released if Meta refuses it, so a retry can try again.
 * Silent when the org has not set up the Conversions API, as for the lifecycle events.
 */
export async function reportAdPurchase(orderId: string): Promise<AdConversionOutcome> {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orgId: true,
      number: true,
      currency: true,
      total: true,
      paidAt: true,
      attribution: true,
      channelAccountId: true,
      adConversionSentAt: true,
    },
  });
  if (!order) return "missing";
  const attribution = order.attribution as ShopAttribution | null;
  const ctwaClid = typeof attribution?.ctwaClid === "string" ? attribution.ctwaClid : null;
  if (attribution?.kind !== "ctwa_ad" || !ctwaClid || !order.paidAt) return "not_from_ad";
  if (order.adConversionSentAt) return "already_sent";
  if (Date.now() - order.paidAt.getTime() > MAX_EVENT_AGE_MS) return "too_old";

  const org = await prisma.org.findUnique({
    where: { id: order.orgId },
    select: { isConversionApiActive: true },
  });
  if (!org?.isConversionApiActive) return "not_set_up";
  const settings =
    (order.channelAccountId && (await getWaSettings(order.orgId, order.channelAccountId))) ||
    (await getWaSettings(order.orgId));
  if (!settings?.accessToken || !settings.conversionsApiDatasetId || !settings.wabaId) {
    return "not_set_up";
  }

  const claimed = await prisma.shopOrder.updateMany({
    where: { id: order.id, adConversionSentAt: null },
    data: { adConversionSentAt: new Date() },
  });
  if (!claimed.count) return "already_sent";

  const payload = buildPurchaseEvent({ ...order, paidAt: order.paidAt }, ctwaClid, settings.wabaId);
  try {
    const res = await callMetaApi(
      `/${settings.conversionsApiDatasetId}/events`,
      "POST",
      settings.accessToken,
      payload,
    );
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Conversions API answered ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    await prisma.shopOrder.update({
      where: { id: order.id },
      data: { adConversionSentAt: null },
    });
    throw err;
  }
  log.info({ orderId: order.id }, "Reported an ad-attributed purchase to Meta");
  return "sent";
}
