import { TriggerEvent } from "../../../../generated/prisma/enums.js";
import shopify from "./shopify.config.js";
import { markCheckoutRecovered } from "./shopify.checkouts.service.js";
import { getActiveShopifySession } from "./shopify.session.js";
import { GraphQLClientResponse } from "@shopify/shopify-api";
import { log } from "../../../utils/logger.js";
import { checkAndExecuteRuleByTriggerEvent } from "../../whatsapp/automatedReply/wa_automatedReply.utils.js";
import { ShopifyEvents } from "../../../types/enums.js";
import type { Integration as PrismaIntegration } from "../../../../generated/prisma/client.js";
import {
  extractDiscountCodes,
  extractPurchaseAmount,
  SHOPIFY_ORDER_STATUS,
} from "./shopifyLoyalty.service.js";
import { onOrderEvent } from "../commerce/orders.js";
import { processOrderSurveySchedule, type OrderSurveyJobData } from "../commerce/surveys.js";
import { shopifyCommerce } from "./shopify.commerce.js";
import type {
  StoreOrderUpdate,
  StoreTotals,
} from "../../commerce/shop/externalCheckout.service.js";
import prisma from "../../../utils/prisma.js";
import { ShopifyBody, type ShopifyWebhookJobData } from "./shopify.types.js";
import { normalisePhone } from "../../loyalty/util.js";
import { getShopifyInfo, getShopifyIntegrationByShop } from "./shopify.credential.js";

/** Sends one scheduled survey; see `commerce/surveys.ts`. What the survey worker runs. */
export async function processShopifySurveySchedule(jobData: OrderSurveyJobData) {
  const { getCommerceProvider } = await import("../commerce/registry.js");
  await processOrderSurveySchedule(jobData, getCommerceProvider);
}

interface FulfillmentOrderShowData {
  fulfillmentOrder: {
    order: {
      id: string | null;
      email: string | null;
      customer: {
        defaultPhoneNumber: { phoneNumber: string } | null;
        defaultEmailAddress: { emailAddress: string } | null;
      } | null;
    } | null;
    lineItems: {
      edges: { node: { lineItem: { product: { id: string } | null } } }[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  } | null;
}

/**
 * The number as `Contact.phone` stores it: country code, no "+". Shopify hands a phone over
 * as the buyer typed it, so a national "9876543210" would otherwise open a second contact
 * and conversation beside the existing "919876543210". The order's country fills in a
 * missing code; India when the order names none.
 */
export function shopifyContactPhone(
  raw: string | null | undefined,
  countryCode?: string | null,
): string | null {
  if (!raw) return null;
  return normalisePhone(raw, countryCode || "IN");
}

export async function handleShopifyOrderEvents(webhook: ShopifyWebhookJobData) {
  const { webhookId, shop, topic } = webhook;
  // The queue's job payload carries every webhook topic's shape, so it is typed
  // loosely (ShopifyWebhookBody) in transit and narrowed per topic here.
  // FULFILLMENT_ORDERS_CANCELLED's body is a distinct
  // `{ fulfillment_order: { id } }` shape (a REST fulfillment-order webhook),
  // while every other topic handled here is the order-webhook shape described
  // by `ShopifyBody`.
  const body = webhook.body as ShopifyBody & { fulfillment_order?: { id: string } };
  log.info("Handling Shopify Order Event: %o", { shop, topic, webhookId });
  const shopifyInfo = await getShopifyIntegrationByShop(shop);
  if (!shopifyInfo) {
    log.trace(`No shopify session found`);
    return;
  }
  let customerPhone;
  let customerEmail: string | null | undefined;
  const productIds: string[] = [];
  if (topic === ShopifyEvents.FULFILLMENT_ORDERS_CANCELLED) {
    if (!shopify) throw new Error("Shopify integration is not configured");
    const fulfillmentOrderGId = body.fulfillment_order?.id;
    if (!fulfillmentOrderGId) {
      log.trace("No fulfillment_order.id found on FULFILLMENT_ORDERS_CANCELLED webhook body");
      return;
    }
    const client = new shopify.clients.Graphql({
      session: await getActiveShopifySession(shopifyInfo),
    });
    // BUG (fixed): this started `false`, so the pagination loop's body — the
    // only place that fetches the order/customer/line-items and sets
    // `customerPhone` for this topic — never ran, and every
    // FULFILLMENT_ORDERS_CANCELLED webhook fell through to the "no phone
    // found" early-return below without ever querying Shopify.
    let hasNextPage = true;
    let cursor: string | null = null;
    while (hasNextPage) {
      const data: GraphQLClientResponse<FulfillmentOrderShowData> = await client.request(
        `query FulfillmentOrderShow($id: ID!, $cursor: String) {
  fulfillmentOrder(id: $id) {
          order {
            id
            email
            customer {
        defaultPhoneNumber {
          phoneNumber
        }
        defaultEmailAddress {
          emailAddress
        }
      }
    }
    lineItems(first: 10, after: $cursor) {
            edges {
              node {
                lineItem {
                  product {
              id
            }
          }
        }
      }
            pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
} `,
        { variables: { id: fulfillmentOrderGId, cursor } },
      );
      if (!data.data) throw new Error("Shopify fulfillmentOrder query returned no data");
      const fulfillmentOrder = data.data.fulfillmentOrder;
      if (!fulfillmentOrder) break;
      // BUG (fixed): `pageInfo` and the line-item edges are nested under
      // `lineItems` in the query above (`lineItems { edges { ... } pageInfo {
      // ... } }`), not directly under `fulfillmentOrder` — the old code read
      // `fulfillmentOrder.pageInfo` (doesn't exist) and called `.map` directly
      // on `fulfillmentOrder.lineItems` (a connection object, not an array).
      // Both would throw the moment this loop actually ran.
      hasNextPage = fulfillmentOrder.lineItems.pageInfo.hasNextPage;
      cursor = fulfillmentOrder.lineItems.pageInfo.endCursor;
      productIds.push(
        ...fulfillmentOrder.lineItems.edges
          .map((edge) => edge.node.lineItem.product?.id)
          .filter((id): id is string => !!id),
      );
      // BUG (fixed): typo — `cutsomer` doesn't exist on the response (the
      // query selects `customer`), so this always threw
      // "Cannot read properties of undefined (reading 'phone')" once the loop
      // body actually executed.
      customerPhone =
        fulfillmentOrder.order?.customer?.defaultPhoneNumber?.phoneNumber ?? customerPhone;
      customerEmail =
        fulfillmentOrder.order?.customer?.defaultEmailAddress?.emailAddress ??
        fulfillmentOrder.order?.email ??
        customerEmail;
    }
  } else {
    customerPhone =
      body?.customer?.phone ||
      body?.customer?.default_address?.phone ||
      body?.billing_address?.phone ||
      body?.shipping_address?.phone ||
      body?.phone;
    // Shopify makes email mandatory at checkout and phone optional, so this is the
    // identifier most orders actually carry.
    customerEmail = body?.customer?.email || body?.email || body?.contact_email;
    productIds.push(
      ...(body.line_items?.map((product) => `gid://shopify/Product/${product.product_id}`) ?? []),
    );
  }
  const orderId = body?.id != null ? String(body.id) : null;
  const rateupOrderId = await syncRateupCheckout(shopifyInfo.orgId, topic, body, orderId);

  // Everything after this point — loyalty, the order.* event, the survey and the
  // automation rules — is the commerce layer's, shared with every store.
  const contactPhone = shopifyContactPhone(
    customerPhone,
    body?.billing_address?.country_code ||
      body?.shipping_address?.country_code ||
      body?.customer?.default_address?.country_code,
  );
  await onOrderEvent(
    {
      provider: shopifyCommerce,
      storeId: shop,
      orgId: shopifyInfo.orgId,
      integration: shopifyInfo as unknown as PrismaIntegration,
    },
    {
      orderId,
      status: SHOPIFY_ORDER_STATUS[topic] ?? "fulfillment_cancelled",
      eventKey: topic,
      customer: { phone: contactPhone ? `+${contactPhone}` : null, email: customerEmail ?? null },
      amount: extractPurchaseAmount(body),
      productIds,
      discountCodes: extractDiscountCodes(body),
      deliveryId: webhookId,
      raw: body as unknown as Record<string, unknown>,
      rateupWriteBack: isRateupWriteBack(body as { note_attributes?: unknown }),
      rateupOrderId,
    },
  );

  if (topic === ShopifyEvents.ORDERS_CREATE) {
    await markCheckoutRecovered(shopifyInfo.orgId, body);
  }
}

const noteAttribute = (body: { note_attributes?: unknown }, name: string) => {
  if (!Array.isArray(body.note_attributes)) return null;
  const entry = (body.note_attributes as Array<{ name?: unknown; value?: unknown } | null>).find(
    (a) => a?.name === name,
  );
  return typeof entry?.value === "string" ? entry.value : null;
};

/** The RateUp shop order a Shopify order came from, from the draft's attributes. */
export const rateupOrderIdFromShopify = (body: { note_attributes?: unknown }) =>
  noteAttribute(body, "rateup_order_id");

/** An order RateUp took the payment for and copied in; its loyalty is earned in RateUp. */
export const isRateupWriteBack = (body: { note_attributes?: unknown }) =>
  noteAttribute(body, "rateup_writeback") === "1";

/**
 * Shopify's breakdown in the shop's currency. Line items and shipping are before discounts, and
 * `total_discounts` counts shipping discounts too, which is how RateUp splits an order.
 */
export function shopifyTotals(body: Partial<ShopifyBody>): StoreTotals {
  const n = (v: unknown) => Number(v) || 0;
  const shipping = body.total_shipping_price_set;
  return {
    subtotal: n(body.total_line_items_price),
    discountTotal: n(body.current_total_discounts ?? body.total_discounts),
    shippingTotal: n(shipping?.shop_money?.amount),
    taxTotal: n(body.current_total_tax ?? body.total_tax),
    total: n(body.current_total_price ?? body.total_price),
  };
}

/** The customer and address Shopify's checkout collected, as a RateUp order keeps them. */
export function shopifyCustomer(
  body: Partial<ShopifyBody>,
): Pick<StoreOrderUpdate, "customer" | "address"> {
  const a = body.shipping_address ?? body.billing_address;
  const name =
    [body.customer?.first_name, body.customer?.last_name].filter(Boolean).join(" ") ||
    a?.name ||
    null;
  const phone = shopifyContactPhone(
    body.customer?.phone || a?.phone || body.phone,
    a?.country_code,
  );
  return {
    customer: { name, email: body.email || body.contact_email || null, phone },
    address: a?.address1
      ? {
          name: a.name || name || undefined,
          line1: a.address1,
          line2: a.address2 ?? undefined,
          city: a.city,
          region: a.province,
          postalCode: a.zip,
          country: a.country_code?.toUpperCase(),
          phone: a.phone ?? undefined,
        }
      : null,
  };
}

const SYNCED_TOPICS: Partial<Record<string, Partial<StoreOrderUpdate>>> = {
  [ShopifyEvents.ORDERS_CREATE]: {},
  [ShopifyEvents.ORDERS_PAID]: { status: "paid" },
  [ShopifyEvents.ORDERS_CANCELLED]: { status: "cancelled" },
  [ShopifyEvents.ORDERS_FULFILLED]: { fulfillment: "fulfilled" },
  [ShopifyEvents.ORDERS_PARTIALLY_FULFILLED]: { fulfillment: "partial" },
};

/**
 * An order RateUp created in Shopify (a store checkout, or a RateUp order written back): the
 * RateUp order follows what happened to it there. Returns the RateUp order id when the order
 * carries RateUp's signature for it. Never blocks the rest.
 */
async function syncRateupCheckout(
  orgId: string,
  topic: string,
  body: ShopifyBody,
  orderId: string | null,
): Promise<string | null> {
  const rateupOrderId = rateupOrderIdFromShopify(body as { note_attributes?: unknown });
  if (!rateupOrderId) return null;
  const signature = noteAttribute(body as { note_attributes?: unknown }, "rateup_sig");
  try {
    const { syncOrderFromStore, verifyStoreCheckout } =
      await import("../../commerce/shop/externalCheckout.service.js");
    const signed = verifyStoreCheckout(orgId, rateupOrderId, signature) ? rateupOrderId : null;
    const step = SYNCED_TOPICS[topic];
    if (step)
      await syncOrderFromStore("shopify", orgId, rateupOrderId, {
        ...step,
        externalOrderId: orderId,
        externalName: body.name || null,
        signature,
        ...(step.status === "paid" && { totals: shopifyTotals(body), lines: shopifyLines(body) }),
        ...shopifyCustomer(body),
      });
    return signed;
  } catch (err) {
    log.warn({ err, rateupOrderId, topic }, "Could not update the RateUp order from Shopify");
    return null;
  }
}

/** The order's lines as RateUp matches them against its own items. */
export const shopifyLines = (body: Partial<ShopifyBody>) =>
  (body.line_items ?? []).map((l) => ({
    variantId: l.variant_id != null ? String(l.variant_id) : null,
    sku: l.sku || null,
    quantity: Number(l.quantity) || 0,
  }));

/** A refund in Shopify on an order RateUp created there. Matched by the order's Shopify id. */
async function syncRateupRefund(orgId: string, shopifyOrderId: string, refundedCents: number) {
  try {
    const rateup = await prisma.shopOrder.findFirst({
      where: { orgId, externalProvider: "shopify", externalId: shopifyOrderId },
      select: { id: true, total: true },
    });
    if (!rateup) return;
    const { syncOrderFromStore } = await import("../../commerce/shop/externalCheckout.service.js");
    const full = refundedCents >= Math.round(Number(rateup.total) * 100) - 1;
    await syncOrderFromStore("shopify", orgId, rateup.id, { refund: full ? "full" : "partial" });
  } catch (err) {
    log.warn({ err, shopifyOrderId }, "Could not record a Shopify refund on the RateUp order");
  }
}

/** The gateway Shopify records on the transaction when a refund goes to store credit. */
const STORE_CREDIT_GATEWAY = "shopify_store_credit";

/** The refunds/create fields read here; the rest is left to the index signature. */
interface ShopifyRefundWebhookBody {
  id?: number | string;
  order_id?: number | string;
  note?: string | null;
  created_at?: string;
  transactions?: { kind?: string; status?: string; gateway?: string; amount?: string }[];
  refund_line_items?: {
    quantity?: number;
    line_item?: { product_id?: number | null; title?: string };
  }[];
}

interface RefundOrderData {
  order: {
    name: string;
    email: string | null;
    phone: string | null;
    currencyCode: string;
    customer: {
      firstName: string | null;
      lastName: string | null;
      defaultEmailAddress: { emailAddress: string } | null;
      defaultPhoneNumber: { phoneNumber: string } | null;
      defaultAddress: { phone: string | null; countryCodeV2: string | null } | null;
    } | null;
    billingAddress: {
      phone: string | null;
      city: string | null;
      countryCodeV2: string | null;
    } | null;
    shippingAddress: {
      phone: string | null;
      city: string | null;
      countryCodeV2: string | null;
    } | null;
  } | null;
}

/**
 * refunds/create. One refund can send money back to the original payment method and to
 * store credit at once, so it raises up to two rule events — REFUNDS_CREATE for the
 * original-method part and STORE_CREDIT_ISSUED for the store credit part — each carrying
 * only its own amount as `refund_amount`.
 *
 * The payload names the order but not the customer, so the order is looked up for the
 * phone, name and currency the rules and their variables need.
 */
export async function handleShopifyRefundEvent(webhook: ShopifyWebhookJobData) {
  const { shop } = webhook;
  const body = webhook.body as ShopifyRefundWebhookBody;

  // Summed in paise/cents so a split refund's two parts add up exactly.
  let originalCents = 0;
  let storeCreditCents = 0;
  for (const transaction of body.transactions ?? []) {
    if (transaction.kind !== "refund" || transaction.status !== "success") continue;
    const cents = Math.round(Number(transaction.amount ?? 0) * 100);
    if (transaction.gateway === STORE_CREDIT_GATEWAY) storeCreditCents += cents;
    else originalCents += cents;
  }
  const events = [
    { event: ShopifyEvents.REFUNDS_CREATE, cents: originalCents },
    { event: ShopifyEvents.STORE_CREDIT_ISSUED, cents: storeCreditCents },
  ].filter((e) => e.cents > 0);
  // A restock-only refund moves no money, and there is nothing to tell the customer.
  if (!events.length || !body.order_id) return;

  const shopifyInfo = await getShopifyIntegrationByShop(shop);
  if (!shopifyInfo) {
    log.trace(`No shopify session found`);
    return;
  }
  await syncRateupRefund(
    shopifyInfo.orgId,
    String(body.order_id),
    originalCents + storeCreditCents,
  );
  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });
  const res: GraphQLClientResponse<RefundOrderData> = await client.request(
    `query RefundOrder($id: ID!) {
  order(id: $id) {
    name
    email
    phone
    currencyCode
    customer {
      firstName
      lastName
      defaultEmailAddress { emailAddress }
      defaultPhoneNumber { phoneNumber }
      defaultAddress { phone countryCodeV2 }
    }
    billingAddress { phone city countryCodeV2 }
    shippingAddress { phone city countryCodeV2 }
  }
}`,
    { variables: { id: `gid://shopify/Order/${body.order_id}` } },
  );
  const order = res.data?.order;
  if (!order) {
    log.info({ shop, orderId: body.order_id }, "Shopify refund's order not found");
    return;
  }

  const customerPhone = shopifyContactPhone(
    order.customer?.defaultPhoneNumber?.phoneNumber ||
      order.phone ||
      order.customer?.defaultAddress?.phone ||
      order.billingAddress?.phone ||
      order.shippingAddress?.phone,
    order.billingAddress?.countryCodeV2 ||
      order.shippingAddress?.countryCodeV2 ||
      order.customer?.defaultAddress?.countryCodeV2,
  );
  if (!customerPhone) {
    log.info(
      { shop, orderId: body.order_id, refundId: body.id },
      "Shopify refund's order carries no phone number; automation paths skipped",
    );
    return;
  }

  const email = order.customer?.defaultEmailAddress?.emailAddress ?? order.email;
  const refundLineItems = body.refund_line_items ?? [];
  const productIds = refundLineItems.flatMap((item) =>
    item.line_item?.product_id ? [`gid://shopify/Product/${item.line_item.product_id}`] : [],
  );
  // The snake_case order shape rule variables are mapped against, so "Order Name",
  // "Customer First Name" and "Currency" resolve as they do for order events.
  const ruleBody = {
    id: body.id,
    order_id: body.order_id,
    name: order.name,
    note: body.note ?? "",
    created_at: body.created_at,
    currency: order.currencyCode,
    store_credit_amount: (storeCreditCents / 100).toFixed(2),
    email,
    customer: order.customer
      ? {
          first_name: order.customer.firstName,
          last_name: order.customer.lastName,
          email,
          phone: customerPhone,
        }
      : null,
    billing_address: order.billingAddress,
    shipping_address: order.shippingAddress,
    line_items: refundLineItems.map((item) => ({
      title: item.line_item?.title,
      quantity: item.quantity,
      product_id: item.line_item?.product_id,
    })),
  };

  for (const { event, cents } of events) {
    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.SHOPIFY_EVENT, {
      orgId: shopifyInfo.orgId,
      phone: customerPhone,
      shopifyEvent: event,
      shopifyProductIds: productIds,
      shopifyBody: {
        ...ruleBody,
        refund_amount: (cents / 100).toFixed(2),
      } as unknown as ShopifyBody,
      platform: "WHATSAPP",
    });
  }
}

// ─── RateUp orders written back ─────────────────────────────────────────────

interface WriteBackDraftsData {
  draftOrders: {
    nodes: {
      id: string;
      status: string;
      customAttributes: { key: string; value: string | null }[];
      order: { legacyResourceId: string; name: string } | null;
    }[];
  };
}

async function writeBackClient(orgId: string) {
  const info = await getShopifyInfo(orgId);
  if (!info || !info.active) throw new Error("Shopify is not connected");
  if (!shopify) throw new Error("Shopify integration is not configured");
  return new shopify.clients.Graphql({ session: await getActiveShopifySession(info) });
}

/**
 * What an earlier write-back of this RateUp order left in Shopify: the order it became, or a
 * draft whose completion failed. Lets a retried write-back finish that one instead of
 * creating a second. Drafts carry the `rateup` tag and the `rateup_order_id` attribute.
 */
export async function findShopifyWriteBack(
  orgId: string,
  rateupOrderId: string,
  since: Date,
): Promise<{ order: { id: string; name: string | null } } | { draftId: string } | null> {
  const client = await writeBackClient(orgId);
  const res: GraphQLClientResponse<WriteBackDraftsData> = await client.request(
    `query rateupWriteBacks($query: String!) {
      draftOrders(first: 50, query: $query, sortKey: UPDATED_AT, reverse: true) {
        nodes {
          id
          status
          customAttributes { key value }
          order { legacyResourceId name }
        }
      }
    }`,
    { variables: { query: `tag:rateup updated_at:>='${since.toISOString()}'` } },
  );
  const attr = (d: WriteBackDraftsData["draftOrders"]["nodes"][number], key: string) =>
    d.customAttributes.find((a) => a.key === key)?.value ?? null;
  const drafts = (res.data?.draftOrders.nodes ?? []).filter(
    (d) => attr(d, "rateup_order_id") === rateupOrderId && attr(d, "rateup_writeback") === "1",
  );
  const done = drafts.find((d) => d.order);
  if (done?.order) return { order: { id: done.order.legacyResourceId, name: done.order.name } };
  const open = drafts.find((d) => d.status === "OPEN");
  return open ? { draftId: open.id } : null;
}

export async function completeShopifyWriteBackDraft(orgId: string, draftId: string, paid: boolean) {
  const client = await writeBackClient(orgId);
  const res: GraphQLClientResponse<{
    draftOrderComplete: {
      draftOrder: { order: { legacyResourceId: string; name: string } | null } | null;
      userErrors: { field?: string[] | null; message: string }[];
    };
  }> = await client.request(
    `mutation complete($id: ID!, $pending: Boolean) {
      draftOrderComplete(id: $id, paymentPending: $pending) {
        draftOrder { order { legacyResourceId name } }
        userErrors { field message }
      }
    }`,
    { variables: { id: draftId, pending: !paid } },
  );
  const errors = res.data?.draftOrderComplete.userErrors ?? [];
  if (errors.length)
    throw new Error(`draftOrderComplete: ${errors.map((e) => e.message).join("; ")}`);
  const order = res.data?.draftOrderComplete.draftOrder?.order;
  if (!order) throw new Error("Shopify completed the draft order without an order");
  return { id: order.legacyResourceId, name: order.name ?? null };
}
