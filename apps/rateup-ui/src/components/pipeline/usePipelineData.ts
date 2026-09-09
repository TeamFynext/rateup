import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

import { normaliseLeadParams } from "@/backend/pipeline/pipeline.keys.ts";
import {
  usePipelineMembersQuery,
  usePipelineQuery,
  usePipelinesQuery,
  usePipelineStatsQuery,
} from "@/backend/pipeline/pipeline.query.tsx";
import type { LeadListParams, PipelineDetail } from "@/backend/pipeline/pipeline.types.ts";
import { useUserInfo } from "@/backend/user/user.query.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { Route } from "@/routes/dashboard/pipeline/index.tsx";
import { usePipelineStore, type PipelineViewState } from "@/store/pipeline.store.ts";

/** Below this a search filters nothing and cannot use the trigram index. */
const MIN_SEARCH_LENGTH = 2;

/**
 * Reads the pipeline screen's shared state out of the store and the query cache
 * once, so the sidebar, the header and each view all ask the same question.
 *
 * It no longer holds the leads. Filtering runs on the server and each column
 * fetches its own page, so what is shared here is the *query* — `params` — plus
 * the counts that describe the whole board. A view renders cards by asking for
 * them; every view asking with the same `params` is what keeps them in step.
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
  const membersQuery = usePipelineMembersQuery(activePipelineId);
  const statsQuery = usePipelineStatsQuery(activePipelineId);

  const pipeline: PipelineDetail | undefined = pipelineQuery.data;
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);

  // The field echoes every keystroke; the columns only refetch once the typing
  // settles, so a search is one request rather than one per character.
  const debouncedSearch = useDebounce(view.search, 250);

  // A single character is not a search: `%a%` matches almost every lead on the
  // board, so it filters nothing while being the one pattern too short for a
  // trigram index to serve — the one case that still scans the whole table.
  const typed = debouncedSearch.trim();
  const leadSearch = typed.length >= MIN_SEARCH_LENGTH ? typed : "";

  const params: LeadListParams = useMemo(
    () =>
      normaliseLeadParams({
        filter: view.filter,
        search: leadSearch,
        stageId: view.stageId ?? undefined,
        teamId: view.teamId ?? undefined,
        source: view.source ?? undefined,
        assigneeId: view.assigneeId ?? undefined,
      }),
    [view.filter, leadSearch, view.stageId, view.teamId, view.source, view.assigneeId],
  );

  // A facet whose target has left the board cannot be cleared by clicking it
  // again — the row or the avatar that would toggle it is gone. A deleted user
  // is the case that bites: the assignee filter survives in `localStorage`,
  // every column asks for a user nobody can see, each one answers empty, and the
  // board reads as "no leads match these filters" over counts that still say
  // three. `stageId` is dropped on rehydrate for the same reason; these three
  // can only be checked once the data they point at has loaded.
  const teams = statsQuery.data?.teams;
  const sources = statsQuery.data?.sources;
  const { patch } = view;

  useEffect(() => {
    const stale: Partial<PipelineViewState> = {};

    if (view.assigneeId && membersQuery.isSuccess && !members.some((m) => m.id === view.assigneeId))
      stale.assigneeId = null;
    if (view.teamId && teams && !teams.some((team) => team.id === view.teamId)) stale.teamId = null;
    if (view.source && sources && !sources.some((row) => row.source === view.source))
      stale.source = null;

    if (Object.keys(stale).length > 0) patch(stale);
  }, [
    view.assigneeId,
    view.teamId,
    view.source,
    members,
    membersQuery.isSuccess,
    teams,
    sources,
    patch,
  ]);

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
    /** What every view asks the server for; also each column's cache key. */
    params,
    /** Counts over the whole board — never derived from a loaded page. */
    stats: statsQuery.data,
    currentUserId,
    pipelines,
    pipeline,
    members,
    isLoading: pipelinesQuery.isPending || (Boolean(activePipelineId) && pipelineQuery.isPending),
    hasNoPipelines: pipelinesQuery.isSuccess && pipelines.length === 0,
  };
}

export type PipelineData = ReturnType<typeof usePipelineData>;
