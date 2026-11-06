import { useCommerceOrders } from "@/backend/commerce/commerce.query";
import { useWaCatalogProducts } from "@/backend/whatsapp/catalog/products/products.query";

import { useCommerce } from "../CommerceContext";

/**
 * Whether the org used the older WhatsApp-catalog tools: products kept straight in the Meta
 * catalog, or orders from the catalog cart. Only then does Settings show the Legacy tab.
 */
export function useLegacyCatalog() {
  const { catalogId } = useCommerce();
  const products = useWaCatalogProducts(catalogId);
  const orders = useCommerceOrders({ page: 0, limit: 1 });
  const hasProducts = (products.data?.length ?? 0) > 0;
  const hasOrders = (orders.data?.totalCount ?? 0) > 0;
  return {
    hasLegacy: hasProducts || hasOrders,
    isPending: orders.isPending || (Boolean(catalogId) && products.isPending),
  };
}
