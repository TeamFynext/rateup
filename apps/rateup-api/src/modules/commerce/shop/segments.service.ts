import prisma from "../../../utils/prisma.js";
import { toNumber } from "./pricing.js";
import { ShopError } from "./shop.errors.js";

/**
 * Shoppers by what they bought, saved as an ordinary contact group so campaigns, drips and
 * automations target them with the audience picker they already have. A saved group is a
 * snapshot; saving again under the same name refreshes it.
 */
export interface SegmentCriteria {
  productIds?: string[];
  collectionIds?: string[];
  minOrders?: number;
  minSpent?: number;
  /** Bought in the last N days. */
  orderedWithinDays?: number;
  /** Have not ordered in the last N days (lapsed customers). */
  notOrderedForDays?: number;
  channel?: "WHATSAPP" | "INSTAGRAM" | "MESSENGER" | "STOREFRONT";
}

export async function segmentContacts(storeId: string, c: SegmentCriteria) {
  const orders = await prisma.shopOrder.findMany({
    where: {
      storeId,
      contactId: { not: null },
      paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] },
      ...(c.channel ? { channel: c.channel } : {}),
    },
    select: {
      contactId: true,
      total: true,
      paidAt: true,
      items: {
        select: {
          productId: true,
          variant: { select: { product: { select: { collections: { select: { id: true } } } } } },
        },
      },
    },
  });

  const byContact = new Map<
    string,
    { orders: number; spent: number; last: number; products: Set<string>; collections: Set<string> }
  >();
  for (const o of orders) {
    const id = o.contactId!;
    const row = byContact.get(id) ?? {
      orders: 0,
      spent: 0,
      last: 0,
      products: new Set(),
      collections: new Set(),
    };
    row.orders++;
    row.spent += toNumber(o.total);
    row.last = Math.max(row.last, o.paidAt?.getTime() ?? 0);
    for (const i of o.items) {
      if (i.productId) row.products.add(i.productId);
      for (const col of i.variant?.product.collections ?? []) row.collections.add(col.id);
    }
    byContact.set(id, row);
  }

  const now = Date.now();
  const day = 86_400_000;
  return [...byContact.entries()]
    .filter(([, r]) => {
      if (c.productIds?.length && !c.productIds.some((p) => r.products.has(p))) return false;
      if (c.collectionIds?.length && !c.collectionIds.some((p) => r.collections.has(p)))
        return false;
      if (c.minOrders && r.orders < c.minOrders) return false;
      if (c.minSpent && r.spent < c.minSpent) return false;
      if (c.orderedWithinDays && now - r.last > c.orderedWithinDays * day) return false;
      if (c.notOrderedForDays && now - r.last < c.notOrderedForDays * day) return false;
      return true;
    })
    .map(([contactId]) => contactId);
}

export async function previewSegment(storeId: string, criteria: SegmentCriteria) {
  return { count: (await segmentContacts(storeId, criteria)).length };
}

export async function saveSegmentAsGroup(
  store: { id: string; orgId: string },
  input: { name: string; teamId: string; criteria: SegmentCriteria },
) {
  const team = await prisma.team.findFirst({
    where: { id: input.teamId, orgId: store.orgId },
    select: { id: true },
  });
  if (!team) throw new ShopError("NOT_FOUND", "Team not found");
  const contactIds = await segmentContacts(store.id, input.criteria);
  const group = await prisma.contactGroup.upsert({
    where: { group_name_team_id_unique: { name: input.name.trim(), teamId: team.id } },
    create: {
      name: input.name.trim(),
      teamId: team.id,
      tags: { source: "shop_segment", criteria: { ...input.criteria } },
    },
    update: { tags: { source: "shop_segment", criteria: { ...input.criteria } } },
  });
  await prisma.$transaction([
    prisma.contactGroupMap.deleteMany({ where: { contactGroupId: group.id } }),
    prisma.contactGroupMap.createMany({
      data: contactIds.map((contactId) => ({ contactId, contactGroupId: group.id })),
      skipDuplicates: true,
    }),
  ]);
  return { groupId: group.id, name: group.name, count: contactIds.length };
}
