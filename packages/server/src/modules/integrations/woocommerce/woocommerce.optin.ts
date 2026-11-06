import type { Integration } from "../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import redisConnection from "../../../utils/redisConnection.js";
import type { WooDeliveryJobData } from "./woocommerce.inbound.js";
import { normaliseWooPhone, type WooOrderPayload } from "./woocommerce.mapping.js";
import { readWooCredential } from "./woocommerce.types.js";

/**
 * The RateUp plugin's WhatsApp opt-in box at checkout (Phase 3 of
 * WEB/rateup-wordpress-plugin-plan.md), seen from RateUp.
 *
 * The plugin writes the shopper's answer to the order as `rateup_whatsapp_optin`
 * ("yes" / "no"). Not underscore-prefixed: WooCommerce leaves `_` meta out of
 * webhook payloads. An order carrying it makes its buyer a contact at once —
 * guests included — named from the billing details, with consent from the box:
 *
 *                 new contact     existing contact
 *   ticked        consent on      consent on
 *   unticked      consent off     unchanged
 *
 * A new contact is otherwise created with consent on, so an unticked box has
 * to say off. An existing one keeps whatever it had: an untouched box is not a
 * request to stop. Order updates do not depend on any of this — as on Shopify,
 * the box is marketing consent only.
 *
 * Applied once per order, and only while the order is new: a status change on
 * an old order must not opt back in someone who has since replied STOP.
 */

export const WOO_OPT_IN_META_KEY = "rateup_whatsapp_optin";

/** Older than this, an order's answer is history, not a fresh choice. */
const MAX_ORDER_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CLAIM_TTL_SECONDS = 30 * 24 * 60 * 60;
const claimKey = (integrationId: string, orderId: string) =>
  `woo:order-optin:${integrationId}:${orderId}`;

export type WooOptInOutcome =
  | "no_field"
  | "no_order"
  | "too_old"
  | "no_phone"
  | "already_applied"
  | "created"
  | "updated";

interface WooOptInOrder extends WooOrderPayload {
  date_created_gmt?: string;
  meta_data?: Array<{ key?: string; value?: unknown }>;
}

/** The shopper's answer, or null when the order did not come through the plugin's box. */
export function readWooOptIn(payload: WooOptInOrder): boolean | null {
  const entry = payload.meta_data?.find((meta) => meta.key === WOO_OPT_IN_META_KEY);
  if (!entry) return null;
  return entry.value === "yes";
}

/** WooCommerce's `_gmt` dates have no zone marker; they are UTC. */
function placedAt(payload: WooOptInOrder): number | null {
  const raw = payload.date_created_gmt;
  if (!raw) return null;
  const time = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw}Z`);
  return Number.isNaN(time) ? null : time;
}

function billingName(payload: WooOptInOrder) {
  return (
    [payload.billing?.first_name, payload.billing?.last_name]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") || null
  );
}

const isUniqueViolation = (error: unknown) => (error as { code?: string } | null)?.code === "P2002";

export async function handleWooOrderOptIn(
  integration: Integration,
  data: WooDeliveryJobData,
  redis: Pick<typeof redisConnection, "set" | "del"> = redisConnection,
  now = Date.now(),
): Promise<WooOptInOutcome> {
  const credential = readWooCredential(integration.credential);
  if (!credential || !integration.orgId) return "no_order";
  const orgId = integration.orgId;

  const payload = data.payload as WooOptInOrder;
  const optIn = readWooOptIn(payload);
  if (optIn === null) return "no_field";
  if (!payload.id) return "no_order";

  const placed = placedAt(payload);
  if (placed === null || now - placed > MAX_ORDER_AGE_MS) return "too_old";

  const phone = normaliseWooPhone(payload.billing?.phone || payload.shipping?.phone, [
    payload.billing?.country,
    payload.shipping?.country,
    credential.store?.country?.split(":")[0],
  ]);
  // normaliseWooPhone passes an unparseable number through; a contact needs a real one.
  if (!phone?.startsWith("+")) return "no_phone";

  const key = claimKey(integration.id, String(payload.id));
  // order.created and order.updated often arrive together for one new order.
  if ((await redis.set(key, "1", "EX", CLAIM_TTL_SECONDS, "NX")) === null) {
    return "already_applied";
  }

  try {
    const outcome = await applyOptIn(orgId, {
      phone: phone.slice(1),
      name: billingName(payload),
      email: payload.billing?.email?.trim() || null,
      optIn,
    });
    log.info(
      { integrationId: integration.id, orderId: payload.id, optIn, outcome },
      "WooCommerce checkout opt-in applied",
    );
    return outcome;
  } catch (error) {
    // Let the retry apply it.
    await redis.del(key);
    throw error;
  }
}

interface OptInBuyer {
  /** As `Contact.phone` holds it: E.164 digits without the `+`. */
  phone: string;
  name: string | null;
  email: string | null;
  optIn: boolean;
}

async function applyOptIn(orgId: string, buyer: OptInBuyer): Promise<"created" | "updated"> {
  const existing = await findContactByPhone(orgId, buyer.phone);
  if (existing) {
    await updateExisting(existing, buyer);
    return "updated";
  }

  // Loaded on use, as in woocommerce.customers.ts: contact creation reaches the
  // automation engine and the integration fan-out.
  const { createContact } = await import("../../contact/contact.service.js");
  try {
    await createContact({
      orgId,
      phone: buyer.phone,
      // Blank rather than invented when the order has no name.
      name: buyer.name ?? "",
      ...(buyer.email && { email: buyer.email }),
      source: "WooCommerce",
      consent: buyer.optIn,
    });
    return "created";
  } catch (error) {
    // A WhatsApp message or the customer sync created this number a moment ago.
    if (!isUniqueViolation(error)) throw error;
    const raced = await findContactByPhone(orgId, buyer.phone);
    if (!raced) throw error;
    await updateExisting(raced, buyer);
    return "updated";
  }
}

function findContactByPhone(orgId: string, phone: string) {
  return prisma.contact.findUnique({
    where: { contact_phone_org_id_unique: { phone, orgId } },
    select: { id: true, name: true, email: true, consent: true },
  });
}

/** Fills only what the contact lacks; nothing a person typed in RateUp is overwritten. */
async function updateExisting(
  existing: { id: string; name: string | null; email: string | null; consent: boolean },
  buyer: OptInBuyer,
) {
  const patch = {
    ...(!existing.name?.trim() && buyer.name && { name: buyer.name }),
    ...(!existing.email?.trim() && buyer.email && { email: buyer.email }),
    ...(buyer.optIn && !existing.consent && { consent: true }),
  };
  if (Object.keys(patch).length) {
    await prisma.contact.update({ where: { id: existing.id }, data: patch });
  }
}
