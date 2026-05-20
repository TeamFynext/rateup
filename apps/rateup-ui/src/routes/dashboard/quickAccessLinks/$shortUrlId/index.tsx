import { createFileRoute } from "@tanstack/react-router";

import LinktreeEdtiorPage from "@/components/Linktree/LinktreeEditor/index.tsx";

export const Route = createFileRoute(
  "/dashboard/quickAccessLinks/$shortUrlId/",
)({
  component: LinktreeEditor,
});

function LinktreeEditor() {
  return <LinktreeEdtiorPage />;
}
