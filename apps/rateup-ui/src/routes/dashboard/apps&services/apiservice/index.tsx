import { createFileRoute } from "@tanstack/react-router";

import ApiAccessKeyPage from "@/components/ExternalApi/ApiAccessKey.tsx";

export const Route = createFileRoute("/dashboard/apps&services/apiservice/")({
  component: Index,
});

function Index() {
  return <ApiAccessKeyPage />;
}
