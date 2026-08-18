import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

import {
  useLeadsQuery,
  usePipelineMembersQuery,
  usePipelineQuery,
  usePipelinesQuery,
} from "@/backend/pipeline/pipeline.query.tsx";
import type { Lead, PipelineDetail } from "@/backend/pipeline/pipeline.types.ts";
import { useUserInfo } from "@/backend/user/user.query.tsx";
import { Route } from "@/routes/dashboard/pipeline/index.tsx";
import { usePipelineStore, type PipelineViewState } from "@/store/pipeline.store.ts";

import { filterLeads, lifecycleFacets, type LeadFilterState } from "./pipeline.utils.ts";

/**
 * Reads the whole pipeline screen out of the store and the query cache once, so
 * the sidebar, the header and each view all agree on which leads are showing.
 *
 * Filtering runs here rather than per view: the board, the list and the
 * forecast are different renderings of exactly the same `visibleLeads`.
 */
export function usePipelineData() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const view = usePipelineStore();

  // Stored view state is applied here rather than at module load, so the server
  // render and the first client render agree. Runs once; `rehydrate` is stable.
  useEffect(() => {
    void usePipelineStore.persist.rehydrate();
  }, []);

  const { data: userInfo } = useUserInfo();
  const currentUserId =
    userInfo && "data" in userInfo ? (userInfo.data as UserData).userId : undefined;

  const pipelinesQuery = usePipelinesQuery();
  const pipelines = useMemo(() => pipelinesQuery.data ?? [], [pipelinesQuery.data]);

  // Without an explicit `?p=`, land on the first pipeline the user can see.
  const activePipelineId = search.p ?? pipelines[0]?.id;

  const pipelineQuery = usePipelineQuery(activePipelineId);
  const leadsQuery = useLeadsQuery(activePipelineId);
  const membersQuery = usePipelineMembersQuery(activePipelineId);

  const pipeline: PipelineDetail | undefined = pipelineQuery.data;
  const leads = useMemo(() => leadsQuery.data ?? [], [leadsQuery.data]);
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);

  const filters: LeadFilterState = useMemo(
    () => ({
      filter: view.filter,
      search: view.search,
      lifecycleId: view.lifecycleId,
      teamId: view.teamId,
      source: view.source,
      assigneeId: view.assigneeId,
    }),
    [view.filter, view.search, view.lifecycleId, view.teamId, view.source, view.assigneeId],
  );

  const facets = useMemo(
    () => (pipeline ? lifecycleFacets(pipeline, leads) : []),
    [pipeline, leads],
  );

  const visibleLeads: Lead[] = useMemo(() => {
    if (!pipeline) return [];
    const lifecycleStageIds = filters.lifecycleId
      ? (facets.find((facet) => facet.id === filters.lifecycleId)?.stageIds ?? [])
      : null;

    return filterLeads(leads, filters, {
      rottingEnabled: pipeline.rottingEnabled,
      currentUserId,
      lifecycleStageIds,
    });
  }, [pipeline, leads, filters, facets, currentUserId]);

  /** Switches board, which is the only part of the screen that is URL state. */
  const setPipeline = (pipelineId: string) => {
    void navigate({ search: { p: pipelineId }, replace: true });
    view.patch({ leadId: null, createPipelineOpen: false });
  };

  return {
    view: view as PipelineViewState,
    setView: view.patch,
    toggleFacet: view.toggle,
    clearFacets: view.clearFacets,
    activePipelineId,
    setPipeline,
    filters,
    facets,
    currentUserId,
    pipelines,
    pipeline,
    leads,
    visibleLeads,
    members,
    isLoading: pipelinesQuery.isPending || (Boolean(activePipelineId) && pipelineQuery.isPending),
    hasNoPipelines: pipelinesQuery.isSuccess && pipelines.length === 0,
  };
}

export type PipelineData = ReturnType<typeof usePipelineData>;
