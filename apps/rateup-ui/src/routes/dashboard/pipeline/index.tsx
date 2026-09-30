import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";

import { PipelinePage } from "@/components/pipeline/PipelinePage.tsx";

/**
 * Only the pipeline id is URL state — it names which board you are looking at,
 * which is the one thing worth sharing or bookmarking. Tabs, facets and the open
 * lead are working state and live in `usePipelineStore` instead.
 */
const pipelineSearchSchema = z.object({
  p: z.string().optional(),
  /** A card's share id, from `/pl/<id>`; resolved and dropped on arrival. */
  lead: z.string().optional(),
});

export type PipelineSearch = z.infer<typeof pipelineSearchSchema>;

/**
 * No org guard here: the pipeline is a normal customer feature, so access is the
 * team feature flag alone, which the sidebar honours and the API enforces on
 * every pipeline route.
 */
export const Route = createFileRoute("/dashboard/pipeline/")({
  validateSearch: (search) => pipelineSearchSchema.parse(search),
  component: PipelinePage,
});
