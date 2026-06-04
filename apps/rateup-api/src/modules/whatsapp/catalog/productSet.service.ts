import prisma from "../../../utils/prisma.js";
import { callMetaApi } from "../wa_axios.js";
import { log } from "../../../utils/logger.js";

/**
 * Sync Product Sets from Meta for a specific catalog
 */
export async function syncProductSetsForCatalog(
  catalogId: string,
  orgId: string,
  accessToken: string,
) {
  try {
    // Fetch product sets from Meta Graph API
    const response = await callMetaApi(
      `/${catalogId}/product_sets?fields=name,filter,product_count&access_token=${accessToken}`,
      "GET",
    );

    const productSets = response.data.data;
    if (!productSets) return [];

    // For each product set, fetch the products in it
    const productSetsWithProducts = await Promise.all(
      productSets.map(async (set: any) => {
        try {
          const productsResponse = await callMetaApi(
            `/${set.id}/products?fields=retailer_id&access_token=${accessToken}`,
            "GET",
          );

          return {
            productSetId: set.id,
            catalogId,
            orgId,
            name: set.name,
            filter: set.filter || null,
            productIds: productsResponse.data.data.map(
              (p: any) => p.retailer_id,
            ),
          };
        } catch (e) {
          log.error(
            "Error fetching products for product set %s: %o",
            set.id,
            e,
          );
          return {
            productSetId: set.id,
            catalogId,
            orgId,
            name: set.name,
            filter: set.filter || null,
            productIds: [],
          };
        }
      }),
    );

    // Upsert product sets in database
    await prisma.$transaction(async (tx) => {
      for (const productSet of productSetsWithProducts) {
        await tx.whatsappProductSet.upsert({
          where: { productSetId: productSet.productSetId },
          create: productSet,
          update: {
            name: productSet.name,
            filter: productSet.filter,
            productIds: productSet.productIds,
            updatedAt: new Date(),
          },
        });
      }

      // Remove product sets that no longer exist in Meta
      const existingProductSetIds = productSetsWithProducts.map(
        (ps) => ps.productSetId,
      );
      await tx.whatsappProductSet.deleteMany({
        where: {
          catalogId,
          orgId,
          productSetId: {
            notIn: existingProductSetIds,
          },
        },
      });
    });

    return productSetsWithProducts;
  } catch (error) {
    log.error("Error syncing product sets: %o", error);
    throw error;
  }
}

/**
 * Get all product sets for a catalog
 */
export async function getProductSetsByCatalog(catalogId: string) {
  return await prisma.whatsappProductSet.findMany({
    where: { catalogId },
    orderBy: { name: "asc" },
  });
}

/**
 * Get a specific product set
 */
export async function getProductSetById(productSetId: string) {
  return await prisma.whatsappProductSet.findUnique({
    where: { productSetId },
  });
}
