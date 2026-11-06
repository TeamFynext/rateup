import { createFileRoute } from "@tanstack/react-router";

import { LinkPagesPage } from "@/components/dashboard/qr-links/link-pages/LinkPagesPage.tsx";

export const Route = createFileRoute("/dashboard/link-pages/")({
  component: LinkPagesPage,
});
