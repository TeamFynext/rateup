import { useQuery } from "@tanstack/react-query";

import type { WaCatalogOrderFilter } from "./catalogOrders.api";
import { getWaCatalogOrders } from "./catalogOrders.api";

export const useWaCatalogOrders = (
  catalogId: string | undefined,
  filter: WaCatalogOrderFilter | null = null,
) => {
  return useQuery({
    queryFn: () => getWaCatalogOrders(catalogId ?? "", filter),
    queryKey: ["waCatalogOrders", catalogId, filter],
  });
};
