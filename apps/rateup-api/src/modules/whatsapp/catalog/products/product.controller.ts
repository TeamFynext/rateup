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
import { WooConnectError } from "../../../integrations/woocommerce/woocommerce.connect.js";
import {
  getWooProductsForCatalog,
  importSelectedWooProducts,
} from "../../../integrations/woocommerce/woocommerce.products.js";
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
    const catalogInfo = await getWaCatalog(catalogId, orgId);
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
    const catalogInfo = await getWaCatalog(catalogId, orgId);
    if (!catalogInfo) {
      return reply.code(404).send("No catalog found");
    }
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
    const { orgId } = request.user;
    const { catalogId } = request.params;
    // Ownership check, like every other handler here: getWaCatalog is scoped to the org,
    // so another org's catalog comes back null and is answered 404.
    const catalogInfo = await getWaCatalog(catalogId, orgId);
    if (!catalogInfo) {
      return reply.code(404).send("No catalog found");
    }
    const res = await getCatalogProducts(catalogId);
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
    // The per-product writes below are keyed on { catalogId, ... } so they cannot stray
    // into another catalog, but nothing confirmed the CATALOG belongs to the caller —
    // so a known catalogId let one org rewrite another's products, at Meta as well as
    // locally.
    const catalogInfo = await getWaCatalog(catalogId, orgId);
    if (!catalogInfo) {
      return reply.code(404).send("No catalog found");
    }
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
    const catalogInfo = await getWaCatalog(catalogId, orgId);
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
    const catalogInfo = await getWaCatalog(catalogId, orgId);
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

    // Checked BEFORE the Shopify write: creating first meant a bad or foreign catalogId
    // left an orphaned product in Shopify that nothing here would ever import.
    const catalogInfo = await getWaCatalog(catalogId, orgId);
    if (!catalogInfo) {
      return reply.code(404).send("No catalog found");
    }

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
        sale_price: price,
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
    const catalogInfo = await getWaCatalog(catalogId, orgId);
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

/** The store refusing or not connected, said as the store's problem; anything else is ours. */
function sendWooError(reply: FastifyReply, error: unknown, what: string) {
  if (error instanceof WooConnectError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  log.error({ err: error }, `WooCommerce catalog ${what} failed`);
  return reply.code(500).send({ message: `Could not ${what} WooCommerce products` });
}

export async function getWooAvailableProductsHandler(
  request: FastifyRequest<{ Params: CatalogIdParam }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { catalogId } = request.params;
    if (!(await getWaCatalog(catalogId, orgId))) return reply.code(404).send("No catalog found");
    return reply.code(200).send(await getWooProductsForCatalog(orgId, catalogId));
  } catch (e) {
    return sendWooError(reply, e, "load");
  }
}

export async function importWooProductsHandler(
  request: FastifyRequest<{ Params: CatalogIdParam; Body: { items: CatalogProductCoreInput[] } }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { catalogId } = request.params;
    if (!(await getWaCatalog(catalogId, orgId))) return reply.code(404).send("No catalog found");
    const result = await importSelectedWooProducts(orgId, catalogId, request.body?.items ?? []);
    return reply.code(200).send(result);
  } catch (e) {
    return sendWooError(reply, e, "import");
  }
}
