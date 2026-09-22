import { queryOptions, useMutation } from "@tanstack/react-query";

import { api } from "./client";
import type { IsoDate } from "./types";

export interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  destructive: boolean;
}

export interface TaskResult {
  summary: string;
  details?: Record<string, unknown>;
  applied: boolean;
  lines: string[];
}

export interface ShopifyStore {
  id: string;
  shop: string | null;
  active: boolean;
  createdAt: IsoDate | null;
  orgId: string | null;
  orgName: string | null;
}

export interface Referral {
  id: string;
  code: string;
  link: string | null;
  name: string;
  email: string;
  visits: number;
  signups: number;
  createdAt: IsoDate;
}

export const maintenanceTasksQueryOptions = queryOptions({
  queryKey: ["staff", "ops", "maintenance"],
  queryFn: async () =>
    (await api.get<{ data: MaintenanceTask[] }>("/ops/maintenance/tasks")).data.data,
  staleTime: 10 * 60_000,
});

/** A dry run: the API reports what the task would change and writes nothing. */
export function usePreviewTask() {
  return useMutation({
    mutationFn: async (taskId: string) =>
      (await api.post<{ data: TaskResult }>(`/ops/maintenance/tasks/${taskId}/preview`, {})).data
        .data,
  });
}

export const shopifyStoresQueryOptions = queryOptions({
  queryKey: ["staff", "ops", "shopify"],
  queryFn: async () => (await api.get<{ data: ShopifyStore[] }>("/ops/shopify")).data.data,
});

export const referralsQueryOptions = queryOptions({
  queryKey: ["staff", "ops", "referrals"],
  queryFn: async () => (await api.get<{ data: Referral[] }>("/ops/referrals")).data.data,
});
