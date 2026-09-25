import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { contactKeys } from "@/backend/campaign/contacts/contacts.keys.ts";
import { useContactsStore } from "@/store/inbox.store.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import * as api from "./pipeline.api";
import { pipelineKeys } from "./pipeline.keys";
import type {
  BulkUpdateLeadsInput,
  ForecastBucket,
  LeadDetail,
  LeadListParams,
  LeadPage,
  PipelineStats,
  CloseLeadInput,
  CreateLeadInput,
  CreatePipelineInput,
  CreateStageInput,
  CreateTaskInput,
  Lead,
  PipelineDetail,
  UpdateLeadInput,
  UpdatePipelineInput,
  UpdateStageInput,
  UpdateTaskInput,
  UpdateTeamDefaultInput,
} from "./pipeline.types";

/**
 * Keeps the inbox's stage chip in step with the board.
 *
 * The conversation list draws its chip from the row it holds in the contacts
 * store — an IndexedDB-backed cache of its own, which no `pipelineKeys`
 * invalidation reaches. So a card dragged on the board, or a stage assigned from
 * the contacts table, left the inbox showing the old column until a reload
 * refetched the list. This is the same patch the contact panel makes in the
 * other direction, applied at the mutation instead of the call site so no future
 * caller has to remember it.
 *
 * A null `stageId` clears the chip — the contact came off the board.
 */
function syncInboxStageChips(
  queryClient: QueryClient,
  contactIds: Array<string | null | undefined>,
  stageId: string | null,
) {
  const ids = contactIds.filter((id): id is string => Boolean(id));
  if (ids.length === 0) return;

  const cached = stageId ? findCachedStage(queryClient, stageId) : null;
  // Clearing is meaningful, but writing a null chip because the board simply is
  // not in cache would blank a chip the list is drawing correctly.
  if (stageId && !cached) return;
  // The chip is the contact's Leads stage; a card on any other board leaves it alone.
  if (cached && cached.boardType !== "LEADS") return;
  const stage = cached?.stage ?? null;

  const { updateContactById } = useContactsStore.getState();
  for (const contactId of ids) {
    updateContactById(contactId, (contact) => ({
      ...contact,
      stageName: stage?.name ?? null,
      stageColor: stage?.color ?? null,
    }));
  }
}

/** The colour lives on the board, not on the lead the move returns. */
function findCachedStage(queryClient: QueryClient, stageId: string) {
  const boards = queryClient.getQueriesData<PipelineDetail>({
    queryKey: ["pipeline", "detail"],
  });
  for (const [, board] of boards) {
    const stage = board?.stages.find((candidate) => candidate.id === stageId);
    if (board && stage) return { stage, boardType: board.type };
  }
  return null;
}

/**
 * The contacts behind a set of leads, read off the cached lead lists.
 *
 * Scans every cached board rather than taking a pipeline id: the close and bulk
 * mutations are called from screens that never name one.
 */
function contactIdsForLeads(queryClient: QueryClient, leadIds: string[]) {
  const found: Array<string | null> = [];
  for (const lead of cachedLeads(queryClient)) {
    if (leadIds.includes(lead.id)) found.push(lead.contactId);
  }
  return found;
}

/**
 * Every lead currently in the cache, across each column and each filter.
 *
 * The lists are paginated now, so a lead lives inside `InfiniteData.pages`
 * rather than in one array — and the same lead can sit in several cached
 * variants of a column at once. Callers looking one up take the first hit;
 * callers scanning for contacts tolerate the duplicates.
 */
function* cachedLeads(queryClient: QueryClient): Generator<Lead> {
  const lists = queryClient.getQueriesData<InfiniteData<LeadPage>>({
    queryKey: ["pipeline", "leads"],
  });
  for (const [, data] of lists) {
    for (const page of data?.pages ?? []) {
      for (const lead of page.items) yield lead;
    }
  }
}

/** The cached copy of one lead, wherever it is loaded. */
export function findCachedLead(queryClient: QueryClient, leadId: string): Lead | undefined {
  for (const lead of cachedLeads(queryClient)) {
    if (lead.id === leadId) return lead;
  }
  return undefined;
}

/** A drag knows where the card came from, which is the column to remove it from. */
export interface MoveLeadVariables {
  leadId: string;
  fromStageId: string;
  stageId: string;
  stageName?: string;
}

// ------------------------------------------------------------------- queries

/**
 * `enabled` exists for the app sidebar, which is mounted on every dashboard
 * route but only needs the pipeline switcher while the user is actually on the
 * pipeline. The page itself leaves it defaulted.
 */
export function usePipelinesQuery(enabled = true) {
  return useQuery({
    queryKey: pipelineKeys.list(),
    queryFn: api.fetchPipelines,
    enabled,
  });
}

export function usePipelineQuery(pipelineId: string | undefined) {
  return useQuery({
    queryKey: pipelineKeys.detail(pipelineId),
    queryFn: () => api.fetchPipeline(pipelineId!),
    enabled: Boolean(pipelineId),
  });
}

export function usePipelineMembersQuery(pipelineId: string | undefined) {
  return useQuery({
    queryKey: pipelineKeys.members(pipelineId),
    queryFn: () => api.fetchPipelineMembers(pipelineId!),
    enabled: Boolean(pipelineId),
  });
}

/**
 * Opts a lead list out of the app-wide `placeholderData` default.
 *
 * `providers.tsx` gives every query `placeholderData: (previous) => previous`,
 * which is right for a list whose contents do not depend on the key — it avoids
 * a flash while the same data refetches. A lead list is the opposite: the key
 * *is* the filter, so keeping the previous key's data means the board renders
 * leads that do not match the filter the user just chose, with the header
 * counting the new answer above them. Better to show the column loading.
 */
const NO_STALE_ROWS = { placeholderData: undefined } as const;

/**
 * One board column's cards.
 *
 * Each column runs its own query so the filters are applied per stage: a column
 * holding one matching lead returns that lead, however many the busy columns
 * have. The cursor is opaque and comes back from the previous page.
 */
export function useStageLeadsQuery(
  pipelineId: string | undefined,
  stageId: string,
  params: LeadListParams,
) {
  // The sidebar's stage facet narrows the board to one column. Every column
  // asks with its own `stageId`, so that facet would otherwise be overwritten
  // here and silently do nothing — the column it excludes has to answer empty
  // rather than answer for itself.
  const excluded = Boolean(params.stageId && params.stageId !== stageId);

  return useInfiniteQuery({
    queryKey: pipelineKeys.stageLeads(pipelineId, stageId, params),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.fetchLeadPage(pipelineId!, { ...params, stageId }, pageParam),
    getNextPageParam: (last: LeadPage) => last.nextCursor ?? undefined,
    enabled: Boolean(pipelineId) && !excluded,
    staleTime: 15_000,
    ...NO_STALE_ROWS,
  });
}

/** The whole board in one list — the list view's ungrouped mode. */
export function useListLeadsQuery(pipelineId: string | undefined, params: LeadListParams) {
  return useInfiniteQuery({
    queryKey: pipelineKeys.listLeads(pipelineId, params),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.fetchLeadPage(pipelineId!, params, pageParam),
    getNextPageParam: (last: LeadPage) => last.nextCursor ?? undefined,
    enabled: Boolean(pipelineId),
    staleTime: 15_000,
    ...NO_STALE_ROWS,
  });
}

/**
 * The board's counts, over every lead rather than the loaded page.
 *
 * No filters in the key: these answer "how is this board doing", so they stay
 * put while the user narrows the columns underneath them.
 */
export function usePipelineStatsQuery(pipelineId: string | undefined) {
  return useQuery<PipelineStats>({
    queryKey: pipelineKeys.stats(pipelineId),
    queryFn: () => api.fetchPipelineStats(pipelineId!),
    enabled: Boolean(pipelineId),
    staleTime: 30_000,
  });
}

export function usePipelineForecastQuery(pipelineId: string | undefined) {
  return useQuery<ForecastBucket[]>({
    queryKey: pipelineKeys.forecast(pipelineId),
    queryFn: () => api.fetchPipelineForecast(pipelineId!),
    enabled: Boolean(pipelineId),
    staleTime: 30_000,
  });
}

export function useLeadQuery(leadId: string | undefined) {
  return useQuery({
    queryKey: pipelineKeys.lead(leadId),
    queryFn: () => api.fetchLead(leadId!),
    enabled: Boolean(leadId),
  });
}

/** Teams and the board each one sends its contacts to. */
export function useTeamPipelineDefaultsQuery(enabled = true) {
  return useQuery({
    queryKey: pipelineKeys.teamDefaults(),
    queryFn: api.fetchTeamPipelineDefaults,
    enabled,
  });
}

// ----------------------------------------------------------------- mutations

/**
 * Every pipeline mutation lands here: it reports through a toast keyed by
 * action (so a burst of drags collapses into one message) and sweeps the
 * `["pipeline"]` root, which covers the board, the list and the switcher counts.
 *
 * Contacts are not swept: a lead and the contact behind it are separate records
 * now, and moving one no longer writes anything onto the other.
 */
/**
 * Both message builders take `t` rather than returning a bare string. A plain
 * `t(options.errorFallback)` inside here would translate at runtime but the key
 * is a variable, so `i18next-cli extract` never sees it and the locale files
 * never gain the entry. Passing `t` in puts a literal `t("…")` at every call
 * site, which is what the extractor reads.
 */
function usePipelineMutation<TVariables, TResult>(options: {
  mutationFn: (variables: TVariables) => Promise<TResult>;
  success?: (t: TFunction, result: TResult, variables: TVariables) => string;
  errorFallback: (t: TFunction) => string;
  toastId: string;
  /** Cache writes outside `pipelineKeys` that the blanket invalidation misses. */
  afterSuccess?: (queryClient: QueryClient, result: TResult, variables: TVariables) => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: (result, variables) => {
      options.afterSuccess?.(queryClient, result, variables);
      if (options.success) {
        toast.success(options.success(t, result, variables), { id: options.toastId });
      }
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, options.errorFallback(t)), { id: options.toastId });
    },
    onSettled: () => {
      // Sweeps every column of every board. Correct, and no flicker — React
      // Query keeps the current rows on screen while it refetches — but it does
      // refetch each loaded page. TODO: narrow to the affected column + stats,
      // the way `useMoveLeadMutation` already does.
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
    },
  });
}

export function useCreatePipelineMutation() {
  // Typed on the result, unlike the rest: the create dialog navigates to the new
  // pipeline, so it needs the id back.
  return usePipelineMutation<CreatePipelineInput, PipelineDetail>({
    mutationFn: api.createPipeline,
    success: (t, _result, variables) => t("{name} created", { name: variables.name }),
    errorFallback: (t) => t("Could not create the pipeline"),
    toastId: "pipeline-create",
  });
}

export function useUpdatePipelineMutation() {
  return usePipelineMutation<{ pipelineId: string; input: UpdatePipelineInput }, unknown>({
    mutationFn: ({ pipelineId, input }) => api.updatePipeline(pipelineId, input),
    success: (t) => t("Pipeline settings saved"),
    errorFallback: (t) => t("Could not save the pipeline settings"),
    toastId: "pipeline-update",
  });
}

export function useDeletePipelineMutation() {
  return usePipelineMutation<string, unknown>({
    mutationFn: api.deletePipeline,
    success: (t) => t("Pipeline deleted"),
    errorFallback: (t) => t("Could not delete the pipeline"),
    toastId: "pipeline-delete",
  });
}

export function useCreateStageMutation() {
  return usePipelineMutation<CreateStageInput, unknown>({
    mutationFn: api.createStage,
    success: (t, _result, variables) => t("{name} added", { name: variables.name }),
    errorFallback: (t) => t("Could not add the lead stage"),
    toastId: "pipeline-stage-create",
  });
}

export function useUpdateStageMutation() {
  return usePipelineMutation<{ stageId: string; input: UpdateStageInput }, unknown>({
    mutationFn: ({ stageId, input }) => api.updateStage(stageId, input),
    errorFallback: (t) => t("Could not save the lead stage"),
    toastId: "pipeline-stage-update",
  });
}

export function useDeleteStageMutation() {
  return usePipelineMutation<{ stageId: string; moveLeadsToStageId?: string }, unknown>({
    mutationFn: ({ stageId, moveLeadsToStageId }) => api.deleteStage(stageId, moveLeadsToStageId),
    success: (t) => t("Lead stage deleted"),
    errorFallback: (t) => t("Could not delete the lead stage"),
    toastId: "pipeline-stage-delete",
  });
}

/**
 * Reordering the board's columns.
 *
 * The only stage mutation that writes to the cache before the server answers.
 * The others change a field in place, so waiting for the refetch costs nothing
 * visible; this one moves a row the user has just dragged, and without the
 * optimistic write the row snaps back to where it was and then jumps again when
 * the refetch lands. `onSettled` still invalidates, so the server's order wins.
 */
export function useReorderStagesMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      pipelineId,
      stages,
    }: {
      pipelineId: string;
      stages: Array<{ id: string; order: number }>;
    }) => api.reorderStages(pipelineId, stages),

    onMutate: async ({ pipelineId, stages }) => {
      const key = pipelineKeys.detail(pipelineId);
      // Otherwise an in-flight detail fetch can land after this write and undo it.
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PipelineDetail>(key);
      if (!previous) return { key, previous };

      const orderById = new Map(stages.map((stage) => [stage.id, stage.order]));
      queryClient.setQueryData<PipelineDetail>(key, {
        ...previous,
        stages: previous.stages
          .map((stage) => ({ ...stage, order: orderById.get(stage.id) ?? stage.order }))
          .sort((a, b) => a.order - b.order),
      });

      return { key, previous };
    },

    onError: (error, _variables, context) => {
      // Put the old order back rather than leaving the board showing a sequence
      // the server rejected.
      if (context?.previous) queryClient.setQueryData(context.key, context.previous);
      toast.error(getApiErrorMessage(error, t("Could not reorder the lead stages")), {
        id: "pipeline-stage-reorder",
      });
    },

    onSettled: () => {
      // Sweeps every column of every board. Correct, and no flicker — React
      // Query keeps the current rows on screen while it refetches — but it does
      // refetch each loaded page. TODO: narrow to the affected column + stats,
      // the way `useMoveLeadMutation` already does.
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
    },
  });
}

export function useCreateLostReasonMutation() {
  return usePipelineMutation<{ pipelineId: string; label: string }, unknown>({
    mutationFn: ({ pipelineId, label }) => api.createLostReason(pipelineId, label),
    errorFallback: (t) => t("Could not add the lost reason"),
    toastId: "pipeline-lost-reason-create",
  });
}

export function useDeleteLostReasonMutation() {
  return usePipelineMutation<string, unknown>({
    mutationFn: api.deleteLostReason,
    errorFallback: (t) => t("Could not delete the lost reason"),
    toastId: "pipeline-lost-reason-delete",
  });
}

export function useCreateLabelMutation() {
  return usePipelineMutation<{ pipelineId: string; name: string; color: string }, unknown>({
    mutationFn: ({ pipelineId, name, color }) => api.createLabel(pipelineId, { name, color }),
    errorFallback: (t) => t("Could not add the label"),
    toastId: "pipeline-label-create",
  });
}

export function useDeleteLabelMutation() {
  return usePipelineMutation<string, unknown>({
    mutationFn: api.deleteLabel,
    errorFallback: (t) => t("Could not delete the label"),
    toastId: "pipeline-label-delete",
  });
}

export function useCreateLeadMutation() {
  return usePipelineMutation<CreateLeadInput, unknown>({
    mutationFn: api.createLead,
    success: (t, _result, variables) => t("{name} added to the pipeline", { name: variables.name }),
    errorFallback: (t) => t("Could not add the lead"),
    toastId: "pipeline-lead-create",
    afterSuccess: (queryClient, _result, variables) => {
      // Opening a lead for an existing contact puts them on the board for the
      // first time, so the chip has to appear rather than change.
      syncInboxStageChips(queryClient, [variables.contactId], variables.stageId);
      // A typed-in number the contact book did not have becomes a contact,
      // server-side, so the contacts list has a row it does not know about.
      if (!variables.contactId && variables.phone) {
        queryClient.invalidateQueries({ queryKey: contactKeys.all() });
      }
    },
  });
}

export function useUpdateLeadMutation() {
  return usePipelineMutation<{ leadId: string; input: UpdateLeadInput }, unknown>({
    mutationFn: ({ leadId, input }) => api.updateLead(leadId, input),
    errorFallback: (t) => t("Could not save the lead"),
    toastId: "pipeline-lead-update",
  });
}

export function useDeleteLeadMutation() {
  return usePipelineMutation<string, unknown>({
    mutationFn: api.deleteLead,
    success: (t) => t("Lead deleted"),
    errorFallback: (t) => t("Could not delete the lead"),
    toastId: "pipeline-lead-delete",
  });
}

/**
 * Moves a lead's counts from one column to the other.
 *
 * Exported for its own test: the board's headers are read from `stats`, so if
 * this is wrong a dragged card lands correctly and the number above it does not.
 */
export function shiftStageCounts(stats: PipelineStats, before: Lead, after: Lead): PipelineStats {
  const wasOpen = before.status === "OPEN";
  const isOpen = after.status === "OPEN";

  const stages = stats.stages.map((row) => {
    if (row.stageId === before.stageId) {
      return {
        ...row,
        total: Math.max(0, row.total - 1),
        open: Math.max(0, row.open - (wasOpen ? 1 : 0)),
      };
    }
    if (row.stageId === after.stageId) {
      return { ...row, total: row.total + 1, open: row.open + (isOpen ? 1 : 0) };
    }
    return row;
  });

  // A move between two open columns leaves the status totals alone; a drop onto
  // a closing column is what shifts them.
  const delta = (status: Lead["status"]) =>
    (after.status === status ? 1 : 0) - (before.status === status ? 1 : 0);

  return {
    ...stats,
    stages,
    totals: {
      ...stats.totals,
      open: Math.max(0, stats.totals.open + delta("OPEN")),
      won: Math.max(0, stats.totals.won + delta("WON")),
      lost: Math.max(0, stats.totals.lost + delta("LOST")),
    },
  };
}

/**
 * Dragging a card has to land instantly, so both columns are rewritten before
 * the request goes out and restored if it fails.
 *
 * The write is exact rather than a guess: the card takes `stageEnteredAt = now`,
 * and a column is ordered by that descending, so index 0 of page 0 is precisely
 * where the server will put it too. That is why `onSettled` invalidates only the
 * counts — refetching the lists would re-fetch every loaded page of both columns
 * to be told what the cache already says, which is the flicker this replaces.
 *
 * The target column is read from the board's own stages, never from another lead
 * already sitting there: dropping onto an empty column would otherwise leave the
 * card wearing its old stage until a refetch corrected it.
 */
export function useMoveLeadMutation(pipelineId: string | undefined) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const columnPrefix = (stageId: string) => [...pipelineKeys.leads(pipelineId), "stage", stageId];

  return useMutation({
    mutationFn: ({ leadId, stageId }: MoveLeadVariables) => api.moveLead(leadId, stageId),

    onMutate: async ({ leadId, fromStageId, stageId }: MoveLeadVariables) => {
      const fromPrefix = columnPrefix(fromStageId);
      const toPrefix = columnPrefix(stageId);
      const statsKey = pipelineKeys.stats(pipelineId);
      const detailKey = pipelineKeys.lead(leadId);

      // Otherwise an in-flight page or counts fetch can land after this write.
      await Promise.all([
        queryClient.cancelQueries({ queryKey: fromPrefix }),
        queryClient.cancelQueries({ queryKey: toPrefix }),
        queryClient.cancelQueries({ queryKey: statsKey }),
        queryClient.cancelQueries({ queryKey: detailKey }),
      ]);

      // Every filter variant of both columns is cached separately, so all of
      // them are snapshotted and all of them are rewritten.
      const previous = {
        from: queryClient.getQueriesData<InfiniteData<LeadPage>>({ queryKey: fromPrefix }),
        to: queryClient.getQueriesData<InfiniteData<LeadPage>>({ queryKey: toPrefix }),
        stats: queryClient.getQueryData<PipelineStats>(statsKey),
        // The modal fetches the lead on its own key, so moving a stage from the
        // stepper has to write here too — otherwise the drawer keeps showing the
        // old column until it is closed and reopened.
        detail: queryClient.getQueryData<LeadDetail>(detailKey),
        detailKey,
      };

      const moving = findCachedLead(queryClient, leadId);
      const target = findCachedStage(queryClient, stageId)?.stage;
      // Nothing to move optimistically — let the server's answer stand.
      if (!moving || !target) return previous;

      const now = new Date().toISOString();
      const moved: Lead = {
        ...moving,
        stageId,
        stage: target,
        stageEnteredAt: now,
        lastActivityAt: now,
        status: target.status,
      };

      queryClient.setQueriesData<InfiniteData<LeadPage>>(
        { queryKey: fromPrefix },
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.filter((lead) => lead.id !== leadId),
            })),
          },
      );

      // A variant the lead does not actually match (say "Mine", and it is not
      // yours) gains a card it will drop on its next refetch. Re-running the
      // filters here would rebuild the duplication this endpoint removed.
      queryClient.setQueriesData<InfiniteData<LeadPage>>(
        { queryKey: toPrefix },
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page, index) =>
              index === 0 ? { ...page, items: [moved, ...page.items] } : page,
            ),
          },
      );

      queryClient.setQueryData<PipelineStats>(
        statsKey,
        (stats) => stats && shiftStageCounts(stats, moving, moved),
      );

      // Only the moved fields: the detail carries notes, tasks and a timeline
      // the list rows do not, and `moved` would drop them.
      queryClient.setQueryData<LeadDetail>(
        detailKey,
        (detail) =>
          detail && {
            ...detail,
            stageId: moved.stageId,
            stage: moved.stage,
            stageEnteredAt: moved.stageEnteredAt,
            lastActivityAt: moved.lastActivityAt,
            status: moved.status,
          },
      );

      return previous;
    },

    onError: (error, _variables, context) => {
      for (const [key, data] of context?.from ?? []) queryClient.setQueryData(key, data);
      for (const [key, data] of context?.to ?? []) queryClient.setQueryData(key, data);
      if (context?.stats) {
        queryClient.setQueryData(pipelineKeys.stats(pipelineId), context.stats);
      }
      if (context?.detail && context.detailKey) {
        queryClient.setQueryData(context.detailKey, context.detail);
      }
      toast.error(getApiErrorMessage(error, t("Could not move the lead")), {
        id: "pipeline-lead-move",
      });
    },

    onSuccess: (_result, variables) => {
      syncInboxStageChips(
        queryClient,
        contactIdsForLeads(queryClient, [variables.leadId]),
        variables.stageId,
      );
      if (variables.stageName) {
        // Single braces: this app runs i18next with the ICU format, where
        // `{stage}` is not a placeholder and rendered literally.
        toast.success(t("Moved to {stage}", { stage: variables.stageName }), {
          id: "pipeline-lead-move",
        });
      }
    },

    onSettled: (_result, _error, variables) => {
      // Numbers only. The lists already hold the right cards.
      queryClient.invalidateQueries({ queryKey: pipelineKeys.stats(pipelineId) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.forecast(pipelineId) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.list() });
      // The open lead, though, gains a timeline entry for the move that only
      // the server can write.
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lead(variables.leadId) });
    },
  });
}

export function useCloseLeadMutation() {
  return usePipelineMutation<{ leadId: string; input: CloseLeadInput }, unknown>({
    mutationFn: ({ leadId, input }) => api.closeLead(leadId, input),
    success: (t, _result, variables) =>
      variables.input.status === "WON" ? t("Lead marked won") : t("Lead marked lost"),
    errorFallback: (t) => t("Could not close the lead"),
    toastId: "pipeline-lead-close",
    // A drop onto Won or Lost closes rather than moves, and lands the lead in
    // the column that was dropped on — so the chip changes here too.
    afterSuccess: (queryClient, _result, variables) => {
      if (!variables.input.stageId) return;
      syncInboxStageChips(
        queryClient,
        contactIdsForLeads(queryClient, [variables.leadId]),
        variables.input.stageId,
      );
    },
  });
}

export function useReopenLeadMutation() {
  return usePipelineMutation<string, unknown>({
    mutationFn: api.reopenLead,
    success: (t) => t("Lead reopened"),
    errorFallback: (t) => t("Could not reopen the lead"),
    toastId: "pipeline-lead-reopen",
  });
}

export function useImportLeadsMutation() {
  return usePipelineMutation<{ pipelineId: string; file: File }, api.LeadImportResult>({
    mutationFn: api.importLeads,
    success: (t, result) =>
      t("{total, plural, one {# card added} other {# cards added}}", { total: result.created }),
    errorFallback: (t) => t("Could not import the file"),
    toastId: "pipeline-import",
  });
}

export function useBulkDeleteLeadsMutation() {
  return usePipelineMutation<string[], { deleted: number }>({
    mutationFn: api.bulkDeleteLeads,
    success: (t, result) => t("{total} leads deleted", { total: result.deleted }),
    errorFallback: (t) => t("Could not delete the selected leads"),
    toastId: "pipeline-lead-bulk-delete",
  });
}

export function useBulkUpdateLeadsMutation() {
  return usePipelineMutation<BulkUpdateLeadsInput, unknown>({
    mutationFn: api.bulkUpdateLeads,
    success: (t, _result, variables) =>
      t("{total} leads updated", { total: variables.leadIds.length }),
    errorFallback: (t) => t("Could not update the selected leads"),
    toastId: "pipeline-lead-bulk",
    // Only a stage change touches the chip; the same call also reassigns owners
    // and teams, which the inbox row does not show.
    afterSuccess: (queryClient, _result, variables) => {
      if (!variables.stageId) return;
      syncInboxStageChips(
        queryClient,
        contactIdsForLeads(queryClient, variables.leadIds),
        variables.stageId,
      );
    },
  });
}

export function useCreateLeadNoteMutation() {
  return usePipelineMutation<{ leadId: string; text: string }, unknown>({
    mutationFn: ({ leadId, text }) => api.createLeadNote(leadId, text),
    success: (t) => t("Note saved"),
    errorFallback: (t) => t("Could not save the note"),
    toastId: "pipeline-note-create",
  });
}

export function useDeleteLeadNoteMutation() {
  return usePipelineMutation<string, unknown>({
    mutationFn: api.deleteLeadNote,
    errorFallback: (t) => t("Could not delete the note"),
    toastId: "pipeline-note-delete",
  });
}

export function useCreateLeadTaskMutation() {
  return usePipelineMutation<{ leadId: string; input: CreateTaskInput }, unknown>({
    mutationFn: ({ leadId, input }) => api.createLeadTask(leadId, input),
    success: (t) => t("Next activity scheduled"),
    errorFallback: (t) => t("Could not schedule the activity"),
    toastId: "pipeline-task-create",
  });
}

export function useUpdateLeadTaskMutation() {
  return usePipelineMutation<{ taskId: string; input: UpdateTaskInput }, unknown>({
    mutationFn: ({ taskId, input }) => api.updateLeadTask(taskId, input),
    errorFallback: (t) => t("Could not update the activity"),
    toastId: "pipeline-task-update",
  });
}

export function useDeleteLeadTaskMutation() {
  return usePipelineMutation<string, unknown>({
    mutationFn: api.deleteLeadTask,
    errorFallback: (t) => t("Could not delete the activity"),
    toastId: "pipeline-task-delete",
  });
}

export function useUpdateTeamPipelineDefaultMutation() {
  return usePipelineMutation<{ teamId: string; input: UpdateTeamDefaultInput }, unknown>({
    mutationFn: ({ teamId, input }) => api.updateTeamPipelineDefault(teamId, input),
    success: (t) => t("Team pipeline updated"),
    errorFallback: (t) => t("Could not update the team's pipeline"),
    toastId: "pipeline-team-default",
  });
}

/**
 * Where a contact sits on the org's board. Enabled only when the caller has the
 * pipeline feature — the endpoint is behind `requireFeature`, so asking without
 * it would 403 and raise a toast on a screen that never mentioned pipelines.
 */
export function useContactStageQuery(contactId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: pipelineKeys.contactStage(contactId),
    queryFn: () => api.fetchContactStage(contactId!),
    enabled: Boolean(contactId) && enabled,
  });
}

/*
 * The four mutations below each sweep the `["pipeline"]` root, which refetches
 * every loaded page of every column. They are called from the inbox and the
 * contacts table, where the board is usually not even mounted, so the cost is
 * normally nothing. TODO: narrow to the affected column + stats when it is.
 */

export function useSetContactStageMutation(contactId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stageId: string) => api.setContactStage(contactId!, stageId),
    onSuccess: (_data, stageId) => {
      syncInboxStageChips(queryClient, [contactId], stageId);
      queryClient.invalidateQueries({ queryKey: pipelineKeys.contactStage(contactId) });
      // The board and its counts have moved too.
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not set the stage"));
    },
  });
}

/**
 * Assign a stage to a contact named at call time — the contact form's path,
 * where the id only exists once the contact has been created.
 */
export function useAssignContactStageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, stageId }: { contactId: string; stageId: string }) =>
      api.setContactStage(contactId, stageId),
    onSuccess: (_data, { contactId, stageId }) => {
      syncInboxStageChips(queryClient, [contactId], stageId);
      queryClient.invalidateQueries({ queryKey: pipelineKeys.contactStage(contactId) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
    },
    onError: (error) => {
      // The contact itself saved; only the stage did not. Say so rather than
      // letting the modal close as if everything worked.
      toast.error(getApiErrorMessage(error, "Contact saved, but the stage was not applied"));
    },
  });
}

/**
 * Bulk assign from the contacts table. Invalidates the contacts list too, since
 * the stage column reads from the same leads.
 */
export function useBulkSetContactStageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactIds, stageId }: { contactIds: string[]; stageId: string }) =>
      api.bulkSetContactStage(contactIds, stageId),
    onSuccess: (_data, { contactIds, stageId }) => {
      syncInboxStageChips(queryClient, contactIds, stageId);
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not assign the stage"));
    },
  });
}

/** Destructive: deletes the lead and everything on it. Confirm before calling. */
export function useClearContactStageMutation(contactId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.clearContactStage(contactId!),
    onSuccess: () => {
      // Off the board entirely, so the chip goes rather than changes.
      syncInboxStageChips(queryClient, [contactId], null);
      queryClient.invalidateQueries({ queryKey: pipelineKeys.contactStage(contactId) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
      toast.success("Removed from the board");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not remove from the board"));
    },
  });
}
