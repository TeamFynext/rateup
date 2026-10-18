import { randomBytes } from "node:crypto";

import type { Prisma, ShopStore } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { notFound, ShopError } from "./shop.errors.js";

export function slugify(input: string): string {
  return (
    input
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "shop"
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  for (let i = 0; i < 5; i++) {
    const taken = await prisma.shopStore.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
    slug = `${slugify(base).slice(0, 33)}-${randomBytes(3).toString("hex")}`;
  }
  return `shop-${randomBytes(6).toString("hex")}`;
}

/**
 * Every org has at most one store, created the first time anything asks for it. Currency and
 * the meaning of a point come from the loyalty programme when there is one, so a merchant who
 * already set those up does not set them twice.
 */
export async function getOrCreateStore(orgId: string): Promise<ShopStore> {
  const existing = await prisma.shopStore.findUnique({ where: { orgId } });
  if (existing) return existing;

  const [org, program, catalog] = await Promise.all([
    prisma.org.findUnique({ where: { id: orgId }, select: { name: true, logo: true } }),
    prisma.loyaltyProgram.findUnique({ where: { orgId }, select: { currencyCode: true } }),
    prisma.whatsappCatalog.findFirst({ where: { orgId }, select: { catalogId: true } }),
  ]);
  if (!org) throw notFound("Organisation");

  const shopify = await prisma.integration.findFirst({
    where: { orgId, name: { in: ["shopify", "woocommerce"] }, active: true },
    select: { name: true },
  });

  try {
    return await prisma.shopStore.create({
      data: {
        orgId,
        name: org.name,
        slug: await uniqueSlug(org.name),
        logoUrl: org.logo,
        currency: program?.currencyCode ?? "USD",
        metaCatalogId: catalog?.catalogId ?? null,
        mode: shopify?.name === "shopify" ? "SHOPIFY" : shopify ? "WOOCOMMERCE" : "NATIVE",
      },
    });
  } catch (err) {
    // Two first requests raced; the other one created it.
    const raced = await prisma.shopStore.findUnique({ where: { orgId } });
    if (raced) return raced;
    throw err;
  }
}

export async function getStoreById(storeId: string) {
  const store = await prisma.shopStore.findUnique({ where: { id: storeId } });
  if (!store) throw notFound("Store");
  return store;
}

export async function updateStore(orgId: string, data: Prisma.ShopStoreUpdateInput) {
  const store = await getOrCreateStore(orgId);
  if (typeof data.slug === "string") {
    const slug = slugify(data.slug);
    const taken = await prisma.shopStore.findFirst({
      where: { slug, NOT: { id: store.id } },
      select: { id: true },
    });
    if (taken) throw new ShopError("CONFLICT", "That storefront address is already taken");
    data.slug = slug;
  }
  return prisma.shopStore.update({ where: { id: store.id }, data });
}

/** Hands out the next order number atomically. */
export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  storeId: string,
): Promise<number> {
  const { orderNumberSeq } = await tx.shopStore.update({
    where: { id: storeId },
    data: { orderNumberSeq: { increment: 1 } },
    select: { orderNumberSeq: true },
  });
  return orderNumberSeq;
}

// ─── Shipping rates ──────────────────────────────────────────────────────────

export async function listShippingRates(storeId: string) {
  return prisma.shopShippingRate.findMany({
    where: { storeId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
}

export async function upsertShippingRate(
  storeId: string,
  id: string | undefined,
  data: Omit<Prisma.ShopShippingRateUncheckedCreateInput, "storeId" | "id">,
) {
  if (id) {
    const { count } = await prisma.shopShippingRate.updateMany({ where: { id, storeId }, data });
    if (!count) throw notFound("Shipping rate");
    return prisma.shopShippingRate.findUniqueOrThrow({ where: { id } });
  }
  return prisma.shopShippingRate.create({ data: { ...data, storeId } });
}

export async function deleteShippingRate(storeId: string, id: string) {
  const { count } = await prisma.shopShippingRate.deleteMany({ where: { id, storeId } });
  if (!count) throw notFound("Shipping rate");
}

/** The active rates that serve a destination; a rate with no countries serves everywhere. */
export async function ratesForDestination(storeId: string, country?: string | null) {
  const rates = await prisma.shopShippingRate.findMany({
    where: { storeId, active: true },
    orderBy: [{ position: "asc" }, { price: "asc" }],
  });
  const code = country?.toUpperCase();
  return rates.filter((r) => r.countries.length === 0 || (code && r.countries.includes(code)));
}
