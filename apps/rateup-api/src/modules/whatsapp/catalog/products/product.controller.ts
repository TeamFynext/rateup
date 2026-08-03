import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../utils/logger.js";
import {
  createCatalogProductsBatch,
  deleteCatalogProducts,
  getCatalogProducts,
  getShopifyProductsForCatalog,
  importSelectedShopifyProducts,
  syncCatalogProducts,
  syncShopifyProductsToCatalog,
  updateCatalogProducts,
} from "./product.service.js";
import { createShopifyProduct } from "../../../integrations/shopify/shopify.service.js";
import {
  catalogItemBatchSchema,
  CatalogItemQueryFilter,
  CatalogProductIdsSchema,
  CatalogProductTypes,
  type CatalogProductCoreInput,
} from "./product.schema.js";
import { CatalogIdParam } from "../catalog.schema.js";
import { getWaCatalog } from "../catalog.service.js";

/** The item array lives under a key named by `body.type`. `catalogItemBatchSchema` only
 *  declares the three verticals the wire schema models, so the key can't be indexed
 *  statically — resolved dynamically (same pattern as `getAnswerValue` in
 *  `response.service.ts`) to preserve the handler's original pass-through behaviour for
 *  whatever key the body actually carries. */
function batchItemsForType<T>(body: catalogItemBatchSchema): T[] | undefined {
  const items = (body as Record<string, unknown>)[body.type];
  return Array.isArray(items) ? (items as T[]) : undefined;
}

export async function createCatalogProductsBatchHandler(
  request: FastifyRequest<{
    Body: catalogItemBatchSchema;
    Params: CatalogIdParam;
  }>,
  reply: FastifyReply,
) {
  try {
    const { type } = request.body;
    const { catalogId } = request.params;
    const { orgId } = request.user;
    const catalogInfo = await getWaCatalog(catalogId);
    if (!catalogInfo) {
      return reply.code(404).send("No catalog found");
    }
    await createCatalogProductsBatch(orgId, type, batchItemsForType(request.body)!, catalogId);
    reply.code(200).send();
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function syncCatalogProductsHandler(
  request: FastifyRequest<{
    Body: CatalogItemQueryFilter;
    Params: CatalogIdParam;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { catalogId } = request.params;
    const res = await syncCatalogProducts(orgId, catalogId, request.body);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getCatalogProductsHandler(
  request: FastifyRequest<{ Params: CatalogIdParam }>,
  reply: FastifyReply,
) {
  try {
    const { catalogId } = request.params;
    const res = await getCatalogProducts(catalogId, request.query);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteCatalogProductsHandler(
  request: FastifyRequest<{
    Body: CatalogProductIdsSchema;
    Params: CatalogIdParam;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { catalogId } = request.params;
    const res = await deleteCatalogProducts(orgId, catalogId, request.body.productIds);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateCatalogProductsHandler(
  request: FastifyRequest<{
    Body: catalogItemBatchSchema;
    Params: CatalogIdParam;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { type } = request.body;
    const { catalogId } = request.params;
    const res = await updateCatalogProducts(
      orgId,
      catalogId,
      batchItemsForType(request.body)!,
      type,
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getShopifyAvailableProductsHandler(
  request: FastifyRequest<{ Params: CatalogIdParam }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { catalogId } = request.params;
    const catalogInfo = await getWaCatalog(catalogId);
    if (!catalogInfo) {
      return reply.code(404).send("No catalog found");
    }
    const items = await getShopifyProductsForCatalog(orgId, catalogId);
    reply.code(200).send(items);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function importShopifyProductsHandler(
  request: FastifyRequest<{ Params: CatalogIdParam; Body: { items: CatalogProductCoreInput[] } }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { catalogId } = request.params;
    const catalogInfo = await getWaCatalog(catalogId);
    if (!catalogInfo) {
      return reply.code(404).send("No catalog found");
    }
    const result = await importSelectedShopifyProducts(orgId, catalogId, request.body?.items ?? []);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function createShopifyProductHandler(
  request: FastifyRequest<{
    Params: CatalogIdParam;
    Body: {
      title: string;
      description: string;
      brand: string;
      price: number;
      currencyCode: string;
      imageUrl?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { catalogId } = request.params;
    const { title, description, brand, price, currencyCode, imageUrl } = request.body;

    // Step 1: Create the product in Shopify
    const shopifyProduct = await createShopifyProduct(orgId, request.body);

    // Step 2: Auto-import into the catalog so it appears with the Shopify badge
    const variantGid: string | undefined = shopifyProduct?.variants?.nodes?.[0]?.id;
    if (variantGid && catalogId) {
      const numericVariantId = variantGid.split("/").pop() ?? variantGid;
      const productGid: string = shopifyProduct?.id ?? "";
      const productGroupId = productGid.split("/").pop() ?? productGid;

      const catalogItem: CatalogProductCoreInput = {
        retailer_id: numericVariantId,
        title: title.substring(0, 100),
        description: (description || title).substring(0, 5000),
        condition: "new",
        image: imageUrl ? [{ url: imageUrl }] : [],
        internal_label: [],
        link: "",
        price,
        currencyCode,
        availability: "in stock",
        brand,
        sale_price: parseFloat(String(price)).toFixed(2),
        item_group_id: productGroupId,
      };

      // Only import if we have at least one image (Meta requires it)
      if ((catalogItem.image?.length ?? 0) > 0) {
        await importSelectedShopifyProducts(orgId, catalogId, [catalogItem]);
      }
    }

    reply.code(200).send(shopifyProduct);
  } catch (e) {
    log.error({ err: e }, "Failed to create Shopify product");
    reply
      .code(500)
      .send({ message: e instanceof Error ? e.message : "Failed to create Shopify product" });
  }
}

export async function syncShopifyProductsFromShopifyHandler(
  request: FastifyRequest<{ Params: CatalogIdParam }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { catalogId } = request.params;
    const catalogInfo = await getWaCatalog(catalogId);
    if (!catalogInfo) {
      return reply.code(404).send("No catalog found");
    }
    const result = await syncShopifyProductsToCatalog(orgId, catalogId);
    reply.code(200).send(result);
  } catch (e) {
    log.error({ err: e }, "Failed to sync from Shopify");
    reply
      .code(500)
      .send({ message: e instanceof Error ? e.message : "Failed to sync from Shopify" });
  }
}
