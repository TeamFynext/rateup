import shopify from "./shopify.config.js";
import { getActiveShopifySession } from "./shopify.session.js";
import { GraphqlClient } from "@shopify/shopify-api";
import { log } from "../../../utils/logger.js";
import { toShopifyProvinceCode } from "./shopify.util.js";
import { shopifyErrorDetail } from "./shopify.types.js";
import type {
  ShopifyDeliveryOptionsData,
  ShopifyDraftOrderCompleteData,
  ShopifyDraftOrderCreateData,
  ShopifyDraftOrderLookupData,
  ShopifyOrderCreateData,
  ShopifyOrderMarkAsPaidData,
  ShopifyProductImageData,
  ShopifyShippingAddressInput,
  ShopifyUserError,
  ShopifyNodesLookupData,
  ShopifyProductCreateData,
  ShopifyProductsByTitleData,
  ShopifyProductVariantsData,
} from "./shopify.types.js";
import { getShopifyInfo } from "./shopify.credential.js";

/**
 * Resolves WhatsApp catalog retailer_ids (used as Shopify SKUs) to numeric
 * Shopify variant IDs and builds a valid cart permalink URL.
 * Format: https://<shop>/cart/<variantId1>:<qty1>,<variantId2>:<qty2>
 *
 * Lookup strategy:
 *   1. Primary:  match by Shopify variant SKU == retailerId
 *   2. Fallback: match by Shopify product title (case-insensitive) == title field
 */
export async function resolveShopifyVariants(
  products: { retailerId: string; quantity: number; title?: string }[],
  client: GraphqlClient,
): Promise<Map<string, string>> {
  // retailerId → numeric Shopify variant id
  const variantMap = new Map<string, string>();

  // ── Step 0: Validate numeric IDs against Shopify ─────────────────────────
  // If retailer_id is all digits it's likely a Shopify variant ID, but we
  // must verify it still exists — the product may have been deleted/recreated
  // giving it a new ID while the old ID stays in the Meta catalog.
  const numericProducts = products.filter((p) => /^\d+$/.test(p.retailerId));
  const needsLookup: typeof products = products.filter((p) => !/^\d+$/.test(p.retailerId));

  if (numericProducts.length > 0) {
    try {
      const ids = numericProducts.map((p) => `gid://shopify/ProductVariant/${p.retailerId}`);
      const nodesData = await client.request<ShopifyNodesLookupData>(
        `query validateVariants($ids: [ID!]!) {
          nodes(ids: $ids) {
            id
            ... on ProductVariant {
              __typename
            }
          }
        }`,
        { variables: { ids } },
      );
      const nodes = nodesData.data?.nodes ?? [];
      for (const product of numericProducts) {
        const gid = `gid://shopify/ProductVariant/${product.retailerId}`;
        const node = nodes.find((n) => n?.id === gid);
        if (node?.__typename === "ProductVariant") {
          // Still valid — use directly
          variantMap.set(product.retailerId, product.retailerId);
        } else {
          // Stale ID — fall through to title-based lookup
          log.warn(
            "Numeric retailer_id '%s' no longer exists in Shopify — falling back to title lookup",
            product.retailerId,
          );
          needsLookup.push(product);
        }
      }
    } catch (e) {
      log.warn({ err: e }, "Variant validation failed, using numeric IDs as-is");
      // If validation itself fails, assume they're valid to avoid breaking the flow
      for (const p of numericProducts) {
        variantMap.set(p.retailerId, p.retailerId);
      }
    }
  }

  // ── Step 1: SKU-based lookup (non-numeric retailer_ids only) ─────────────
  const lookupSkus = needsLookup.map((p) => p.retailerId).filter(Boolean);
  if (lookupSkus.length > 0) {
    // Wrap each SKU in quotes to handle spaces and special characters
    const skuQuery = lookupSkus.map((sku) => `sku:"${sku}"`).join(" OR ");
    try {
      const variantsData = await client.request<ShopifyProductVariantsData>(
        `query getVariantsBySkus($query: String!) {
          productVariants(first: 250, query: $query) {
            edges {
              node {
                id
                sku
              }
            }
          }
        }`,
        { variables: { query: skuQuery } },
      );
      const skuEdges = variantsData.data?.productVariants?.edges ?? [];
      skuEdges.forEach((edge) => {
        // GID format: gid://shopify/ProductVariant/12345678
        const numericId = edge.node?.id?.split("/").pop();
        const sku = edge.node?.sku;
        if (!sku || !numericId) return;
        variantMap.set(sku, numericId);
      });
    } catch (e) {
      log.error({ err: e }, "Error fetching Shopify variants by SKU");
      return variantMap;
    }
  }

  // ── Step 2: Title-based fallback for any product not matched by SKU ──────
  const notFoundBySku = needsLookup.filter((p) => !variantMap.has(p.retailerId) && p.title);
  if (notFoundBySku.length > 0) {
    const titleQuery = notFoundBySku.map((p) => `title:"${p.title}"`).join(" OR ");
    try {
      const productsData = await client.request<ShopifyProductsByTitleData>(
        `query getProductsByTitle($query: String!) {
          products(first: 50, query: $query) {
            edges {
              node {
                title
                variants(first: 1) {
                  edges {
                    node { id sku }
                  }
                }
              }
            }
          }
        }`,
        { variables: { query: titleQuery } },
      );
      const titleEdges = productsData.data?.products?.edges ?? [];
      titleEdges.forEach((edge) => {
        const shopifyTitle = edge.node?.title?.toLowerCase().trim() ?? "";
        const numericId: string | undefined = edge.node?.variants?.edges?.[0]?.node?.id
          ?.split("/")
          .pop();
        if (!numericId) return;
        // Find the local product whose title or retailerId matches
        const matched = notFoundBySku.find(
          (p) =>
            p.title?.toLowerCase().trim() === shopifyTitle ||
            p.retailerId?.toLowerCase().trim() === shopifyTitle,
        );
        if (matched) {
          log.trace(
            "Matched Shopify product '%s' via title fallback for retailerId '%s'",
            edge.node?.title,
            matched.retailerId,
          );
          variantMap.set(matched.retailerId, numericId);
        }
      });
    } catch (e) {
      log.warn({ err: e }, "Title-based Shopify product lookup failed");
    }
  }

  // ── Step 3: Broad partial-word search as last resort ─────────────────────
  // Steps 1 & 2 use exact matches. Step 3 uses the first 3 significant words
  // of the title as unquoted keywords (Shopify "contains all words" search),
  // which handles apostrophe/encoding differences or slight title mismatches.
  const notFoundAfterTitle = needsLookup.filter((p) => !variantMap.has(p.retailerId));
  if (notFoundAfterTitle.length > 0) {
    for (const product of notFoundAfterTitle) {
      const words = (product.title ?? product.retailerId)
        .replace(/['"]/g, "") // strip apostrophes/quotes that break query
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .join(" ");
      try {
        const broadData = await client.request(
          `query broadSearch($query: String!) {
            products(first: 10, query: $query) {
              edges {
                node {
                  title
                  handle
                  variants(first: 5) {
                    edges {
                      node { id sku }
                    }
                  }
                }
              }
            }
          }`,
          { variables: { query: words } },
        );
        const broadEdges = broadData.data.products.edges;
        if (broadEdges.length > 0) {
          // Take the first variant of the best-matching product
          const firstVariantId: string | undefined =
            broadEdges[0]?.node?.variants?.edges[0]?.node?.id?.split("/").pop();
          if (firstVariantId) {
            variantMap.set(product.retailerId, firstVariantId);
          }
        }
      } catch (e) {
        log.warn({ err: e }, "Broad Shopify product search failed");
      }
    }
  }

  return variantMap;
}

const toGid = (type: string, id: string | number) =>
  String(id).startsWith("gid://") ? String(id) : `gid://shopify/${type}/${id}`;

function throwOnUserErrors(operation: string, userErrors: ShopifyUserError[] | undefined) {
  if (userErrors?.length) {
    throw new Error(`${operation} failed: ${userErrors.map((e) => e.message).join("; ")}`);
  }
}

async function getShopCurrencyCode(client: GraphqlClient): Promise<string> {
  const response = await client.request<{ shop: { currencyCode: string } }>(
    `query shopCurrency { shop { currencyCode } }`,
  );
  if (!response.data) throw new Error("Shopify shop query returned no data");
  return response.data.shop.currencyCode;
}

function toMailingAddress(address: ShopifyShippingAddressInput) {
  return {
    firstName: address.first_name,
    lastName: address.last_name,
    address1: address.address1,
    address2: address.address2,
    city: address.city,
    provinceCode: toShopifyProvinceCode(address.country_code, address.province),
    zip: address.zip,
    countryCode: address.country_code || "IN",
    phone: address.phone,
  };
}

// Create Shopify Draft Order with address + shipping line
export async function createShopifyDraftOrderWithAddress(
  orgId: string,
  products: {
    retailerId: string;
    quantity: number;
    title?: string;
    price?: number | string;
  }[],
  shippingAddress?: ShopifyShippingAddressInput | null,
  deliveryOption?: { name?: string; charge?: number } | null,
): Promise<{ id: string; invoice_url: string | null } | null> {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    log.trace("Shopify not active for orgId %s - skipping draft order creation", orgId);
    return null;
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });
  const variantMap = await resolveShopifyVariants(products, client);
  if (products.length === 0) {
    log.trace("No line items for draft order — skipping");
    return null;
  }
  const currencyCode = await getShopCurrencyCode(client);

  const lines = products.map((product) => {
    const variantId = variantMap.get(product.retailerId);
    if (variantId) {
      return { variantId: toGid("ProductVariant", variantId), quantity: product.quantity };
    }
    // Fallback: custom line item with title and price from WA catalog data
    const price = parseFloat(String(product.price ?? "0")) || 0;
    return {
      title: product.title ?? product.retailerId,
      amount: price.toFixed(2),
      quantity: product.quantity,
    };
  });
  const address = shippingAddress ? toMailingAddress(shippingAddress) : undefined;
  const shipping = deliveryOption && {
    title: deliveryOption.name ?? "Delivery",
    amount: String(deliveryOption.charge ?? 0),
  };

  try {
    const response = await client.request<ShopifyDraftOrderCreateData>(
      `mutation createDraftOrder($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            legacyResourceId
            invoiceUrl
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: {
            lineItems: lines.map((line) =>
              "variantId" in line
                ? line
                : {
                    title: line.title,
                    quantity: line.quantity,
                    requiresShipping: true,
                    originalUnitPriceWithCurrency: { amount: line.amount, currencyCode },
                  },
            ),
            ...(address && { shippingAddress: address }),
            ...(shipping && {
              shippingLine: {
                title: shipping.title,
                priceWithCurrency: { amount: shipping.amount, currencyCode },
              },
            }),
            note: "Order from WhatsApp Catalog",
          },
        },
      },
    );
    throwOnUserErrors("draftOrderCreate", response.data?.draftOrderCreate.userErrors);
    const draftOrder = response.data?.draftOrderCreate.draftOrder;
    if (!draftOrder) throw new Error("draftOrderCreate returned no draft order");
    log.info("Created Shopify draft order %s for orgId %s", draftOrder.legacyResourceId, orgId);
    return { id: draftOrder.legacyResourceId, invoice_url: draftOrder.invoiceUrl };
  } catch (error) {
    log.error({ err: shopifyErrorDetail(error) }, "Failed to create Shopify draft order");
    try {
      log.warn(
        "Draft order creation failed (likely missing write_draft_orders scope). Falling back to orderCreate...",
      );
      const response = await client.request<ShopifyOrderCreateData>(
        `mutation createOrder($order: OrderCreateOrderInput!) {
          orderCreate(order: $order) {
            order {
              legacyResourceId
              statusPageUrl
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            order: {
              currency: currencyCode,
              lineItems: lines.map((line) =>
                "variantId" in line
                  ? line
                  : {
                      title: line.title,
                      quantity: line.quantity,
                      requiresShipping: true,
                      priceSet: { shopMoney: { amount: line.amount, currencyCode } },
                    },
              ),
              financialStatus: "PENDING",
              ...(address && { shippingAddress: address }),
              ...(shipping && {
                shippingLines: [
                  {
                    title: shipping.title,
                    priceSet: { shopMoney: { amount: shipping.amount, currencyCode } },
                  },
                ],
              }),
              note: "Order from WhatsApp Catalog",
            },
          },
        },
      );
      throwOnUserErrors("orderCreate", response.data?.orderCreate.userErrors);
      const order = response.data?.orderCreate.order;
      if (!order) {
        log.error("Fallback Shopify order creation returned no order");
        return null;
      }
      log.info("Created fallback Shopify order %s for orgId %s", order.legacyResourceId, orgId);
      return { id: order.legacyResourceId, invoice_url: order.statusPageUrl };
    } catch (fallbackError) {
      log.error(
        { err: shopifyErrorDetail(fallbackError) },
        "Fallback Shopify order creation also failed",
      );
      return null;
    }
  }
}

/**
 * Marks the order behind a WhatsApp payment as paid. `orderId` is what
 * createShopifyDraftOrderWithAddress stored: a draft order id, or an order id
 * when it had to fall back to orderCreate.
 */
export async function captureShopifyOrderPayment(orgId: string, orderId: string) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    log.trace("Shopify integration not active. Cannot capture payment.");
    return false;
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });

  try {
    // First try completing it as a draft order (paid, since paymentPending defaults to false)
    const response = await client.request<ShopifyDraftOrderCompleteData>(
      `mutation completeDraftOrder($id: ID!) {
        draftOrderComplete(id: $id) {
          draftOrder {
            order {
              legacyResourceId
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      { variables: { id: toGid("DraftOrder", orderId) } },
    );
    throwOnUserErrors("draftOrderComplete", response.data?.draftOrderComplete.userErrors);
    log.info("Successfully completed Shopify Draft Order %s into a paid order", orderId);
    return response.data?.draftOrderComplete.draftOrder?.order?.legacyResourceId || true;
  } catch (draftError) {
    log.warn(
      { err: shopifyErrorDetail(draftError) },
      "Completing draft order failed (might be a direct order ID). Trying orderMarkAsPaid for %s...",
      orderId,
    );
    try {
      const response = await client.request<ShopifyOrderMarkAsPaidData>(
        `mutation markOrderPaid($input: OrderMarkAsPaidInput!) {
          orderMarkAsPaid(input: $input) {
            order {
              legacyResourceId
              displayFinancialStatus
            }
            userErrors {
              field
              message
            }
          }
        }`,
        { variables: { input: { id: toGid("Order", orderId) } } },
      );
      throwOnUserErrors("orderMarkAsPaid", response.data?.orderMarkAsPaid.userErrors);
      log.info("Successfully marked Shopify Order %s as paid", orderId);
      return response.data?.orderMarkAsPaid.order ?? true;
    } catch (error) {
      log.error(
        { err: shopifyErrorDetail(error) },
        "Failed to capture payment for Shopify Order %s",
        orderId,
      );
      return false;
    }
  }
}

export async function buildShopifyCartUrl(
  orgId: string,
  products: { retailerId: string; quantity: number; title?: string }[],
): Promise<string | null> {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    log.warn("Shopify integration not active for orgId %s", orgId);
    return null;
  }

  const shop = shopifyInfo.credential?.session?.shop;
  if (!shop) {
    log.warn("Shopify shop domain not found for orgId %s", orgId);
    return null;
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });

  const variantMap = await resolveShopifyVariants(products, client);

  // ── Build cart URL ────────────────────────────────────────────────────────
  const cartParts: string[] = [];
  for (const product of products) {
    const numericVariantId = variantMap.get(product.retailerId);
    if (numericVariantId) {
      cartParts.push(`${numericVariantId}:${product.quantity}`);
    } else {
      log.warn(
        "Shopify variant not found for retailerId '%s' (title: '%s') — skipping",
        product.retailerId,
        product.title ?? "N/A",
      );
    }
  }

  if (cartParts.length === 0) {
    log.warn("No Shopify variants matched for orgId %s", orgId);
    return null;
  }

  return `https://${shop}/cart/${cartParts.join(",")}`;
}
export async function createShopifyDraftOrder(
  orgId: string,
  products: { retailerId: string; quantity: number; title?: string }[],
) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    throw new Error("Shopify integration not active");
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });

  const skus = products.map((p) => p.retailerId).filter(Boolean);
  const variantMap = new Map<string, string>();

  if (skus.length > 0) {
    const skuQuery = skus.map((sku) => `sku:${sku}`).join(" OR ");
    const variantsData = await client.request<ShopifyProductVariantsData>(
      `query getVariantsBySkus($query: String!) {
          productVariants(first: 250, query: $query) {
            edges {
              node {
                id
                sku
              }
            }
          }
        }`,
      { variables: { query: skuQuery } },
    );

    (variantsData.data?.productVariants?.edges ?? []).forEach((edge) => {
      const sku = edge.node?.sku;
      const id = edge.node?.id;
      if (!sku || !id) return;
      variantMap.set(sku, id);
    });
  }

  const lineItems = [];
  for (const product of products) {
    const variantId = variantMap.get(product.retailerId);
    if (variantId) {
      lineItems.push({
        variantId,
        quantity: product.quantity,
      });
    } else {
      log.warn(`Product SKU ${product.retailerId} not found in Shopify`);
    }
  }

  if (lineItems.length === 0) {
    throw new Error("No products matched in Shopify");
  }

  const draftOrderData = await client.request(
    `mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          invoiceUrl
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        input: {
          lineItems,
        },
      },
    },
  );

  const userErrors = draftOrderData.data.draftOrderCreate.userErrors;
  if (userErrors.length > 0) {
    throw new Error(`Shopify Error: ${userErrors?.[0]?.message}`);
  }

  return draftOrderData.data.draftOrderCreate.draftOrder;
}

/**
 * Creates a new product in the merchant's Shopify store.
 * Uses the new productCreate (2024-01+) API with ProductCreateInput.
 * Price is set via a follow-up productVariantsBulkUpdate since variants
 * are auto-created in the new product model.
 */
export async function createShopifyProduct(
  orgId: string,
  data: {
    title: string;
    description: string;
    brand: string;
    price: number;
    currencyCode: string;
    imageUrl?: string;
  },
) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo?.active) {
    throw new Error("Shopify integration not active for this org");
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });

  // ── Step 1: Create the product ──────────────────────────────────────────
  const createMutation = `
    mutation productCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
      productCreate(product: $product, media: $media) {
        product {
          id
          title
          variants(first: 1) {
            nodes {
              id
              price
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const createVariables: Record<string, unknown> = {
    product: {
      title: data.title,
      descriptionHtml: data.description,
      vendor: data.brand,
      status: "ACTIVE",
    },
  };

  if (data.imageUrl) {
    createVariables.media = [
      {
        originalSource: data.imageUrl,
        mediaContentType: "IMAGE",
      },
    ];
  }

  const createResponse = await client.request<ShopifyProductCreateData>(createMutation, {
    variables: createVariables,
  });
  const createResult = createResponse.data?.productCreate;

  if (createResult?.userErrors?.length) {
    throw new Error(createResult.userErrors[0].message);
  }

  const product = createResult?.product;
  const variantId = product?.variants?.nodes?.[0]?.id;

  // ── Step 2: Set the price on the default variant ───────────────────────
  if (variantId) {
    const priceMutation = `
      mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants {
            id
            price
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    await client.request(priceMutation, {
      variables: {
        productId: product.id,
        variants: [
          {
            id: variantId,
            price: String(parseFloat(String(data.price)).toFixed(2)),
          },
        ],
      },
    });
  }

  return product;
}

// Fetch shipping rates dynamically from Shopify
export async function fetchShopifyShippingRates(
  orgId: string,
  products: {
    retailerId: string;
    quantity: number;
    title?: string;
    price?: number | string;
  }[],
  shippingAddress: ShopifyShippingAddressInput,
) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    log.trace("Shopify not active for orgId %s - skipping shipping rates query", orgId);
    return [];
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });
  const variantMap = await resolveShopifyVariants(products, client);

  const lineItems = [];
  for (const product of products) {
    const variantId = variantMap.get(product.retailerId);
    if (variantId) {
      const fullVariantGid = variantId.startsWith("gid://")
        ? variantId
        : `gid://shopify/ProductVariant/${variantId}`;
      lineItems.push({
        variantId: fullVariantGid,
        quantity: product.quantity,
      });
    } else {
      log.warn(
        `SKU ${product.retailerId} could not be resolved to a Shopify variant for rates calculation.`,
      );
    }
  }

  if (lineItems.length === 0) {
    log.trace("No line items resolved for shipping rates query");
    return [];
  }

  const graphqlAddress = toMailingAddress(shippingAddress);

  try {
    const response = await client.request<ShopifyDeliveryOptionsData>(
      `query getAvailableShippingRates($input: DraftOrderAvailableDeliveryOptionsInput!) {
        draftOrderAvailableDeliveryOptions(input: $input) {
          availableShippingRates {
            handle
            title
            price {
              amount
              currencyCode
            }
          }
        }
      }`,
      {
        variables: {
          input: {
            lineItems,
            shippingAddress: graphqlAddress,
          },
        },
      },
    );

    const rates = response.data?.draftOrderAvailableDeliveryOptions?.availableShippingRates ?? [];
    // A rate without a handle can't be selected later, so drop it.
    return rates
      .filter((r) => Boolean(r.handle))
      .map((r) => ({
        id: r.handle as string,
        name: r.title ?? "Delivery",
        charge: parseFloat(r.price?.amount || "0"),
        enabled: true,
      }));
  } catch (error) {
    log.error(
      { err: shopifyErrorDetail(error) },
      "Failed to fetch available shipping rates from Shopify",
    );
    return [];
  }
}

// Resolve order ID from a draft order ID
export async function getOrderIdFromDraftOrder(
  orgId: string,
  draftOrderId: string,
): Promise<string> {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    throw new Error(`Shopify integration not active for organization: ${orgId}`);
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });

  try {
    const response = await client.request<ShopifyDraftOrderLookupData>(
      `query draftOrderOrder($id: ID!) {
        draftOrder(id: $id) {
          order {
            legacyResourceId
          }
        }
      }`,
      { variables: { id: toGid("DraftOrder", draftOrderId) } },
    );
    const orderId = response.data?.draftOrder?.order?.legacyResourceId;
    if (!orderId) {
      throw new Error(`Draft order ${draftOrderId} has not been completed yet.`);
    }
    return String(orderId);
  } catch (error) {
    log.error(
      { err: shopifyErrorDetail(error) },
      "Failed to fetch Shopify draft order to resolve order_id",
    );
    return draftOrderId;
  }
}

// Fetch the primary image URL for a Shopify product
export async function getShopifyProductImage(
  orgId: string,
  productId: string,
): Promise<string | null> {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo || !shopifyInfo.active) {
    log.warn(`Shopify integration not active for organization: ${orgId}`);
    return null;
  }

  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({
    session: await getActiveShopifySession(shopifyInfo),
  });

  try {
    const response = await client.request<ShopifyProductImageData>(
      `query productImage($id: ID!) {
        product(id: $id) {
          featuredMedia {
            preview {
              image {
                url
              }
            }
          }
        }
      }`,
      { variables: { id: toGid("Product", productId) } },
    );
    return response.data?.product?.featuredMedia?.preview?.image?.url ?? null;
  } catch (error) {
    log.error(
      { err: shopifyErrorDetail(error) },
      "Failed to fetch Shopify product image for product %s",
      productId,
    );
    return null;
  }
}
