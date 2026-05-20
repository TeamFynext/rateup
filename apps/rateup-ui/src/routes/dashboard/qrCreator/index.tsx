import { createFileRoute } from "@tanstack/react-router";

import GenerateQrPage from "@/components/GenerateQr/index.tsx";

export const Route = createFileRoute("/dashboard/qrCreator/")({
  component: GenerateQr,
});

function GenerateQr() {
  return <GenerateQrPage />;
}
