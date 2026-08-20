import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod/v4";

import { useUserInfo } from "@/backend/user/user.query";
import { PipelinePage } from "@/components/pipeline/PipelinePage.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

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
  component: RootOrgOnlyPipeline,
});

/**
 * The pipeline is still root-org only, so the board is not reachable by typing the
 * URL either — the sidebar simply never offers it to anyone else. Mirrors the guard
 * on `/admin`; drop this wrapper once the feature opens up to customers.
 */
function RootOrgOnlyPipeline() {
  const navigate = useNavigate();
  const { data, isPending, isError } = useUserInfo();

  if (isPending)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );

  // An unreadable session tells us nothing about the org, so it is treated as a
  // refusal rather than letting the board render.
  if (isError || !("data" in data) || data.data.orgId !== import.meta.env.VITE_ROOT_ORG) {
    navigate({ to: "/dashboard", replace: true });
    return null;
  }

  return <PipelinePage />;
}
