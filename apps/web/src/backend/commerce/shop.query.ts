import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getShopMessages,
  getShopCollections,
  getShopDiscounts,
  getShopOrder,
  getShopOrders,
  getShopAdReport,
  getShopMessageCost,
  getShopOverview,
  getShopSetup,
  getShopPayments,
  getShopProduct,
  getShopProducts,
  getShopShippingProviders,
  getShopStore,
  getShopStorefrontPreview,
  getStockHistory,
  type ShopOrderQuery,
  type ShopProduct,
  type ShopProductQuery,
} from "./shop.api";

/** Every shop query key starts with "shop", so one invalidation refreshes the lot. */
export const shopKeys = {
  all: ["shop"] as const,
  store: () => ["shop", "store"] as const,
  overview: (range: { from?: string; to?: string }) => ["shop", "overview", range] as const,
  messageCost: (range: { from?: string; to?: string }) => ["shop", "message-cost", range] as const,
  adReport: (range: { from?: string; to?: string }) => ["shop", "ad-report", range] as const,
  products: (query: ShopProductQuery) => ["shop", "products", query] as const,
  product: (id: string) => ["shop", "product", id] as const,
  collections: () => ["shop", "collections"] as const,
  orders: (query: ShopOrderQuery) => ["shop", "orders", query] as const,
  order: (id: string) => ["shop", "order", id] as const,
  discounts: () => ["shop", "discounts"] as const,
  payments: () => ["shop", "payments"] as const,
  shippingProviders: () => ["shop", "shipping-providers"] as const,
  messages: () => ["shop", "messages"] as const,
};

export const useShopMessages = () =>
  useQuery({ queryKey: shopKeys.messages(), queryFn: getShopMessages });

export const useShopStore = () => useQuery({ queryKey: shopKeys.store(), queryFn: getShopStore });

export const useShopOverview = (range: { from?: string; to?: string }) =>
  useQuery({ queryKey: shopKeys.overview(range), queryFn: () => getShopOverview(range) });

export const useShopMessageCost = (range: { from?: string; to?: string }) =>
  useQuery({ queryKey: shopKeys.messageCost(range), queryFn: () => getShopMessageCost(range) });
export const useShopAdReport = (range: { from?: string; to?: string }) =>
  useQuery({ queryKey: shopKeys.adReport(range), queryFn: () => getShopAdReport(range) });

export const useShopProducts = (query: ShopProductQuery, enabled = true) =>
  useQuery({
    queryKey: shopKeys.products(query),
    queryFn: () => getShopProducts(query),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useShopProduct = (id: string | undefined) =>
  useQuery({
    queryKey: shopKeys.product(id ?? ""),
    queryFn: () => getShopProduct(id ?? ""),
    enabled: Boolean(id),
  });

export const useShopCollections = () =>
  useQuery({ queryKey: shopKeys.collections(), queryFn: getShopCollections });

export const useShopOrders = (query: ShopOrderQuery, enabled = true) =>
  useQuery({
    queryKey: shopKeys.orders(query),
    queryFn: () => getShopOrders(query),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useShopOrder = (id: string | undefined) =>
  useQuery({
    queryKey: shopKeys.order(id ?? ""),
    queryFn: () => getShopOrder(id ?? ""),
    enabled: Boolean(id),
  });

export const useShopDiscounts = () =>
  useQuery({ queryKey: shopKeys.discounts(), queryFn: getShopDiscounts });

export const useShopPayments = () =>
  useQuery({ queryKey: shopKeys.payments(), queryFn: getShopPayments });

export const useShopShippingProviders = () =>
  useQuery({ queryKey: shopKeys.shippingProviders(), queryFn: getShopShippingProviders });

/** For mutations: refresh everything shop-shaped after a change. */
export function useInvalidateShop() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: shopKeys.all });
}

export const useShopStockHistory = (variantId: string, enabled: boolean) =>
  useQuery({
    queryKey: ["shop", "stock-history", variantId] as const,
    queryFn: () => getStockHistory(variantId),
    enabled,
  });

/**
 * The setup checklist. It only comes with the overview, so this asks for the API's default
 * range under one fixed key that the sidebar, the setup page and the index redirect share.
 */
export const useShopSetup = (enabled = true) =>
  useQuery({
    queryKey: ["shop", "setup"] as const,
    queryFn: getShopSetup,
    enabled,
  });

export const useShopStorefrontPreview = () =>
  useQuery({
    queryKey: ["shop", "storefront-preview"] as const,
    queryFn: getShopStorefrontPreview,
  });

/** Meta usually settles a publish within seconds; poll only while something is still on its way. */
const SYNC_POLL_MS = 4000;
const isSyncing = (products: readonly Pick<ShopProduct, "metaSyncStatus">[] | undefined) =>
  products?.some((p) => p.metaSyncStatus === "SYNCING") ?? false;

/** `useShopProducts` that keeps refreshing while any listed product is SYNCING. */
export const useShopProductsWhileSyncing = (query: ShopProductQuery, enabled = true) =>
  useQuery({
    queryKey: shopKeys.products(query),
    queryFn: () => getShopProducts(query),
    placeholderData: keepPreviousData,
    enabled,
    refetchInterval: (q) => (isSyncing(q.state.data?.items) ? SYNC_POLL_MS : false),
  });

/** `useShopProduct` that keeps refreshing while the product is SYNCING. */
export const useShopProductWhileSyncing = (id: string | undefined) =>
  useQuery({
    queryKey: shopKeys.product(id ?? ""),
    queryFn: () => getShopProduct(id ?? ""),
    enabled: Boolean(id),
    refetchInterval: (q) => (q.state.data && isSyncing([q.state.data]) ? SYNC_POLL_MS : false),
  });
