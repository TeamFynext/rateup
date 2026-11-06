import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  exportCommerceOrders,
  exportCommerceOverview,
  getCommerceChannels,
  getCommerceOrders,
  getCommerceOverview,
  getCommerceTimeseries,
  getCommerceTopProducts,
} from "./commerce.api";
import type { CommerceFilter, CommerceOrderFilter } from "./commerce.api";

export const useCommerceChannels = () =>
  useQuery({
    queryKey: ["commerceChannels"],
    queryFn: getCommerceChannels,
  });

export const useCommerceOverview = (filter: CommerceFilter) =>
  useQuery({
    queryKey: ["commerceOverview", filter],
    queryFn: () => getCommerceOverview(filter),
  });

export const useCommerceTimeseries = (
  filter: CommerceFilter & { interval?: "day" | "week" | "month" },
) =>
  useQuery({
    queryKey: ["commerceTimeseries", filter],
    queryFn: () => getCommerceTimeseries(filter),
  });

export const useCommerceTopProducts = (filter: CommerceFilter & { limit?: number }) =>
  useQuery({
    queryKey: ["commerceTopProducts", filter],
    queryFn: () => getCommerceTopProducts(filter),
  });

export const useCommerceOrders = (filter: CommerceOrderFilter) =>
  useQuery({
    queryKey: ["commerceOrders", filter],
    queryFn: () => getCommerceOrders(filter),
  });

export const useExportCommerceOrdersMutation = () =>
  useMutation({
    mutationFn: exportCommerceOrders,
    onSuccess: () => toast.success("Orders exported"),
    onError: () => toast.error("Failed to export orders"),
  });

export const useExportCommerceOverviewMutation = () =>
  useMutation({
    mutationFn: exportCommerceOverview,
    onSuccess: () => toast.success("Overview exported"),
    onError: () => toast.error("Failed to export overview"),
  });
