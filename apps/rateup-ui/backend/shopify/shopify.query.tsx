import { useQuery } from "@tanstack/react-query";
import { getProductsFromShopify } from "./shopify.api";

export const useGetProductsFromShopify = () => {
  return useQuery({
    queryKey: ["shopifyProducts"],
    queryFn: getProductsFromShopify,
  });
};
