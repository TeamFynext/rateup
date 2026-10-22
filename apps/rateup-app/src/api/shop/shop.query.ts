import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelOrder,
  confirmCod,
  createOrder,
  createShipment,
  getOrder,
  getOrders,
  getSellableProducts,
  getShopStore,
  markPaid,
  sendPaymentLink,
  sendProductsInChat,
  setFulfillment,
} from "./shop.api";
import type { OrderTab } from "./shop.type";

export const shopKeys = {
  store: () => ["shop-store"] as const,
  products: (search: string) => ["shop-products", search] as const,
  /** Without arguments, the prefix that sweeps every order list. */
  orders: (tab?: OrderTab, contactId?: string, search = "") =>
    (tab === undefined
      ? ["shop-orders"]
      : ["shop-orders", tab, contactId ?? null, search]) as readonly unknown[],
  order: (id: string) => ["shop-order", id] as const,
};

export const useShopStore = (enabled = true) =>
  useQuery({ queryKey: shopKeys.store(), queryFn: getShopStore, enabled, staleTime: 60_000 });

export const useSellableProducts = (search: string, enabled = true) =>
  useQuery({
    queryKey: shopKeys.products(search),
    queryFn: () => getSellableProducts(search),
    enabled,
    placeholderData: keepPreviousData,
  });

export const useOrders = (tab: OrderTab, contactId?: string, enabled = true, search = "") =>
  useQuery({
    queryKey: shopKeys.orders(tab, contactId, search.trim()),
    queryFn: () => getOrders({ tab, contactId, search, limit: contactId ? 5 : 50 }),
    enabled,
    placeholderData: keepPreviousData,
  });

export const useOrder = (id: string) =>
  useQuery({ queryKey: shopKeys.order(id), queryFn: () => getOrder(id), enabled: Boolean(id) });

export const useSendProducts = () => useMutation({ mutationFn: sendProductsInChat });

export const useCreateOrder = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => client.invalidateQueries({ queryKey: shopKeys.orders() }),
  });
};

/**
 * Every order action changes both the order and the lists it sits in, so each one sweeps
 * the same pair. No toasts: the detail screen reports outcomes inline, including from its
 * own modals, where a notice would render behind them.
 */
export function useOrderActions(id: string) {
  const client = useQueryClient();
  const settle = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: shopKeys.order(id) }),
      client.invalidateQueries({ queryKey: shopKeys.orders() }),
    ]);

  return {
    paymentLink: useMutation({ mutationFn: () => sendPaymentLink(id), onSuccess: settle }),
    fulfillment: useMutation({
      mutationFn: (status: "PACKED" | "DELIVERED" | "OUT_FOR_DELIVERY" | "FAILED_DELIVERY") =>
        setFulfillment(id, status),
      onSuccess: settle,
    }),
    ship: useMutation({
      mutationFn: (body: { carrier?: string | null; trackingNumber?: string | null }) =>
        createShipment(id, body),
      onSuccess: settle,
    }),
    confirmCod: useMutation({ mutationFn: () => confirmCod(id), onSuccess: settle }),
    markPaid: useMutation({
      mutationFn: (method: "cash" | "cod") => markPaid(id, method),
      onSuccess: settle,
    }),
    cancel: useMutation({
      mutationFn: (reason: string) => cancelOrder(id, reason),
      onSuccess: settle,
    }),
  };
}
