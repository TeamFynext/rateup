import type { LeadListParams } from "./pipeline.types.ts";

/**
 * Query keys for the lead pipeline.
 *
 * `pipelineDetail`, `leads` and `stats` all sit under the `["pipeline"]` root,
 * so a mutation that can shift any of them — a stage edit, a bulk lead move —
 * invalidates the bare root once instead of listing every affected key.
 *
 * Lead keys nest under `leads(pipelineId)` so one column, or one board, can be
 * swept without touching the rest: a card moving between two columns invalidates
 * nothing at all (the optimistic write is exact) and only the counts refetch.
 */
export const pipelineKeys = {
  /** Root prefix — invalidating this sweeps every pipeline-scoped query. */
  all: () => ["pipeline"] as const,
  list: () => ["pipeline", "list"] as const,
  detail: (pipelineId: string | undefined) => ["pipeline", "detail", pipelineId] as const,
  members: (pipelineId: string | undefined) => ["pipeline", "members", pipelineId] as const,
  /** Prefix over every lead list on a board, whatever the column or filter. */
  leads: (pipelineId: string | undefined) => ["pipeline", "leads", pipelineId] as const,
  /** One board column under one set of filters. */
  stageLeads: (pipelineId: string | undefined, stageId: string, params: LeadListParams) =>
    ["pipeline", "leads", pipelineId, "stage", stageId, params] as const,
  /** The whole board under one set of filters — the list view's ungrouped mode. */
  listLeads: (pipelineId: string | undefined, params: LeadListParams) =>
    ["pipeline", "leads", pipelineId, "list", params] as const,
  lead: (leadId: string | undefined) => ["pipeline", "lead", leadId] as const,
  sharedLead: (shortUrlId: string | undefined) => ["pipeline", "shared-lead", shortUrlId] as const,
  /** Counts and rollups for the whole pipeline; no filters in the key. */
  stats: (pipelineId: string | undefined) => ["pipeline", "stats", pipelineId] as const,
  forecast: (pipelineId: string | undefined) => ["pipeline", "forecast", pipelineId] as const,
  teamDefaults: () => ["pipeline", "team-defaults"] as const,
  /** Where one contact sits on the board — read by the inbox panel. */
  contactStage: (contactId: string | undefined) =>
    ["pipeline", "contact-stage", contactId] as const,
} as const;

/**
 * The one place lead filters are turned into a cache key and a query string.
 *
 * React Query hashes a key by walking the object, so `{ filter, search: undefined }`
 * and `{ filter }` are the same key but `{ search: "" }` is a third — and an
 * empty `search` would also reach the API as `search=`. Absent keys are dropped
 * here so every caller produces one key per filter, and one request per filter.
 */
export function normaliseLeadParams(input: LeadListParams): LeadListParams {
  const params: LeadListParams = { filter: input.filter };

  if (input.search) params.search = input.search;
  if (input.stageId) params.stageId = input.stageId;
  if (input.source) params.source = input.source;
  if (input.assigneeId) params.assigneeId = input.assigneeId;

  return params;
}

/** True when anything narrows the board — the counts then describe more than the cards. */
export function hasActiveLeadFilters(params: LeadListParams): boolean {
  return (
    params.filter !== "open" ||
    Boolean(params.search ?? params.stageId ?? params.source ?? params.assigneeId)
  );
}
