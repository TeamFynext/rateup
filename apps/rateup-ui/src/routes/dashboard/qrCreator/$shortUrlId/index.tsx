import { createFileRoute } from "@tanstack/react-router";

import GeneratedQrPageComp from "@/components/GenerateQr/GeneratedQrPage/index.tsx";

export const Route = createFileRoute("/dashboard/qrCreator/$shortUrlId/")({
  component: GeneratedQrPage,
});

function GeneratedQrPage() {
  return <GeneratedQrPageComp />;
}
