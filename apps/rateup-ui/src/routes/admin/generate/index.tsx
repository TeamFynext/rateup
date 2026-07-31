import { createFileRoute } from "@tanstack/react-router";

import { GenerateData } from "@/components/admin/generate/GenerateData.tsx";

export const Route = createFileRoute("/admin/generate/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <GenerateData />;
}
