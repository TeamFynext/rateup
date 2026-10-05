import { createFileRoute } from "@tanstack/react-router";

import { PipelinePage } from "@/components/pipeline/PipelinePage.tsx";
import { optionalString } from "@/utils/search.ts";

/**
 * Only the pipeline id is URL state — it names which board you are looking at,
 * which is the one thing worth sharing or bookmarking. Tabs, facets and the open
 * lead are working state and live in `usePipelineStore` instead.
 */
export interface PipelineSearch {
  p?: string;
  /** A card's share id, from `/pl/<id>`; resolved and dropped on arrival. */
  lead?: string;
}

/**
 * No org guard here: the pipeline is a normal customer feature, so access is the
 * team feature flag alone, which the sidebar honours and the API enforces on
 * every pipeline route.
 */
export const Route = createFileRoute("/dashboard/pipeline/")({
  validateSearch: (search: Record<string, unknown>): PipelineSearch => ({
    p: optionalString(search.p),
    lead: optionalString(search.lead),
  }),
  component: PipelinePage,
});
