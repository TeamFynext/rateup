import { createFileRoute } from "@tanstack/react-router";

import { TemplatesPage } from "@/components/dashboard/surveys/templates/TemplatesPage.tsx";

export const Route = createFileRoute("/dashboard/surveys/templates/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <TemplatesPage />;
}
