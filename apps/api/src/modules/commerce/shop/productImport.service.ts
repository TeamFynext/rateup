import type { ShopStore } from "../../../../generated/prisma/client.js";
import { IntegratedApps } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import type { CatalogProductCoreInput } from "../../whatsapp/catalog/products/product.schema.js";
import { getWaSettings } from "../../whatsapp/settings/wa_settings.service.js";
import { callMetaApi } from "../../whatsapp/wa_axios.js";
import { createProduct, type VariantInput } from "./products.service.js";
import { round2, toNumber } from "./pricing.js";
import { defaultCheckoutVia } from "./externalCheckout.service.js";
import { ShopError } from "./shop.errors.js";
import {
  fetchStoreItems,
  mirrorConnectedStore,
  splitTitle,
  type StoreSource,
} from "./storeSync.service.js";

/**
 * Bringing products in from where a merchant already keeps them. A Meta catalog or a
 * Shopify/WooCommerce store can be copied once, so the products become RateUp's to edit; a
 * connected store can instead stay the source of truth, which is the mirror in storeSync.
 * Every copied variant keeps the id its source knows it by, so carts sent from that catalog
 * find it and publishing it back updates the same Meta item rather than adding a second.
 */

export type ImportSource = "meta" | StoreSource;

const MODE_OF: Record<StoreSource, "SHOPIFY" | "WOOCOMMERCE"> = {
  shopify: "SHOPIFY",
  woocommerce: "WOOCOMMERCE",
};
const META_PAGE = 100;
const META_MAX_ITEMS = 5000;
const META_FIELDS = [
  "id",
  "retailer_id",
  "retailer_product_group_id",
  "name",
  "description",
  "brand",
  "url",
  "image_url",
  "additional_image_urls",
  "price",
  "sale_price",
  "currency",
  "availability",
  "inventory",
  "color",
  "size",
].join(",");

interface Skip {
  product: string;
  reason: string;
}
export interface ImportResult {
  source: ImportSource;
  created: number;
  updated: number;
  skipped: Skip[];
}

async function connected(orgId: string, name: string) {
  const row = await prisma.integration.findFirst({
    where: { orgId, name, active: true },
    select: { id: true },
  });
  return Boolean(row);
}

/** What the import dialog can offer this store, and why an option is unavailable. */
export async function importSources(
  store: Pick<ShopStore, "id" | "orgId" | "mode" | "metaCatalogId">,
) {
  const [ownProducts, shopify, woocommerce, catalogs] = await Promise.all([
    prisma.shopProduct.count({ where: { storeId: store.id, externalSource: null } }),
    connected(store.orgId, IntegratedApps.shopify),
    connected(store.orgId, IntegratedApps.woocommerce),
    prisma.whatsappCatalog.findMany({
      where: { orgId: store.orgId },
      select: { catalogId: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const catalog = catalogs.find((c) => c.catalogId === store.metaCatalogId);
  return {
    mode: store.mode,
    ownProducts,
    meta: {
      catalogId: store.metaCatalogId ? (catalog?.catalogId ?? store.metaCatalogId) : null,
      catalogName: catalog?.name ?? null,
      // The connected one first, so the picker defaults to it.
      catalogs: [...catalogs].sort(
        (a, b) =>
          Number(b.catalogId === store.metaCatalogId) - Number(a.catalogId === store.metaCatalogId),
      ),
    },
    shopify: { connected: shopify },
    woocommerce: { connected: woocommerce },
  };
}

export async function importProducts(
  store: ShopStore,
  input: { source: ImportSource; keepInSync?: boolean; catalogId?: string },
  userId?: string,
): Promise<ImportResult> {
  if (input.source === "meta") return importFromMeta(store, input.catalogId, userId);
  const source = input.source;
  const mode = MODE_OF[source];

  if (input.keepInSync) {
    const items = await fetchStoreItems(store.orgId, source);
    if (store.mode !== mode) {
      if (store.mode !== "NATIVE")
        throw new ShopError("INVALID", "Your store already stays in sync with another shop");
      const own = await prisma.shopProduct.count({
        where: { storeId: store.id, externalSource: null },
      });
      if (own)
        throw new ShopError(
          "INVALID",
          "Your store has its own products, so it can't follow another shop. Copy the products in instead.",
        );
      // Following the store means selling at its prices, so in its currency.
      const currency = items.find((i) => i.currencyCode)?.currencyCode?.toUpperCase();
      store = await prisma.shopStore.update({
        where: { id: store.id },
        data: {
          mode,
          checkoutVia: defaultCheckoutVia(mode),
          ...(currency && { currency }),
        },
      });
    }
    const mirrored = await mirrorConnectedStore(store, items);
    return {
      source,
      created: mirrored.created,
      updated: mirrored.updated,
      skipped: mirrored.skipped
        ? [{ product: `${mirrored.skipped.count} products`, reason: mirrored.skipped.reason }]
        : [],
    };
  }

  if (store.mode !== "NATIVE")
    throw new ShopError(
      "INVALID",
      "Your products already come from your online store; sync it instead",
    );
  const items = await fetchStoreItems(store.orgId, source);
  return createFromItems(store, source, groupItems(items), userId);
}

/** One product per item group, in the order the source listed them. */
function groupItems<T extends { retailer_id: string; item_group_id?: string | null }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.item_group_id || item.retailer_id;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()];
}

async function createFromItems(
  store: ShopStore,
  source: ImportSource,
  groups: CatalogProductCoreInput[][],
  userId?: string,
): Promise<ImportResult> {
  const taken = new Set(
    (
      await prisma.shopVariant.findMany({
        where: { storeId: store.id, retailerId: { in: groups.flat().map((i) => i.retailer_id) } },
        select: { retailerId: true },
      })
    ).map((v) => v.retailerId),
  );
  let created = 0;
  const skipped: Skip[] = [];
  for (const group of groups) {
    const fresh = group.filter((i) => !taken.has(i.retailer_id));
    const first = group[0];
    const { base } = splitTitle(first.title, group.length);
    if (!fresh.length) {
      skipped.push({ product: base, reason: "Already in your products" });
      continue;
    }
    const currency = first.currencyCode?.toUpperCase();
    if (currency && currency !== store.currency.toUpperCase()) {
      skipped.push({
        product: base,
        reason: `Priced in ${currency}; your store sells in ${store.currency}`,
      });
      continue;
    }
    const images = [
      ...new Set(fresh.flatMap((i) => (i.image ?? []).map((img) => img.url)).filter(Boolean)),
    ].slice(0, 10);
    try {
      await createProduct(
        store,
        {
          title: base.slice(0, 150),
          description: first.description || null,
          brand: first.brand || null,
          productUrl: first.link || null,
          images,
          status: fresh.every((i) => i.availability === "discontinued") ? "DRAFT" : "ACTIVE",
          variants: fresh.map((item) => toVariant(item, group.length)),
        },
        userId,
      );
      created++;
    } catch (err) {
      skipped.push({ product: base, reason: err instanceof Error ? err.message : "Invalid item" });
    }
  }
  log.info({ orgId: store.orgId, source, created, skipped: skipped.length }, "Products imported");
  return { source, created, updated: 0, skipped };
}

function toVariant(
  item: CatalogProductCoreInput & { inventory?: number | null },
  siblings: number,
): VariantInput {
  const original = toNumber(item.price);
  const sale = item.sale_price === undefined ? original : toNumber(item.sale_price);
  const price = round2(Math.min(sale, original) || original);
  const label = [item.color, item.size].filter(Boolean).join(" / ");
  // The source's count when it has one; a plain "out of stock" is 0, otherwise not counted.
  const counted = typeof item.inventory === "number";
  const soldOut = item.availability === "out of stock";
  return {
    retailerId: item.retailer_id,
    title: (siblings > 1 && label) || splitTitle(item.title, siblings).variant,
    price,
    compareAtPrice: original > price ? round2(original) : null,
    trackInventory: counted || soldOut,
    stock: counted ? Math.max(0, item.inventory!) : 0,
    imageUrl: item.image?.[0]?.url ?? null,
  };
}

/**
 * Meta formats prices for display ("$1,299.00", "1.299,00 €"), so the amount is read back
 * out of the text: the last separator followed by one or two digits is the decimal point.
 */
export function parseMetaPrice(text: string | null | undefined): number | null {
  const raw = (text ?? "").replace(/[^\d.,]/g, "");
  if (!/\d/.test(raw)) return null;
  const m = raw.match(/^(.*?)[.,](\d{1,2})$/);
  const whole = (m ? m[1] : raw).replace(/[.,]/g, "");
  const value = Number(m ? `${whole}.${m[2]}` : whole);
  return Number.isFinite(value) ? value : null;
}

interface MetaItem {
  id: string;
  retailer_id: string;
  retailer_product_group_id?: string;
  name?: string;
  description?: string;
  brand?: string;
  url?: string;
  image_url?: string;
  additional_image_urls?: string[];
  price?: string;
  sale_price?: string;
  currency?: string;
  availability?: string;
  inventory?: number;
  color?: string;
  size?: string;
}

export function metaItemToCatalogItem(item: MetaItem) {
  const price = parseMetaPrice(item.price);
  if (price === null) return null;
  const sale = parseMetaPrice(item.sale_price);
  return {
    retailer_id: item.retailer_id,
    item_group_id: item.retailer_product_group_id ?? null,
    title: item.name ?? item.retailer_id,
    description: item.description ?? "",
    brand: item.brand ?? "",
    link: item.url ?? "",
    image: [item.image_url, ...(item.additional_image_urls ?? [])]
      .filter((url): url is string => Boolean(url))
      .map((url) => ({ url })),
    price,
    ...(sale !== null && sale > 0 ? { sale_price: sale } : {}),
    currencyCode: item.currency ?? "",
    availability: item.availability ?? "in stock",
    inventory: item.inventory ?? null,
    color: item.color,
    size: item.size,
  } as unknown as CatalogProductCoreInput & { inventory: number | null };
}

/**
 * Any of the business's catalogs can be read from, but the connected one stays connected:
 * products copied from another catalog are published to the connected one like any new product.
 */
async function importFromMeta(
  store: ShopStore,
  catalogId: string | undefined,
  userId?: string,
): Promise<ImportResult> {
  if (store.mode !== "NATIVE")
    throw new ShopError(
      "INVALID",
      "Your products already come from your online store; sync it instead",
    );
  if (!store.metaCatalogId)
    throw new ShopError("INVALID", "Connect a catalog first in Commerce → Settings → Store");
  const from = catalogId ?? store.metaCatalogId;
  if (from !== store.metaCatalogId) {
    const known = await prisma.whatsappCatalog.findFirst({
      where: { orgId: store.orgId, catalogId: from },
      select: { catalogId: true },
    });
    if (!known)
      throw new ShopError("INVALID", "That catalog isn't one of your business's catalogs");
  }
  const settings = await getWaSettings(store.orgId);
  if (!settings?.accessToken) throw new ShopError("INVALID", "Connect a WhatsApp number first");

  const items: MetaItem[] = [];
  let after: string | undefined;
  do {
    const res = await callMetaApi(`/${from}/products`, "GET", null, null, {
      params: {
        access_token: settings.accessToken,
        fields: META_FIELDS,
        limit: META_PAGE,
        ...(after ? { after } : {}),
      },
    });
    const page = (res?.data?.data ?? []) as MetaItem[];
    items.push(...page);
    after = res?.data?.paging?.next ? res.data.paging.cursors?.after : undefined;
  } while (after && items.length < META_MAX_ITEMS);

  const skipped: Skip[] = [];
  const usable = [];
  for (const item of items) {
    const parsed = metaItemToCatalogItem(item);
    if (parsed) usable.push(parsed);
    else
      skipped.push({ product: item.name ?? item.retailer_id, reason: "Meta has no price for it" });
  }
  const result = await createFromItems(store, "meta", groupItems(usable), userId);
  return { ...result, skipped: [...skipped, ...result.skipped] };
}
