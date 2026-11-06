import prisma from "../../../../utils/prisma.js";
import { OrderPaginateSchema } from "./catalogOrder.schema.js";
import type { Prisma } from "../../../../../generated/prisma/client.js";

export async function getWaCatalogOrders(
  catalogId: string,
  orgId: string,
  filter: OrderPaginateSchema,
) {
  // Scoped through the owning catalog. These rows are customer data — the include below
  // pulls contact { name, phone } for every order — so an unscoped catalogId let any
  // authenticated user enumerate another org's orders and their customers' details.
  const where: Prisma.WaCatalogOrderWhereInput = {
    catalogId,
    catalog: { orgId },
  };
  if (filter.storeType) {
    where.storeType = filter.storeType;
  }

  const totalCount = await prisma.waCatalogOrder.count({
    where,
  });
  const data = await prisma.waCatalogOrder.findMany({
    where,
    include: {
      contact: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: filter.limit,
    skip: filter.page * filter.limit,
  });
  return { data, totalCount };
}
