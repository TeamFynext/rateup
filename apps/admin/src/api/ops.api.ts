import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { api, API_URL } from "./client";
import type { IsoDate } from "./types";

export interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  destructive: boolean;
  /** Applying queues it for the background worker, which runs it until it finishes. */
  background: boolean;
}

export type BackgroundRunState = "queued" | "running" | "finished" | "failed" | "stopped";

/** A background run of a task, as the worker reports it round by round. */
export interface BackgroundRun {
  taskId: string;
  state: BackgroundRunState;
  /** Rounds finished so far. */
  rounds: number;
  /** When the round in progress began; null between rounds. */
  roundStartedAt: IsoDate | null;
  /** Numeric details summed over every round. */
  totals: Record<string, number>;
  summary: string | null;
  lines: string[];
  error: string | null;
  stopRequested: boolean;
  startedBy: string | null;
  queuedAt: IsoDate;
  updatedAt: IsoDate;
  finishedAt: IsoDate | null;
}

export type ApplyResult = TaskResult | { background: true; run: BackgroundRun };

export const isActiveRun = (run: BackgroundRun | null | undefined) =>
  run?.state === "queued" || run?.state === "running";

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

/**
 * Fetched once; after that {@link useMaintenanceRunSocket} writes each update the worker
 * pushes straight into this cache entry, so nothing polls.
 */
export const backgroundRunQueryOptions = (taskId: string) =>
  queryOptions({
    queryKey: ["staff", "ops", "maintenance", "run", taskId],
    queryFn: async () =>
      (await api.get<{ data: BackgroundRun | null }>(`/ops/maintenance/tasks/${taskId}/run`)).data
        .data,
    staleTime: Infinity,
  });

const RECONNECT_MAX_MS = 30_000;

function maintenanceSocketUrl() {
  const base = new URL(`${API_URL || window.location.origin}/api/staff/ops/maintenance/ws`);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  return base.toString();
}

/**
 * Keeps one socket open while the Update Center is on screen and puts every background run
 * update into the query cache. The staff session cookie authenticates it like any request.
 * The API closes it every few minutes to re-check the session; it reconnects with backoff
 * and refetches the runs on each reconnect, in case an update was missed while it was down.
 */
export function useMaintenanceRunSocket() {
  const queryClient = useQueryClient();
  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let closed = false;
    let opened = false;

    const connect = () => {
      socket = new WebSocket(maintenanceSocketUrl());
      socket.onopen = () => {
        if (opened || attempt > 0) {
          void queryClient.invalidateQueries({ queryKey: ["staff", "ops", "maintenance", "run"] });
        }
        opened = true;
        attempt = 0;
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as {
            type?: string;
            run?: BackgroundRun;
          };
          if (message.type === "maintenance.run" && message.run) {
            queryClient.setQueryData(
              backgroundRunQueryOptions(message.run.taskId).queryKey,
              message.run,
            );
          }
        } catch {
          // Not ours; ignore.
        }
      };
      socket.onclose = () => {
        if (closed) return;
        const delay = Math.min(RECONNECT_MAX_MS, 1_000 * 2 ** attempt);
        attempt++;
        retry = setTimeout(connect, delay);
      };
    };
    connect();

    return () => {
      closed = true;
      clearTimeout(retry);
      socket?.close();
    };
  }, [queryClient]);
}

/** Stops a background run after its current round; applying again carries on from there. */
export function useStopTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) =>
      (await api.post<{ data: BackgroundRun }>(`/ops/maintenance/tasks/${taskId}/stop`, {})).data
        .data,
    onSuccess: (run, taskId) =>
      queryClient.setQueryData(backgroundRunQueryOptions(taskId).queryKey, run),
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

/**
 * The real run. Needs the task id typed back and a reason. Refreshes nothing by itself: what a task
 * touches is its own business, so the caller invalidates.
 */
export function useApplyTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, ...body }: { taskId: string; confirm: string; reason: string }) =>
      (await api.post<{ data: ApplyResult }>(`/ops/maintenance/tasks/${taskId}/apply`, body)).data
        .data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

function useOpsMutation<TInput, TResult = unknown>(send: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff", "ops"] }),
        queryClient.invalidateQueries({ queryKey: ["staff", "access", "audit"] }),
      ]);
    },
  });
}

export const useAddReferral = () =>
  useOpsMutation((input: { name: string; email: string; reason: string }) =>
    api.post("/ops/referrals", input),
  );

export const useDeleteReferral = () =>
  useOpsMutation(({ id, reason }: { id: string; reason: string }) =>
    api.delete(`/ops/referrals/${id}`, { data: { reason } }),
  );

export const useUnlinkShopify = () =>
  useOpsMutation(({ id, reason }: { id: string; reason: string }) =>
    api.delete(`/ops/shopify/${id}`, { data: { reason } }),
  );

/** One survey on one team: where fake responses can be pointed. */
export interface SurveyTarget {
  id: string;
  survey: { id: string; title: string; type: string };
  team: { id: string; name: string };
  responses: number;
}

export const surveyTargetsQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: ["staff", "ops", "test-data", "surveys", orgId],
    queryFn: async () =>
      (await api.get<{ data: SurveyTarget[] }>("/ops/test-data/surveys", { params: { orgId } }))
        .data.data,
    enabled: orgId.length > 0,
  });

export const useFakeResponses = () =>
  useOpsMutation(async (input: { surveyTeamMapId: string; batchSize: number; reason: string }) => {
    const { data } = await api.post<{ data: { generated: number } }>(
      "/ops/test-data/responses",
      input,
    );
    return data.data;
  });

export const useFakeInbox = () =>
  useOpsMutation(
    async (input: {
      orgId: string;
      numberOfContacts: number;
      messagesPerContact: number;
      reason: string;
    }) => {
      const { data } = await api.post<{ data: { queued: number } }>("/ops/test-data/inbox", input);
      return data.data;
    },
  );
