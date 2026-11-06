import { createFileRoute } from "@tanstack/react-router";

import { TemplateAnalyticsPage } from "@/components/whatsapp/templates/analytics/TemplateAnalyticsPage.tsx";

export const Route = createFileRoute("/dashboard/whatsapp/templates/$templateId/analytics/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { templateId } = Route.useParams();
  return <TemplateAnalyticsPage templateId={templateId} />;
}
