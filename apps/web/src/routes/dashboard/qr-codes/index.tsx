import { createFileRoute } from "@tanstack/react-router";

import { QrCodesPage } from "@/components/dashboard/qr-links/qr-codes/QrCodesPage.tsx";

export const Route = createFileRoute("/dashboard/qr-codes/")({
  component: QrCodesPage,
});
