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
import { ShopifyBody, type ShopifyWebhookJobData } from "./shopify.types.js";
import { normalisePhone } from "../../loyalty/util.js";
import { getShopifyIntegrationByShop } from "./shopify.credential.js";

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
  // Everything after this point — loyalty, the order.* event, the survey and the
  // automation rules — is the commerce layer's, shared with every store.
  const orderId = body?.id != null ? String(body.id) : null;
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
      customer: { phone: customerPhone ?? null, email: customerEmail ?? null },
      amount: extractPurchaseAmount(body),
      productIds,
      discountCodes: extractDiscountCodes(body),
      deliveryId: webhookId,
      raw: body as unknown as Record<string, unknown>,
    },
  );

  if (topic === ShopifyEvents.ORDERS_CREATE) {
    await markCheckoutRecovered(shopifyInfo.orgId, body);
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
