import { createFileRoute } from "@tanstack/react-router";

import { PipelineUpdates } from "@/components/admin/updateCenter/PipelineUpdates.tsx";
import { UpdateAllThemes } from "@/components/admin/updateCenter/UpdateAllThemes.tsx";

export const Route = createFileRoute("/admin/updateCenter/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <UpdateAllThemes />
      {/* Its own block below the migrations: these run as a sequence against one
          feature rather than as one-off repairs. */}
      <div className="container mx-auto pb-8">
        <PipelineUpdates />
      </div>
    </>
  );
}
