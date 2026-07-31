import { createFileRoute } from "@tanstack/react-router";

import { GenerateQr } from "@/components/dashboard/qrCreator/GenerateQr.tsx";

export const Route = createFileRoute("/dashboard/qrCreator/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <GenerateQr />;
}
