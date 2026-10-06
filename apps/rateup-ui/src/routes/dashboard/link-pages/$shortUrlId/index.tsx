import { createFileRoute } from "@tanstack/react-router";

import { LinkPageEditor } from "@/components/dashboard/qr-links/link-pages/editor/LinkPageEditor.tsx";
import { validateLinkPageEditorSearch } from "@/components/dashboard/qr-links/link-pages/editor/search.ts";

export const Route = createFileRoute("/dashboard/link-pages/$shortUrlId/")({
  validateSearch: validateLinkPageEditorSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const { shortUrlId } = Route.useParams();
  const { tab } = Route.useSearch();
  return <LinkPageEditor key={shortUrlId} shortUrlId={shortUrlId} tab={tab} />;
}
