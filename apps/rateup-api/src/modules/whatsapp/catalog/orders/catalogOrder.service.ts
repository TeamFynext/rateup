import prisma from "../../../../utils/prisma.js";
import { OrderPaginateSchema } from "./catalogOrder.schema.js";

export async function getWaCatalogOrders(
  catalogId: string,
  filter: OrderPaginateSchema,
) {
  const totalCount = await prisma.waCatalogOrder.count({
    where: {
      catalogId,
    },
  });
  const data = await prisma.waCatalogOrder.findMany({
    where: {
      catalogId,
    },
    include: {
      contact: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
    take: filter.limit,
    skip: filter.page * filter.limit,
  });
  return { data, totalCount };
}
