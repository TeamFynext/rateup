import { createFileRoute } from "@tanstack/react-router";

import ShareQRPage from "@/components/adminPanel/ShareQRPage/index.tsx";

export const Route = createFileRoute("/admin/share-qr/")({
  component: ShareQR,
});

function ShareQR() {
  return <ShareQRPage />;
}
