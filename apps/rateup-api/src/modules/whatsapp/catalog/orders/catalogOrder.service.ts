import prisma from "../../../../utils/prisma.js";
import { OrderPaginateSchema } from "./catalogOrder.schema.js";

export async function getWaCatalogOrders(catalogId: string, filter: OrderPaginateSchema) {
  const where: any = {
    catalogId,
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
