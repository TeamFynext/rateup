import { randomBytes } from "node:crypto";
import dayjs from "dayjs";

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import {
  Prisma,
  ShopifyCheckoutReminderStatus,
  ShopifyCheckoutStatus,
  TriggerEvent,
  type ShopifyCheckout,
} from "../../../../generated/prisma/client.js";
import { IntegratedApps, ShopifyEvents } from "../../../types/enums.js";
import { normalisePhone } from "../../loyalty/util.js";
import { executeScheduledRule } from "../../whatsapp/automatedReply/wa_automatedReply.utils.js";
import {
  armCheckoutReminder,
  disarmCheckoutReminder,
  hasCheckoutReminderJob,
} from "../../../workers/bullmq/queues/abandonedCheckout.queue.js";
import { API_URL } from "../../../utils/constants/constants.js";
import type { ShopifyBody } from "./shopify.types.js";
import {
  DEFAULT_ABANDONED_DELAY_MINUTES,
  MAX_ABANDONED_DELAY_MINUTES,
} from "./abandonedCheckout.constants.js";

/** The public route a reminder's recovery link goes through; see shopify.link.route.ts. */
export const RECOVERY_LINK_PATH = "/api/public/r/";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** 10 base62 characters (~59 bits): short enough for a button suffix, not guessable. */
function newLinkCode() {
  return Array.from(randomBytes(10), (byte) => BASE62[byte % 62]).join("");
}

export function recoveryLinkUrl(linkCode: string) {
  return `${API_URL}${RECOVERY_LINK_PATH}${linkCode}`;
}

/**
 * An open checkout untouched this long is expired and gets no further reminders. It has to
 * outlast the longest "send after" a rule can set, or that reminder would be cancelled first.
 */
const CHECKOUT_EXPIRY_DAYS = MAX_ABANDONED_DELAY_MINUTES / (24 * 60) + 1;
/**
 * Checkouts untouched this long are forgotten: deleted, or stripped of personal data when a
 * reminder went out for them. Counted from the buyer's last activity, not the row's creation,
 * so a checkout picked up again late still keeps its data until its reminders have run.
 */
const CHECKOUT_RETENTION_DAYS = CHECKOUT_EXPIRY_DAYS + 14;
/** Pushed back by this when a reminder comes due outside its rule's business hours. */
const BUSINESS_HOURS_RETRY_MINUTES = 30;
/** A reminder left SENDING this long was interrupted mid-send (a worker restart). */
const STUCK_SENDING_MINUTES = 30;

/** The checkouts/create and checkouts/update fields read here. */
export interface CheckoutWebhookBody {
  id?: number | string;
  token?: string;
  email?: string | null;
  phone?: string | null;
  updated_at?: string;
  created_at?: string;
  completed_at?: string | null;
  buyer_accepts_marketing?: boolean;
  buyer_accepts_sms_marketing?: boolean;
  customer?: {
    phone?: string | null;
    email?: string | null;
    default_address?: { phone?: string | null; country_code?: string | null } | null;
  } | null;
  billing_address?: { phone?: string | null; country_code?: string | null } | null;
  shipping_address?: { phone?: string | null; country_code?: string | null } | null;
  line_items?: { product_id?: number | string | null }[] | null;
}

interface AbandonedRule {
  id: string;
  options: Prisma.JsonValue;
}

function ruleOptions(rule: AbandonedRule) {
  const options = (rule.options ?? {}) as {
    shopifyProductIds?: string[];
    abandonedCheckoutDelayMinutes?: number;
    requireMarketingConsent?: boolean;
  };
  return {
    productIds: (options.shopifyProductIds ?? []).map(String),
    delayMinutes: options.abandonedCheckoutDelayMinutes ?? DEFAULT_ABANDONED_DELAY_MINUTES,
    // Meta allows marketing messages only to people who agreed to them.
    requireMarketingConsent: options.requireMarketingConsent ?? true,
  };
}

/** The buyer's number as `Contact.phone` stores it, or null. Never throws on junk input. */
export function checkoutPhone(body: CheckoutWebhookBody): string | null {
  const country =
    body.billing_address?.country_code ||
    body.shipping_address?.country_code ||
    body.customer?.default_address?.country_code ||
    "IN";
  const candidates = [
    body.phone,
    body.customer?.phone,
    body.billing_address?.phone,
    body.shipping_address?.phone,
    body.customer?.default_address?.phone,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const phone = normalisePhone(raw, country);
    if (phone) return phone;
  }
  return null;
}

async function orgIdForShop(shop: string): Promise<string | null> {
  const integration = await prisma.integration.findFirst({
    where: {
      name: IntegratedApps.shopify,
      active: true,
      credential: { path: ["session", "shop"], equals: shop },
    },
    select: { orgId: true },
  });
  return integration?.orgId ?? null;
}

async function abandonedCheckoutRules(orgId: string): Promise<AbandonedRule[]> {
  return prisma.rule.findMany({
    where: {
      orgId,
      isActive: true,
      triggerEvent: TriggerEvent.SHOPIFY_EVENT,
      options: { path: ["shopifyEvent"], equals: ShopifyEvents.ABANDONED_CHECKOUTS },
    },
    select: { id: true, options: true },
  });
}

async function cancelReminders(checkoutId: string, ruleId?: string) {
  const pending = await prisma.shopifyCheckoutReminder.findMany({
    where: {
      checkoutId,
      status: ShopifyCheckoutReminderStatus.SCHEDULED,
      ...(ruleId && { ruleId }),
    },
    select: { id: true },
  });
  if (!pending.length) return;
  await prisma.shopifyCheckoutReminder.updateMany({
    where: {
      id: { in: pending.map((r) => r.id) },
      status: ShopifyCheckoutReminderStatus.SCHEDULED,
    },
    data: { status: ShopifyCheckoutReminderStatus.CANCELLED },
  });
  await Promise.all(pending.map((r) => disarmCheckoutReminder(r.id)));
}

/**
 * One reminder per matching rule, due `delay` after the checkout was last touched. A
 * reminder still waiting is pushed back, so nobody is messaged while still typing; one that
 * already went out is left alone rather than sent again.
 */
async function scheduleReminders(checkout: ShopifyCheckout) {
  if (!checkout.phone) {
    await cancelReminders(checkout.id);
    return;
  }
  for (const rule of await abandonedCheckoutRules(checkout.orgId)) {
    const { productIds, delayMinutes } = ruleOptions(rule);
    if (productIds.length && !checkout.productIds.some((id) => productIds.includes(id))) {
      // The cart changed and no longer holds the products this rule is about.
      await cancelReminders(checkout.id, rule.id);
      continue;
    }

    const dueAt = dayjs(checkout.shopifyUpdatedAt).add(delayMinutes, "minute").toDate();
    const existing = await prisma.shopifyCheckoutReminder.findUnique({
      where: { checkoutId_ruleId: { checkoutId: checkout.id, ruleId: rule.id } },
    });
    if (existing && existing.status !== ShopifyCheckoutReminderStatus.SCHEDULED) continue;

    const reminder = existing
      ? await prisma.shopifyCheckoutReminder.update({ where: { id: existing.id }, data: { dueAt } })
      : await prisma.shopifyCheckoutReminder.create({
          data: { checkoutId: checkout.id, ruleId: rule.id, dueAt, linkCode: newLinkCode() },
        });
    try {
      await armCheckoutReminder(reminder.id, dueAt);
    } catch (err) {
      // The row is the record; the startup reconciler re-arms a reminder with no job.
      log.error({ err, reminderId: reminder.id }, "Could not arm abandoned checkout reminder");
    }
  }
}

/** checkouts/create and checkouts/update. */
export async function handleCheckoutWebhook(shop: string, body: CheckoutWebhookBody) {
  if (body.id == null || !body.token) return;
  const orgId = await orgIdForShop(shop);
  if (!orgId) return;

  const shopifyId = String(body.id);
  const shopifyUpdatedAt = new Date(body.updated_at ?? body.created_at ?? Date.now());
  const existing = await prisma.shopifyCheckout.findUnique({
    where: { orgId_shopifyId: { orgId, shopifyId } },
  });
  // Shopify does not promise delivery order; an older copy must not undo a newer one.
  if (existing && existing.shopifyUpdatedAt > shopifyUpdatedAt) return;
  if (existing && existing.status !== ShopifyCheckoutStatus.OPEN) return;

  const status = body.completed_at ? ShopifyCheckoutStatus.RECOVERED : ShopifyCheckoutStatus.OPEN;
  const data = {
    shop,
    token: body.token,
    phone: checkoutPhone(body),
    email: body.email ?? body.customer?.email ?? null,
    acceptsMarketing: Boolean(body.buyer_accepts_marketing || body.buyer_accepts_sms_marketing),
    body: body as Prisma.InputJsonValue,
    productIds: (body.line_items ?? []).flatMap((item) =>
      item.product_id ? [`gid://shopify/Product/${item.product_id}`] : [],
    ),
    shopifyUpdatedAt,
    status,
  };
  const checkout = await prisma.shopifyCheckout.upsert({
    where: { orgId_shopifyId: { orgId, shopifyId } },
    create: { orgId, shopifyId, ...data },
    update: data,
  });

  if (status === ShopifyCheckoutStatus.RECOVERED) await cancelReminders(checkout.id);
  else await scheduleReminders(checkout);
}

/** checkouts/delete: Shopify dropped the checkout, so nothing is left to recover. */
export async function handleCheckoutDeleted(shop: string, body: { id?: number | string }) {
  if (body.id == null) return;
  const orgId = await orgIdForShop(shop);
  if (!orgId) return;
  const checkout = await prisma.shopifyCheckout.findUnique({
    where: { orgId_shopifyId: { orgId, shopifyId: String(body.id) } },
  });
  if (!checkout || checkout.status !== ShopifyCheckoutStatus.OPEN) return;
  await prisma.shopifyCheckout.update({
    where: { id: checkout.id },
    data: { status: ShopifyCheckoutStatus.EXPIRED },
  });
  await cancelReminders(checkout.id);
}

/** The orders/create fields recovery and attribution read. */
type RecoveredOrder = Pick<
  ShopifyBody,
  "checkout_token" | "id" | "created_at" | "total_price" | "currency" | "total_price_set"
>;

/**
 * orders/create names the checkout it came from: stop reminding, and credit the order to
 * the last reminder sent before it was placed. A checkout recovered with no reminder sent
 * gets no credit — the buyer came back on their own.
 */
export async function markCheckoutRecovered(orgId: string, order: RecoveredOrder) {
  if (!order.checkout_token) return;
  const checkouts = await prisma.shopifyCheckout.findMany({
    where: { orgId, token: order.checkout_token, status: ShopifyCheckoutStatus.OPEN },
    select: { id: true },
  });
  const orderId = String(order.id ?? "");
  const placedAt = order.created_at ? new Date(order.created_at) : new Date();
  const shopMoney = order.total_price_set?.shop_money;
  const revenue = shopMoney?.amount ?? order.total_price;
  const currency = shopMoney?.currency_code ?? order.currency;

  for (const { id } of checkouts) {
    await prisma.shopifyCheckout.update({
      where: { id },
      data: { status: ShopifyCheckoutStatus.RECOVERED, recoveredOrderId: orderId },
    });
    await cancelReminders(id);

    const lastSent = await prisma.shopifyCheckoutReminder.findFirst({
      where: {
        checkoutId: id,
        status: ShopifyCheckoutReminderStatus.SENT,
        sentAt: { lte: placedAt },
      },
      orderBy: { sentAt: "desc" },
      select: { id: true },
    });
    if (!lastSent) continue;
    await prisma.shopifyCheckoutReminder.update({
      where: { id: lastSent.id },
      data: {
        attributedOrderId: orderId,
        attributedAt: placedAt,
        ...(revenue != null && revenue !== "" && { revenue: new Prisma.Decimal(revenue) }),
        currency: currency ?? null,
      },
    });
  }
}

async function finish(
  reminderId: string,
  status: ShopifyCheckoutReminderStatus,
  reason: string | null = null,
  waMessageId?: string,
) {
  await prisma.shopifyCheckoutReminder.update({
    where: { id: reminderId },
    data: {
      status,
      reason,
      ...(status === ShopifyCheckoutReminderStatus.SENT && { sentAt: new Date(), waMessageId }),
    },
  });
}

/**
 * A reminder's job came due. The claim — SCHEDULED to SENDING, only while due and the
 * checkout still open — is what makes a stale, duplicated or cancelled job harmless.
 */
export async function fireCheckoutReminder(reminderId: string) {
  const claimed = await prisma.shopifyCheckoutReminder.updateMany({
    where: {
      id: reminderId,
      status: ShopifyCheckoutReminderStatus.SCHEDULED,
      // A few seconds' slack for a delayed job that wakes a moment early.
      dueAt: { lte: dayjs().add(5, "second").toDate() },
      checkout: { status: ShopifyCheckoutStatus.OPEN },
    },
    data: { status: ShopifyCheckoutReminderStatus.SENDING },
  });
  if (!claimed.count) return "skipped";

  const reminder = await prisma.shopifyCheckoutReminder.findUniqueOrThrow({
    where: { id: reminderId },
    include: { checkout: true, rule: { select: { id: true, options: true } } },
  });
  const { checkout, rule } = reminder;
  if (!checkout.phone) {
    await finish(reminderId, ShopifyCheckoutReminderStatus.SKIPPED, "no_phone");
    return "skipped";
  }
  if (ruleOptions(rule).requireMarketingConsent && !checkout.acceptsMarketing) {
    await finish(reminderId, ShopifyCheckoutReminderStatus.SKIPPED, "no_marketing_consent");
    return "skipped";
  }
  const contact = await prisma.contact.findFirst({
    where: { orgId: checkout.orgId, phone: checkout.phone },
    select: { consent: true, blockedOnWhatsApp: true, isSpam: true },
  });
  if (contact && (!contact.consent || contact.blockedOnWhatsApp || contact.isSpam)) {
    await finish(reminderId, ShopifyCheckoutReminderStatus.SKIPPED, "contact_opted_out");
    return "skipped";
  }

  try {
    const outcome = await executeScheduledRule(rule.id, {
      orgId: checkout.orgId,
      phone: checkout.phone,
      platform: "WHATSAPP",
      shopifyEvent: ShopifyEvents.ABANDONED_CHECKOUTS,
      shopifyProductIds: checkout.productIds,
      // The stored checkouts/update payload is the snake_case shape rule variables read. Its
      // recovery link is swapped for the tracked one, so a click is counted and UTM-tagged.
      shopifyBody: {
        ...(checkout.body as object),
        abandoned_checkout_url: recoveryLinkUrl(reminder.linkCode),
        recovery_link_code: reminder.linkCode,
      } as unknown as ShopifyBody,
    });
    if (outcome.status === "outside_business_hours") {
      const dueAt = dayjs().add(BUSINESS_HOURS_RETRY_MINUTES, "minute").toDate();
      await prisma.shopifyCheckoutReminder.update({
        where: { id: reminderId },
        data: { status: ShopifyCheckoutReminderStatus.SCHEDULED, dueAt },
      });
      await armCheckoutReminder(reminderId, dueAt);
      return "deferred";
    }
    if (outcome.status !== "ran") {
      await finish(reminderId, ShopifyCheckoutReminderStatus.SKIPPED, outcome.status);
      return "skipped";
    }
    const failed = outcome.executedActions.filter((a) => !a.success);
    if (failed.length) {
      const reason = failed.map((a) => a.error ?? "action_failed").join("; ");
      await finish(reminderId, ShopifyCheckoutReminderStatus.FAILED, reason.slice(0, 500));
      return "failed";
    }
    const waMessageId = outcome.executedActions.find((a) => a.messageId)?.messageId;
    await finish(reminderId, ShopifyCheckoutReminderStatus.SENT, null, waMessageId);
    return "sent";
  } catch (err) {
    log.error({ err, reminderId }, "Abandoned checkout reminder failed");
    const reason = err instanceof Error ? err.message : "error";
    await finish(reminderId, ShopifyCheckoutReminderStatus.FAILED, reason.slice(0, 500));
    return "failed";
  }
}

/**
 * Worker startup: Redis may have lost delayed jobs the rows still expect. Re-arming is
 * idempotent, and a reminder interrupted mid-send is closed out rather than sent twice.
 */
export async function reconcileCheckoutReminders() {
  await prisma.shopifyCheckoutReminder.updateMany({
    where: {
      status: ShopifyCheckoutReminderStatus.SENDING,
      updatedAt: { lt: dayjs().subtract(STUCK_SENDING_MINUTES, "minute").toDate() },
    },
    data: { status: ShopifyCheckoutReminderStatus.FAILED, reason: "interrupted" },
  });
  const scheduled = await prisma.shopifyCheckoutReminder.findMany({
    where: {
      status: ShopifyCheckoutReminderStatus.SCHEDULED,
      checkout: { status: ShopifyCheckoutStatus.OPEN },
    },
    select: { id: true, dueAt: true },
  });
  let armed = 0;
  for (const reminder of scheduled) {
    if (await hasCheckoutReminderJob(reminder.id)) continue;
    await armCheckoutReminder(reminder.id, reminder.dueAt);
    armed++;
  }
  return { checked: scheduled.length, armed };
}

/**
 * Removes stored checkouts, keeping the results of any that a reminder went out for. Those
 * rows lose everything personal — phone, email, the payload — and keep only ids and the
 * reminders' outcomes, so revenue reports outlive the customer data.
 */
async function forgetCheckouts(where: Prisma.ShopifyCheckoutWhereInput) {
  const withResults: Prisma.ShopifyCheckoutWhereInput = {
    reminders: { some: { status: ShopifyCheckoutReminderStatus.SENT } },
  };
  const redacted = await prisma.shopifyCheckout.updateMany({
    // An emptied payload marks a row already redacted.
    where: { AND: [where, withResults, { NOT: { body: { equals: {} } } }] },
    data: { phone: null, email: null, body: {}, productIds: [] },
  });
  const deleted = await prisma.shopifyCheckout.deleteMany({
    where: { AND: [where, { NOT: withResults }] },
  });
  return { redacted: redacted.count, deleted: deleted.count };
}

/** Daily: expire checkouts nobody came back to, and forget old ones. */
export async function cleanupShopifyCheckouts() {
  const stale = await prisma.shopifyCheckout.findMany({
    where: {
      status: ShopifyCheckoutStatus.OPEN,
      shopifyUpdatedAt: { lt: dayjs().subtract(CHECKOUT_EXPIRY_DAYS, "day").toDate() },
    },
    select: { id: true },
  });
  for (const { id } of stale) {
    await prisma.shopifyCheckout.update({
      where: { id },
      data: { status: ShopifyCheckoutStatus.EXPIRED },
    });
    await cancelReminders(id);
  }
  const forgotten = await forgetCheckouts({
    shopifyUpdatedAt: { lt: dayjs().subtract(CHECKOUT_RETENTION_DAYS, "day").toDate() },
  });
  log.info({ expired: stale.length, ...forgotten }, "Cleaned up Shopify checkouts");
}

/** customers/redact: forget the stored checkouts that identify this customer. */
export interface CustomerRedactBody {
  customer?: { email?: string | null; phone?: string | null };
}

export async function redactShopifyCustomer(shop: string, body: CustomerRedactBody) {
  const email = body.customer?.email;
  const phone = body.customer?.phone ? checkoutPhone({ phone: body.customer.phone }) : null;
  if (!email && !phone) return;
  await forgetCheckouts({
    shop,
    OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
  });
}

/** shop/redact: the shop uninstalled 48 hours ago; forget everything stored for it. */
export async function redactShopifyShop(shop: string) {
  await forgetCheckouts({ shop });
}
