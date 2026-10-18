import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { ShopFulfillmentStatus } from "../../../../generated/prisma/client.js";
import { appConfig as config } from "../../../config.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { addOrderEvent, setFulfillmentStatus } from "./orders.service.js";
import { notFound, ShopError } from "./shop.errors.js";
import type { ShopAddress, ShopShipmentEvent } from "./shop.types.js";

/**
 * Shipments. Manual tracking works for every store; EasyPost (one API for most carriers
 * worldwide) adds live rates, labels and automatic tracking updates. Its key and ship-from
 * address live in an `Integration` row named `shop_easypost`, encrypted like other secrets.
 */

interface EasypostCredential {
  apiKey?: string;
  webhookSecret?: string;
  webhookId?: string;
  fromAddress?: ShopAddress & { company?: string };
}

const EASYPOST = "https://api.easypost.com/v2";

async function easypost<T>(
  apiKey: string,
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${EASYPOST}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok)
    throw new ShopError("INVALID", json.error?.message ?? `EasyPost answered ${res.status}`);
  return json;
}

async function easypostAccount(orgId: string) {
  const row = await prisma.integration.findUnique({
    where: { orgid_integration_name_unique: { orgId, name: "shop_easypost" } },
  });
  if (!row?.active) return null;
  return { row, credential: row.credential as EasypostCredential };
}

export async function shippingProviders(orgId: string) {
  const account = await easypostAccount(orgId);
  return {
    easypost: {
      connected: !!account,
      fromAddress: account?.credential.fromAddress ?? null,
    },
  };
}

export async function connectEasypost(
  store: { id: string; orgId: string },
  apiKey: string,
  fromAddress: EasypostCredential["fromAddress"],
) {
  await easypost(apiKey.trim(), "/addresses?page_size=1");
  const previous = await easypostAccount(store.orgId);
  if (previous?.credential.webhookId && previous.credential.apiKey) {
    await easypost(
      previous.credential.apiKey,
      `/webhooks/${previous.credential.webhookId}`,
      "DELETE",
    ).catch(() => {});
  }
  const webhookSecret = randomBytes(24).toString("hex");
  const hook = await easypost<{ id: string }>(apiKey.trim(), "/webhooks", "POST", {
    webhook: {
      url: `${config.backendUrl}/api/public/shop/shipping/easypost/${store.id}`,
      webhook_secret: webhookSecret,
    },
  });
  const credential: EasypostCredential = {
    apiKey: apiKey.trim(),
    webhookSecret,
    webhookId: hook.id,
    fromAddress,
  };
  await prisma.integration.upsert({
    where: { orgid_integration_name_unique: { orgId: store.orgId, name: "shop_easypost" } },
    create: {
      orgId: store.orgId,
      name: "shop_easypost",
      credential: { ...credential },
      active: true,
    },
    update: { credential: { ...credential }, active: true },
  });
  return shippingProviders(store.orgId);
}

export async function disconnectEasypost(orgId: string) {
  const account = await easypostAccount(orgId);
  if (!account) return;
  if (account.credential.webhookId && account.credential.apiKey) {
    await easypost(
      account.credential.apiKey,
      `/webhooks/${account.credential.webhookId}`,
      "DELETE",
    ).catch(() => {});
  }
  await prisma.integration.delete({ where: { id: account.row.id } });
}

const toEasypostAddress = (a: ShopAddress & { company?: string }) => ({
  name: a.name,
  company: a.company,
  street1: a.line1,
  street2: a.line2,
  city: a.city,
  state: a.region,
  zip: a.postalCode,
  country: a.country,
  phone: a.phone,
});

export interface Parcel {
  weightGrams: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

/** Live carrier rates for an order's parcel. The shipment id is passed back to buy one. */
export async function quoteShipping(storeId: string, orderId: string, parcel: Parcel) {
  const order = await prisma.shopOrder.findFirst({ where: { id: orderId, storeId } });
  if (!order) throw notFound("Order");
  const account = await easypostAccount(order.orgId);
  if (!account?.credential.apiKey || !account.credential.fromAddress)
    throw new ShopError("INVALID", "Connect EasyPost in Commerce → Payments & shipping first");
  const to = order.shippingAddress as ShopAddress | null;
  if (!to?.line1) throw new ShopError("INVALID", "This order has no delivery address");
  const ounces = parcel.weightGrams / 28.3495;
  const inches = (cm?: number) => (cm ? cm / 2.54 : undefined);
  const shipment = await easypost<{
    id: string;
    rates: {
      id: string;
      carrier: string;
      service: string;
      rate: string;
      currency: string;
      delivery_days: number | null;
    }[];
  }>(account.credential.apiKey, "/shipments", "POST", {
    shipment: {
      to_address: toEasypostAddress({
        ...to,
        name: to.name ?? order.customerName ?? undefined,
        phone: to.phone ?? order.customerPhone ?? undefined,
      }),
      from_address: toEasypostAddress(account.credential.fromAddress),
      parcel: {
        weight: Math.max(ounces, 0.1),
        length: inches(parcel.lengthCm),
        width: inches(parcel.widthCm),
        height: inches(parcel.heightCm),
      },
      reference: `#${order.number}`,
    },
  });
  return {
    shipmentId: shipment.id,
    rates: shipment.rates
      .map((r) => ({
        id: r.id,
        carrier: r.carrier,
        service: r.service,
        price: Number(r.rate),
        currency: r.currency,
        days: r.delivery_days,
      }))
      .sort((a, b) => a.price - b.price),
  };
}

export async function buyShippingLabel(
  storeId: string,
  orderId: string,
  shipmentId: string,
  rateId: string,
  actorUserId: string,
) {
  const order = await prisma.shopOrder.findFirst({ where: { id: orderId, storeId } });
  if (!order) throw notFound("Order");
  const account = await easypostAccount(order.orgId);
  if (!account?.credential.apiKey) throw new ShopError("INVALID", "EasyPost is not connected");
  const bought = await easypost<{
    id: string;
    tracking_code: string;
    selected_rate: { carrier: string; service: string; rate: string };
    postage_label: { label_url: string };
    tracker?: { public_url?: string };
  }>(account.credential.apiKey, `/shipments/${shipmentId}/buy`, "POST", { rate: { id: rateId } });
  return createShipment(storeId, orderId, {
    provider: "easypost",
    providerRef: bought.id,
    carrier: bought.selected_rate.carrier,
    service: bought.selected_rate.service,
    trackingNumber: bought.tracking_code,
    trackingUrl: bought.tracker?.public_url ?? null,
    labelUrl: bought.postage_label.label_url,
    cost: Number(bought.selected_rate.rate),
    actorUserId,
  });
}

export async function createShipment(
  storeId: string,
  orderId: string,
  input: {
    provider?: string;
    providerRef?: string | null;
    carrier?: string | null;
    service?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    labelUrl?: string | null;
    cost?: number | null;
    actorUserId?: string | null;
  },
) {
  const order = await prisma.shopOrder.findFirst({ where: { id: orderId, storeId } });
  if (!order) throw notFound("Order");
  const shipment = await prisma.shopShipment.create({
    data: {
      orderId,
      provider: input.provider ?? "manual",
      providerRef: input.providerRef ?? null,
      carrier: input.carrier ?? null,
      service: input.service ?? null,
      trackingNumber: input.trackingNumber ?? null,
      trackingUrl: input.trackingUrl ?? null,
      labelUrl: input.labelUrl ?? null,
      cost: input.cost ?? null,
      status: "SHIPPED",
      shippedAt: new Date(),
    },
  });
  await addOrderEvent(
    orderId,
    "shipment",
    `Shipped${input.carrier ? ` with ${input.carrier}` : ""}${input.trackingNumber ? ` · ${input.trackingNumber}` : ""}`,
    undefined,
    input.actorUserId,
  );
  await setFulfillmentStatus(orderId, "SHIPPED", input.actorUserId);
  return shipment;
}

const TRACKING_STATUS: Record<string, ShopFulfillmentStatus> = {
  in_transit: "SHIPPED",
  out_for_delivery: "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  failure: "FAILED_DELIVERY",
  return_to_sender: "FAILED_DELIVERY",
  available_for_pickup: "OUT_FOR_DELIVERY",
};

export async function handleEasypostWebhook(
  storeId: string,
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
) {
  const store = await prisma.shopStore.findUnique({ where: { id: storeId } });
  if (!store) throw notFound("Store");
  const account = await easypostAccount(store.orgId);
  if (!account?.credential.webhookSecret) throw new ShopError("INVALID", "Not connected");
  const signature = String(headers["x-hmac-signature"] ?? "");
  const expected = `hmac-sha256-hex=${createHmac("sha256", account.credential.webhookSecret).update(rawBody).digest("hex")}`;
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    throw new ShopError("INVALID", "Bad signature");

  const event = JSON.parse(rawBody) as {
    description?: string;
    result?: {
      shipment_id?: string;
      status?: string;
      public_url?: string;
      tracking_details?: {
        datetime: string;
        status: string;
        message?: string;
        tracking_location?: { city?: string };
      }[];
    };
  };
  if (!event.description?.startsWith("tracker.") || !event.result?.shipment_id) return;
  const shipment = await prisma.shopShipment.findFirst({
    where: { provider: "easypost", providerRef: event.result.shipment_id, order: { storeId } },
  });
  if (!shipment) return;
  const status = TRACKING_STATUS[event.result.status ?? ""];
  const events: ShopShipmentEvent[] = (event.result.tracking_details ?? []).map((d) => ({
    at: d.datetime,
    status: d.status,
    description: d.message,
    location: d.tracking_location?.city,
  }));
  await prisma.shopShipment.update({
    where: { id: shipment.id },
    data: {
      events,
      trackingUrl: shipment.trackingUrl ?? event.result.public_url ?? null,
      ...(status ? { status } : {}),
      ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
    },
  });
  if (status && status !== "SHIPPED") {
    await setFulfillmentStatus(shipment.orderId, status).catch((err) =>
      log.warn({ err, orderId: shipment.orderId }, "Tracking update could not move the order"),
    );
  }
}
