import { useQuery } from "@tanstack/react-query";

import { getWaCatalogOrders } from "./catalogOrders.api";

export const useWaCatalogOrders = (catalogId, filter = null) => {
  const get = useQuery({
    queryFn: () => getWaCatalogOrders(catalogId, filter),
    queryKey: ["waCatalogOrders", catalogId],
  });

  return {
    get,
  };
};
