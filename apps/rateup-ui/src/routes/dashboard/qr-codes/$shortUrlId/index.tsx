import { createFileRoute } from "@tanstack/react-router";

import { QrCodeDetailPage } from "@/components/dashboard/qr-links/qr-codes/QrCodeDetailPage.tsx";

export const Route = createFileRoute("/dashboard/qr-codes/$shortUrlId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { shortUrlId } = Route.useParams();
  return <QrCodeDetailPage key={shortUrlId} shortUrlId={shortUrlId} />;
}
