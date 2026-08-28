/**
 * Query keys for the lead pipeline.
 *
 * `pipelineDetail` and `leads` both sit under the `["pipeline"]` root, so a
 * mutation that can shift either — a stage edit, a bulk lead move — invalidates
 * the bare root once instead of listing every affected key.
 */
export const pipelineKeys = {
  /** Root prefix — invalidating this sweeps every pipeline-scoped query. */
  all: () => ["pipeline"] as const,
  list: () => ["pipeline", "list"] as const,
  detail: (pipelineId: string | undefined) => ["pipeline", "detail", pipelineId] as const,
  members: (pipelineId: string | undefined) => ["pipeline", "members", pipelineId] as const,
  leads: (pipelineId: string | undefined) => ["pipeline", "leads", pipelineId] as const,
  lead: (leadId: string | undefined) => ["pipeline", "lead", leadId] as const,
  teamDefaults: () => ["pipeline", "team-defaults"] as const,
  /** Where one contact sits on the board — read by the inbox panel. */
  contactStage: (contactId: string | undefined) =>
    ["pipeline", "contact-stage", contactId] as const,
} as const;
