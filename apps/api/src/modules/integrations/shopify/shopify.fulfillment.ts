import prisma from "../../../utils/prisma.js";
import shopify from "./shopify.config.js";
import { getActiveShopifySession } from "./shopify.session.js";
import { log } from "../../../utils/logger.js";
import {
  shopifyErrorDetail,
  type ShopifyFulfillmentCreateData,
  type ShopifyFulfillmentOrdersData,
} from "./shopify.types.js";
import { getShopifyInfo } from "./shopify.credential.js";
import { getOrderIdFromDraftOrder } from "./shopify.catalog.js";

// Retrieve fulfillment orders for an order
export async function getFulfillmentOrders(orgId: string, waCatalogOrderId: string) {
  const waCatalogOrder = await prisma.waCatalogOrder.findUnique({
    where: { id: waCatalogOrderId },
  });
  if (!waCatalogOrder) {
    throw new Error(`WaCatalogOrder not found for ID: ${waCatalogOrderId}`);
  }
  if (!waCatalogOrder.shopifyDraftOrderId) {
    throw new Error(`No Shopify Draft Order ID associated with order: ${waCatalogOrderId}`);
  }

  const shopifyOrderId = await getOrderIdFromDraftOrder(orgId, waCatalogOrder.shopifyDraftOrderId);

  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    throw new Error(`Shopify integration not active for organization: ${orgId}`);
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });

  const fullOrderGid = shopifyOrderId.startsWith("gid://")
    ? shopifyOrderId
    : `gid://shopify/Order/${shopifyOrderId}`;

  try {
    const response = await client.request<ShopifyFulfillmentOrdersData>(
      `query getFulfillmentOrders($orderId: ID!) {
        order(id: $orderId) {
          id
          name
          fulfillmentOrders(first: 20) {
            nodes {
              id
              status
              requestStatus
              lineItems(first: 100) {
                nodes {
                  id
                  sku
                  productTitle
                  totalQuantity
                  remainingQuantity
                }
              }
            }
          }
        }
      }`,
      {
        variables: { orderId: fullOrderGid },
      },
    );

    const nodes = response.data?.order?.fulfillmentOrders?.nodes ?? [];
    nodes.forEach((node) => {
      node.lineItems?.nodes?.forEach((item) => {
        item.title = item.productTitle;
      });
    });
    return nodes;
  } catch (error) {
    log.error({ err: shopifyErrorDetail(error) }, "Failed to fetch Shopify fulfillment orders");
    throw error;
  }
}

// Create fulfillment in Shopify
export async function createShopifyFulfillment(
  orgId: string,
  fulfillmentInput: {
    lineItemsByFulfillmentOrder: {
      fulfillmentOrderId: string;
      fulfillmentOrderLineItems?: {
        id: string;
        quantity: number;
      }[];
    }[];
    trackingInfo?: {
      company?: string;
      number?: string;
      url?: string;
    };
    notifyCustomer?: boolean;
  },
) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    throw new Error(`Shopify integration not active for organization: ${orgId}`);
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });

  try {
    const response = await client.request<ShopifyFulfillmentCreateData>(
      `mutation CreateFulfillment($fulfillment: FulfillmentInput!) {
        fulfillmentCreate(fulfillment: $fulfillment) {
          fulfillment {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: { fulfillment: fulfillmentInput },
      },
    );

    const result = response.data?.fulfillmentCreate;
    if (result?.userErrors?.length) {
      throw new Error(result.userErrors[0].message);
    }

    return result?.fulfillment;
  } catch (error) {
    log.error({ err: shopifyErrorDetail(error) }, "Failed to create Shopify fulfillment");
    throw error;
  }
}
