import { randomBytes } from "node:crypto";
import { sellableWhere } from "./checkoutVia.js";

import type {
  Prisma,
  ShopProductStatus,
  ShopVariant,
} from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { csvCell } from "../../../utils/spreadsheet.js";
import { enqueueCatalogPublish } from "../../../workers/bullmq/queues/shop.queue.js";
import { notFound, ShopError } from "./shop.errors.js";
import type { ShopProductOption, ShopVariantOptionValues } from "./shop.types.js";
import { slugify } from "./store.service.js";

export interface VariantInput {
  id?: string;
  title?: string;
  optionValues?: ShopVariantOptionValues | null;
  sku?: string | null;
  price: number;
  compareAtPrice?: number | null;
  trackInventory?: boolean;
  stock?: number;
  lowStockAt?: number | null;
  allowBackorder?: boolean;
  imageUrl?: string | null;
  weightGrams?: number | null;
  /** Set only by imports, so an item keeps the id its catalog or store already knows it by. */
  retailerId?: string;
}

export interface ProductInput {
  title: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  productUrl?: string | null;
  images?: string[];
  status?: ShopProductStatus;
  options?: ShopProductOption[] | null;
  showOnWhatsapp?: boolean;
  showOnInstagram?: boolean;
  showOnFacebook?: boolean;
  showOnStorefront?: boolean;
  loyaltyMultiplier?: number;
  collectionIds?: string[];
  variants: VariantInput[];
}

export interface ProductListQuery {
  status?: ShopProductStatus;
  search?: string;
  collectionId?: string;
  filter?: "low_stock" | "sold_out" | "sync_errors";
  channel?: "whatsapp" | "instagram" | "storefront";
  retailerIds?: string[];
  sellable?: "1";
  page?: number;
  limit?: number;
}

export const productInclude = {
  variants: { orderBy: { position: "asc" } },
  collections: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ShopProductInclude;

/** The id Meta knows a variant by: its SKU when the store has one free, else a generated one. */
async function retailerIdFor(storeId: string, sku: string | null | undefined, exceptId?: string) {
  if (sku) {
    const clash = await prisma.shopVariant.findFirst({
      where: { storeId, retailerId: sku, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      select: { id: true },
    });
    if (!clash) return sku;
  }
  return `ru_${randomBytes(5).toString("hex")}`;
}

function variantData(v: VariantInput, position: number) {
  return {
    title: v.title?.trim() || "Default",
    optionValues: v.optionValues ?? undefined,
    sku: v.sku?.trim() || null,
    price: v.price,
    compareAtPrice: v.compareAtPrice ?? null,
    // A product saved without a count is not "0 in stock": it is simply not counted.
    trackInventory: v.trackInventory ?? (v.stock !== undefined && v.stock !== null),
    lowStockAt: v.lowStockAt ?? null,
    allowBackorder: v.allowBackorder ?? false,
    imageUrl: v.imageUrl ?? null,
    weightGrams: v.weightGrams ?? null,
    position,
  };
}

function validate(input: ProductInput) {
  if (!input.title?.trim()) throw new ShopError("INVALID", "A product needs a name");
  if (!input.variants?.length) throw new ShopError("INVALID", "A product needs at least one price");
  for (const v of input.variants) {
    if (!(v.price >= 0)) throw new ShopError("INVALID", "Prices cannot be negative");
    if (v.compareAtPrice != null && v.compareAtPrice < v.price)
      throw new ShopError("INVALID", "The compare-at price must be higher than the price");
  }
}

export async function listProducts(storeId: string, q: ProductListQuery) {
  const page = q.page ?? 0;
  const limit = Math.min(q.limit ?? 25, 100);
  const sellable = q.sellable
    ? sellableWhere(
        await prisma.shopStore.findUniqueOrThrow({
          where: { id: storeId },
          select: { checkoutVia: true },
        }),
      )
    : {};
  const where: Prisma.ShopProductWhereInput = {
    storeId,
    ...sellable,
    status: q.status ?? { not: "ARCHIVED" },
    ...(q.search
      ? {
          OR: [
            { title: { contains: q.search, mode: "insensitive" } },
            { variants: { some: { sku: { contains: q.search, mode: "insensitive" } } } },
          ],
        }
      : {}),
    ...(q.collectionId ? { collections: { some: { id: q.collectionId } } } : {}),
    ...(q.channel === "whatsapp" ? { showOnWhatsapp: true } : {}),
    ...(q.channel === "instagram" ? { showOnInstagram: true } : {}),
    ...(q.channel === "storefront" ? { showOnStorefront: true } : {}),
    ...(q.filter === "sold_out"
      ? { variants: { every: { trackInventory: true, stock: { lte: 0 } } } }
      : {}),
    ...(q.filter === "sync_errors" ? { metaSyncStatus: "REJECTED" } : {}),
    ...(q.retailerIds?.length
      ? { AND: [{ variants: { some: { retailerId: { in: q.retailerIds } } } }] }
      : {}),
  };

  if (q.filter === "low_stock") {
    // Low stock compares each variant to its own threshold, which Prisma cannot express.
    const store = await prisma.shopStore.findUniqueOrThrow({
      where: { id: storeId },
      select: { lowStockThreshold: true },
    });
    const rows = await prisma.shopVariant.findMany({
      where: { storeId, trackInventory: true, stock: { gt: 0 } },
      select: { productId: true, stock: true, lowStockAt: true },
    });
    const ids = [
      ...new Set(
        rows
          .filter((r) => r.stock <= (r.lowStockAt ?? store.lowStockThreshold))
          .map((r) => r.productId),
      ),
    ];
    where.id = { in: ids };
  }

  const [items, total, counts] = await Promise.all([
    prisma.shopProduct.findMany({
      where,
      include: productInclude,
      orderBy: { updatedAt: "desc" },
      skip: page * limit,
      take: limit,
    }),
    prisma.shopProduct.count({ where }),
    prisma.shopProduct.groupBy({
      by: ["status"],
      where: { storeId },
      _count: { _all: true },
    }),
  ]);

  const sold = await soldLast30Days(items.map((p) => p.id));
  return {
    items: items.map((p) => ({ ...p, sold30d: sold.get(p.id) ?? 0 })),
    total,
    page,
    limit,
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
  };
}

async function soldLast30Days(productIds: string[]) {
  if (!productIds.length) return new Map<string, number>();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rows = await prisma.shopOrderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { in: productIds },
      order: { status: { in: ["OPEN", "COMPLETED"] }, placedAt: { gte: since } },
    },
    _sum: { quantity: true },
  });
  return new Map(rows.map((r) => [r.productId as string, r._sum.quantity ?? 0]));
}

export async function getProduct(storeId: string, id: string) {
  const product = await prisma.shopProduct.findFirst({
    where: { id, storeId },
    include: {
      ...productInclude,
      variants: {
        orderBy: { position: "asc" },
        include: { _count: { select: { stockAlerts: { where: { notifiedAt: null } } } } },
      },
    },
  });
  if (!product) throw notFound("Product");
  return product;
}

/** Collection ids come from the request; a connect by id alone would reach another store's. */
async function assertOwnCollections(storeId: string, ids: string[] | undefined) {
  const unique = [...new Set(ids ?? [])];
  if (!unique.length) return;
  const owned = await prisma.shopCollection.count({ where: { storeId, id: { in: unique } } });
  if (owned !== unique.length)
    throw new ShopError("INVALID", "One of those collections doesn't exist");
}

export async function createProduct(
  store: { id: string; orgId: string },
  input: ProductInput,
  userId?: string,
) {
  validate(input);
  await assertOwnCollections(store.id, input.collectionIds);
  const variants = [];
  for (const [i, v] of input.variants.entries()) {
    variants.push({
      ...variantData(v, i),
      storeId: store.id,
      retailerId: v.retailerId ?? (await retailerIdFor(store.id, v.sku)),
      stock: v.stock ?? 0,
    });
  }
  const product = await prisma.shopProduct.create({
    data: {
      storeId: store.id,
      orgId: store.orgId,
      title: input.title.trim(),
      description: input.description ?? null,
      brand: input.brand ?? null,
      category: input.category ?? null,
      productUrl: input.productUrl ?? null,
      images: input.images ?? [],
      status: input.status ?? "ACTIVE",
      options: input.options ?? undefined,
      showOnWhatsapp: input.showOnWhatsapp ?? true,
      showOnInstagram: input.showOnInstagram ?? true,
      showOnFacebook: input.showOnFacebook ?? false,
      showOnStorefront: input.showOnStorefront ?? true,
      loyaltyMultiplier: input.loyaltyMultiplier ?? 1,
      collections: input.collectionIds?.length
        ? { connect: input.collectionIds.map((id) => ({ id })) }
        : undefined,
      variants: { create: variants },
    },
    include: productInclude,
  });
  await recordInitialStock(product.variants, userId);
  await enqueueCatalogPublish(product.id);
  return product;
}

async function recordInitialStock(variants: ShopVariant[], userId?: string) {
  const rows = variants
    .filter((v) => v.trackInventory && v.stock !== 0)
    .map((v) => ({
      variantId: v.id,
      delta: v.stock,
      reason: "ADJUSTMENT",
      userId,
      note: "Opening stock",
    }));
  if (rows.length) await prisma.shopInventoryMovement.createMany({ data: rows });
}

/**
 * Replaces the product's fields and its variant list. Variants keep their ids (and so their
 * order history and Meta ids) when the caller sends them back; ones left out are removed.
 * Stock is not set here — it moves only through `adjustStock`, so every change is logged.
 */
export async function updateProduct(storeId: string, id: string, input: ProductInput) {
  validate(input);
  await assertOwnCollections(storeId, input.collectionIds);
  const existing = await getProduct(storeId, id);
  const keep = new Set(input.variants.map((v) => v.id).filter(Boolean) as string[]);
  const removed = existing.variants.filter((v) => !keep.has(v.id));

  await prisma.$transaction(async (tx) => {
    await tx.shopProduct.update({
      where: { id },
      data: {
        title: input.title.trim(),
        description: input.description ?? null,
        brand: input.brand ?? null,
        category: input.category ?? null,
        productUrl: input.productUrl ?? null,
        images: input.images ?? [],
        status: input.status ?? existing.status,
        options: input.options ?? undefined,
        showOnWhatsapp: input.showOnWhatsapp ?? existing.showOnWhatsapp,
        showOnInstagram: input.showOnInstagram ?? existing.showOnInstagram,
        showOnFacebook: input.showOnFacebook ?? existing.showOnFacebook,
        showOnStorefront: input.showOnStorefront ?? existing.showOnStorefront,
        loyaltyMultiplier: input.loyaltyMultiplier ?? existing.loyaltyMultiplier,
        metaSyncStatus: "SYNCING",
        collections: input.collectionIds
          ? { set: input.collectionIds.map((cid) => ({ id: cid })) }
          : undefined,
      },
    });
    if (removed.length) {
      await tx.shopVariant.deleteMany({ where: { id: { in: removed.map((v) => v.id) } } });
    }
    for (const [i, v] of input.variants.entries()) {
      if (v.id && existing.variants.some((e) => e.id === v.id)) {
        await tx.shopVariant.update({ where: { id: v.id }, data: variantData(v, i) });
      } else {
        await tx.shopVariant.create({
          data: {
            ...variantData(v, i),
            productId: id,
            storeId,
            retailerId: await retailerIdFor(storeId, v.sku),
            stock: v.stock ?? 0,
          },
        });
      }
    }
  });

  await enqueueCatalogPublish(
    id,
    removed.map((v) => v.retailerId),
  );
  return getProduct(storeId, id);
}

/** Archived, not deleted: past orders still point at it. Hidden from Meta. */
export async function archiveProduct(storeId: string, id: string) {
  const { count } = await prisma.shopProduct.updateMany({
    where: { id, storeId },
    data: { status: "ARCHIVED", metaSyncStatus: "SYNCING" },
  });
  if (!count) throw notFound("Product");
  await enqueueCatalogPublish(id);
}

export async function bulkSetStatus(storeId: string, ids: string[], status: ShopProductStatus) {
  const own = await prisma.shopProduct.findMany({
    where: { storeId, id: { in: ids } },
    select: { id: true },
  });
  const ownIds = own.map((p) => p.id);
  await prisma.shopProduct.updateMany({ where: { storeId, id: { in: ownIds } }, data: { status } });
  await Promise.all(ownIds.map((id) => enqueueCatalogPublish(id)));
}

// ─── Stock ───────────────────────────────────────────────────────────────────

export type StockReason = "ORDER" | "CANCEL" | "RETURN" | "ADJUSTMENT" | "SYNC";

/**
 * Moves a variant's stock by `delta` and logs it. Returns the variant before and after, so
 * the caller can tell when it came back in stock (notify waiting customers) or ran out (hide
 * it from chat catalogs).
 */
export async function adjustStock(
  tx: Prisma.TransactionClient,
  variantId: string,
  delta: number,
  reason: StockReason,
  meta: { orderId?: string; userId?: string; note?: string } = {},
) {
  const before = await tx.shopVariant.findUniqueOrThrow({ where: { id: variantId } });
  if (!before.trackInventory || delta === 0) return { before, after: before };
  const after = await tx.shopVariant.update({
    where: { id: variantId },
    data: { stock: { increment: delta } },
  });
  await tx.shopInventoryMovement.create({
    data: { variantId, delta, reason, orderId: meta.orderId, userId: meta.userId, note: meta.note },
  });
  return { before, after };
}

/** Staff stock edit: sets an absolute count (the form shows a number, not a delta). */
export async function setStock(
  storeId: string,
  variantId: string,
  stock: number,
  userId?: string,
  note?: string,
) {
  if (!Number.isInteger(stock) || stock < 0)
    throw new ShopError("INVALID", "Stock must be 0 or more");
  const variant = await prisma.shopVariant.findFirst({ where: { id: variantId, storeId } });
  if (!variant) throw notFound("Variant");
  const { before, after } = await prisma.$transaction((tx) =>
    adjustStock(tx, variantId, stock - variant.stock, "ADJUSTMENT", { userId, note }),
  );
  await afterStockChange(before, after);
  return after;
}

/** Publishes availability changes and wakes back-in-stock subscribers. */
export async function afterStockChange(before: ShopVariant, after: ShopVariant) {
  const wasOut = before.trackInventory && before.stock <= 0;
  const isOut = after.trackInventory && after.stock <= 0;
  if (wasOut !== isOut) await enqueueCatalogPublish(after.productId);
  if (wasOut && !isOut) {
    const { notifyBackInStock } = await import("./recovery.service.js");
    await notifyBackInStock(after.id);
  }
}

export async function stockHistory(storeId: string, variantId: string) {
  const variant = await prisma.shopVariant.findFirst({ where: { id: variantId, storeId } });
  if (!variant) throw notFound("Variant");
  return prisma.shopInventoryMovement.findMany({
    where: { variantId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

// ─── Collections ─────────────────────────────────────────────────────────────

export async function listCollections(storeId: string) {
  return prisma.shopCollection.findMany({
    where: { storeId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
}

export async function upsertCollection(
  storeId: string,
  id: string | undefined,
  data: { name: string; description?: string | null; imageUrl?: string | null; position?: number },
) {
  if (!data.name?.trim()) throw new ShopError("INVALID", "A collection needs a name");
  const slug = slugify(data.name);
  if (id) {
    const { count } = await prisma.shopCollection.updateMany({
      where: { id, storeId },
      data: { ...data, slug },
    });
    if (!count) throw notFound("Collection");
    return prisma.shopCollection.findUniqueOrThrow({ where: { id } });
  }
  const clash = await prisma.shopCollection.findUnique({
    where: { storeId_slug: { storeId, slug } },
  });
  if (clash) throw new ShopError("CONFLICT", "A collection with that name already exists");
  return prisma.shopCollection.create({ data: { ...data, slug, storeId } });
}

export async function deleteCollection(storeId: string, id: string) {
  const { count } = await prisma.shopCollection.deleteMany({ where: { id, storeId } });
  if (!count) throw notFound("Collection");
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

const CSV_COLUMNS = [
  "Product",
  "Variant",
  "SKU",
  "Price",
  "Compare at",
  "Stock",
  "Status",
  "Collections",
  "Image",
  "Description",
] as const;

export async function exportProductsCsv(storeId: string): Promise<string> {
  const products = await prisma.shopProduct.findMany({
    where: { storeId, status: { not: "ARCHIVED" } },
    include: productInclude,
    orderBy: { title: "asc" },
  });
  const lines = [CSV_COLUMNS.join(",")];
  for (const p of products) {
    for (const v of p.variants) {
      lines.push(
        [
          p.title,
          v.title,
          v.sku,
          v.price,
          v.compareAtPrice,
          v.trackInventory ? v.stock : "",
          p.status,
          p.collections.map((c) => c.name).join("; "),
          v.imageUrl ?? p.images[0] ?? "",
          p.description,
        ]
          .map((cell) => csvCell(cell === null || cell === undefined ? cell : String(cell)))
          .join(","),
      );
    }
  }
  return lines.join("\n");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/**
 * Imports the export's own format: one row per variant, rows of a product grouped by name.
 * Existing products (matched by name) are left alone and reported, so an import never edits
 * what a merchant already has.
 */
export async function importProductsCsv(
  store: { id: string; orgId: string },
  text: string,
  userId?: string,
) {
  // Our export prefixes formula-like cells with ' so a spreadsheet shows them as text;
  // reading our own file back takes the mark off again.
  const [header, ...rows] = parseCsv(text).map((row) =>
    row.map((cell) => (/^'[=+\-@\t\r]/.test(cell) ? cell.slice(1) : cell)),
  );
  if (!header) throw new ShopError("INVALID", "The file is empty");
  const col = (name: (typeof CSV_COLUMNS)[number]) =>
    header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const idx = Object.fromEntries(CSV_COLUMNS.map((c) => [c, col(c)])) as Record<
    (typeof CSV_COLUMNS)[number],
    number
  >;
  if (idx.Product < 0 || idx.Price < 0)
    throw new ShopError("INVALID", "The file needs at least Product and Price columns");

  const groups = new Map<string, string[][]>();
  for (const r of rows) {
    const name = r[idx.Product]?.trim();
    if (!name) continue;
    groups.set(name, [...(groups.get(name) ?? []), r]);
  }

  const collections = await listCollections(store.id);
  const created: string[] = [];
  const skipped: { product: string; reason: string }[] = [];
  for (const [title, group] of groups) {
    const exists = await prisma.shopProduct.findFirst({
      where: { storeId: store.id, title, status: { not: "ARCHIVED" } },
      select: { id: true },
    });
    if (exists) {
      skipped.push({ product: title, reason: "A product with this name already exists" });
      continue;
    }
    const get = (r: string[], c: (typeof CSV_COLUMNS)[number]) =>
      idx[c] >= 0 ? (r[idx[c]] ?? "").trim() : "";
    try {
      const first = group[0];
      const collectionNames = get(first, "Collections")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      const collectionIds: string[] = [];
      for (const name of collectionNames) {
        const found = collections.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (found) collectionIds.push(found.id);
        else {
          const made = await upsertCollection(store.id, undefined, { name });
          collections.push({ ...made, _count: { products: 0 } });
          collectionIds.push(made.id);
        }
      }
      const status = get(first, "Status").toUpperCase();
      await createProduct(
        store,
        {
          title,
          description: get(first, "Description") || null,
          images: get(first, "Image") ? [get(first, "Image")] : [],
          status: status === "DRAFT" ? "DRAFT" : "ACTIVE",
          collectionIds,
          variants: group.map((r) => {
            const stock = get(r, "Stock");
            const compare = get(r, "Compare at");
            return {
              title: get(r, "Variant") || "Default",
              sku: get(r, "SKU") || null,
              price: Number(get(r, "Price")),
              compareAtPrice: compare ? Number(compare) : null,
              trackInventory: stock !== "",
              stock: stock === "" ? 0 : Math.max(0, Math.floor(Number(stock) || 0)),
              imageUrl: get(r, "Image") || null,
            };
          }),
        },
        userId,
      );
      created.push(title);
    } catch (err) {
      skipped.push({ product: title, reason: err instanceof Error ? err.message : "Invalid row" });
    }
  }
  return { created: created.length, skipped };
}

/** Variants by Meta retailer id, for a cart sent from a WhatsApp or Instagram catalog. */
export async function variantsByRetailerIds(storeId: string, retailerIds: string[]) {
  return prisma.shopVariant.findMany({
    where: { storeId, retailerId: { in: retailerIds } },
    include: { product: { include: { collections: { select: { id: true } } } } },
  });
}
