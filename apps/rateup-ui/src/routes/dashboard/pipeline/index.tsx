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
});

export type PipelineSearch = z.infer<typeof pipelineSearchSchema>;

export const Route = createFileRoute("/dashboard/pipeline/")({
  validateSearch: (search) => pipelineSearchSchema.parse(search),
  component: PipelinePage,
});
