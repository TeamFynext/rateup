import type { AxiosInstance } from "axios";

import type { Integration } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
import {
  createCatalogProductsBatch,
  updateCatalogProducts,
} from "../../whatsapp/catalog/products/product.service.js";
import {
  CatalogProductTypes,
  type CatalogProductCoreInput,
} from "../../whatsapp/catalog/products/product.schema.js";
import {
  createWooClient,
  getWooCatalogProduct,
  getWooCurrency,
  listAllWooProducts,
  listWooVariations,
  type WooCatalogProduct,
  type WooVariation,
} from "./woocommerce.client.js";
import { WooConnectError } from "./woocommerce.connect.js";
import type { WooDeliveryJobData } from "./woocommerce.inbound.js";
import { readWooCredential, type WooCredential } from "./woocommerce.types.js";

/**
 * WooCommerce products in the WhatsApp catalog: an import the admin picks
 * from, and `product.updated` keeping what was imported current.
 *
 * Each sellable thing is one catalog item — a simple product, or each
 * variation of a variable one, grouped under its product by `item_group_id`.
 * Retailer ids carry a `wc_` prefix: WooCommerce and Shopify ids are both bare
 * numbers, and one catalog can hold both stores' products. The prefix is also
 * how a catalog row is known to have come from WooCommerce.
 */

export const WOO_RETAILER_PREFIX = "wc_";
export const wooRetailerId = (id: number | string) => `${WOO_RETAILER_PREFIX}${id}`;

/** Meta allows five additional images per item; the first is the main one. */
const MAX_IMAGES = 5;

interface CatalogContext {
  currencyCode: string;
  /** Meta requires a brand; WooCommerce core has none, so the store's name stands in. */
  brand: string | undefined;
}

/** Plain text from WooCommerce's HTML descriptions: tags gone, common entities decoded. */
export function plainText(html: string | undefined): string {
  return (html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h\d)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

const AVAILABILITY: Record<string, CatalogProductCoreInput["availability"]> = {
  instock: "in stock",
  onbackorder: "available for order",
  outofstock: "out of stock",
};

const amount = (raw: string | undefined) => {
  const value = Number.parseFloat(raw ?? "");
  return Number.isFinite(value) && value > 0 ? value : null;
};

/** The regular price, and the sale price only when there is a real sale. */
function prices(item: { price?: string; regular_price?: string; sale_price?: string }) {
  const regular = amount(item.regular_price) ?? amount(item.price);
  if (regular === null) return null;
  const sale = amount(item.sale_price);
  return { price: regular, ...(sale !== null && sale < regular && { sale_price: sale }) };
}

/**
 * One product as catalog items: itself when simple or external, each
 * variation when variable, nothing when there is nothing to sell — a grouped
 * product, no price, or no image (Meta requires one).
 *
 * A product that is no longer published is kept, out of stock, so an update
 * takes it off sale in WhatsApp rather than leaving it buyable.
 */
export function toCatalogItems(
  product: WooCatalogProduct,
  variations: WooVariation[],
  context: CatalogContext,
): CatalogProductCoreInput[] {
  const productImages = (product.images ?? [])
    .flatMap((image) => (image.src ? [{ url: image.src }] : []))
    .slice(0, MAX_IMAGES);
  const unpublished = product.status !== undefined && product.status !== "publish";
  const description = plainText(product.short_description) || plainText(product.description);

  const item = (
    id: number,
    title: string,
    source: Pick<WooVariation, "price" | "regular_price" | "sale_price" | "stock_status">,
    images: { url: string }[],
    link: string | undefined,
    groupId?: string,
  ): CatalogProductCoreInput | null => {
    const money = prices(source);
    if (!money || images.length === 0) return null;
    const trimmedTitle = title.substring(0, 100);
    return {
      retailer_id: wooRetailerId(id),
      title: trimmedTitle,
      description: (description || trimmedTitle).substring(0, 5000),
      condition: "new",
      image: images,
      internal_label: [],
      link: link ?? product.permalink ?? "",
      currencyCode: context.currencyCode,
      availability: unpublished
        ? "out of stock"
        : (AVAILABILITY[source.stock_status ?? ""] ?? "in stock"),
      brand: (context.brand || product.name).substring(0, 100),
      ...money,
      ...(groupId && { item_group_id: groupId }),
    };
  };

  if (product.type === "variable") {
    return variations.flatMap((variation) => {
      const options = (variation.attributes ?? [])
        .map((attribute) => attribute.option?.trim())
        .filter(Boolean)
        .join(" / ");
      const image = variation.image?.src ? [{ url: variation.image.src }] : productImages;
      const built = item(
        variation.id,
        options ? `${product.name} - ${options}` : product.name,
        {
          ...variation,
          // A disabled variation is not for sale, whatever its stock says.
          stock_status:
            variation.status && variation.status !== "publish"
              ? "outofstock"
              : variation.stock_status,
        },
        image,
        variation.permalink,
        wooRetailerId(product.id),
      );
      return built ? [built] : [];
    });
  }

  if (product.type === "simple" || product.type === "external") {
    const built = item(product.id, product.name, product, productImages, product.permalink);
    return built ? [built] : [];
  }

  return [];
}

async function catalogContext(credential: WooCredential, client: AxiosInstance) {
  const currencyCode =
    credential.store?.currency || (await getWooCurrency(client).catch(() => undefined));
  if (!currencyCode) {
    throw new WooConnectError("Could not read the store's currency from WooCommerce.", 502);
  }
  return { currencyCode, brand: credential.store?.name };
}

async function connectedStore(orgId: string) {
  const integration = await prisma.integration.findUnique({
    where: { orgid_integration_name_unique: { orgId, name: IntegratedApps.woocommerce } },
  });
  const credential = integration?.active ? readWooCredential(integration.credential) : null;
  if (!credential) throw new WooConnectError("WooCommerce is not connected.", 400);
  return { credential, client: createWooClient(credential) };
}

/** A product with its variations, for the ones that have them. */
async function withVariations(client: AxiosInstance, product: WooCatalogProduct) {
  return product.type === "variable" ? await listWooVariations(client, product.id) : [];
}

/**
 * The store's products as catalog items, minus the ones already in this
 * catalog — what the import dialog offers.
 */
export async function getWooProductsForCatalog(orgId: string, catalogId: string) {
  const { credential, client } = await connectedStore(orgId);
  const [context, products, existing] = await Promise.all([
    catalogContext(credential, client),
    listAllWooProducts(client),
    prisma.waCatalogProduct.findMany({
      where: { catalogId, retailer_id: { startsWith: WOO_RETAILER_PREFIX } },
      select: { retailer_id: true },
    }),
  ]);
  const imported = new Set(existing.map((row) => row.retailer_id));

  const items: CatalogProductCoreInput[] = [];
  for (const product of products) {
    const variations = await withVariations(client, product);
    for (const item of toCatalogItems(product, variations, context)) {
      if (!imported.has(item.retailer_id)) items.push(item);
    }
  }
  return items;
}

/** Adds the picked items to Meta's catalog and ours. Only WooCommerce items are accepted. */
export async function importSelectedWooProducts(
  orgId: string,
  catalogId: string,
  items: CatalogProductCoreInput[],
) {
  const woo = items.filter((item) => item.retailer_id?.startsWith(WOO_RETAILER_PREFIX));
  if (woo.length === 0) return { imported: 0 };

  await createCatalogProductsBatch(orgId, CatalogProductTypes.PRODUCT_ITEM, woo, catalogId);
  log.info({ orgId, catalogId, imported: woo.length }, "WooCommerce→Catalog import complete");
  return { imported: woo.length };
}

/**
 * `product.updated`: pushes the product's current state to every catalog of
 * the org that already holds it. Never adds: what goes into a catalog is the
 * admin's choice, made in the import.
 *
 * The item's condition and internal labels are the admin's, set in RateUp,
 * and are kept.
 */
export async function handleWooProductUpdated(
  integration: Integration,
  data: WooDeliveryJobData,
): Promise<{ updated: number }> {
  const credential = readWooCredential(integration.credential);
  if (!credential || !integration.orgId) return { updated: 0 };
  const orgId = integration.orgId;
  const client = createWooClient(credential);

  let product = data.payload as unknown as WooCatalogProduct;
  let only: number | undefined;
  // A variation saved on its own arrives as itself; its catalog item needs the
  // parent's name, images and description.
  if (product.type === "variation" && product.parent_id) {
    only = product.id;
    product = await getWooCatalogProduct(client, product.parent_id);
  }

  const ids =
    product.type === "variable"
      ? (product.variations ?? []).map(wooRetailerId)
      : [wooRetailerId(product.id)];
  const rows = await prisma.waCatalogProduct.findMany({
    where: {
      retailer_id: { in: only ? [wooRetailerId(only)] : ids },
      type: CatalogProductTypes.PRODUCT_ITEM,
      catalog: { orgId },
    },
    select: { catalogId: true, retailer_id: true, productProps: true },
  });
  if (rows.length === 0) return { updated: 0 };

  const context = await catalogContext(credential, client);
  const variations = await withVariations(client, product);
  const items = new Map(
    toCatalogItems(product, variations, context).map((item) => [item.retailer_id, item]),
  );

  const byCatalog = new Map<string, CatalogProductCoreInput[]>();
  for (const row of rows) {
    const item = row.retailer_id ? items.get(row.retailer_id) : undefined;
    if (!item) continue; // no longer sellable as an item (no price, no image): left as it was
    const props = (row.productProps ?? {}) as Partial<CatalogProductCore>;
    const kept: CatalogProductCoreInput = {
      ...item,
      condition: (props.condition as CatalogProductCoreInput["condition"]) ?? item.condition,
      // Stored quoted for Meta; unquoted here, as the update quotes them again.
      internal_label: (props.internal_label ?? []).map((label) => label.replace(/^'|'$/g, "")),
    };
    byCatalog.set(row.catalogId, [...(byCatalog.get(row.catalogId) ?? []), kept]);
  }

  let updated = 0;
  for (const [catalogId, catalogItems] of byCatalog) {
    await updateCatalogProducts(orgId, catalogId, catalogItems, CatalogProductTypes.PRODUCT_ITEM);
    updated += catalogItems.length;
  }
  log.info({ orgId, productId: product.id, updated }, "WooCommerce product pushed to catalog");
  return { updated };
}
