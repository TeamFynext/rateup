import { createFileRoute } from "@tanstack/react-router";

import LinktreePage from "@/components/Linktree/index.tsx";

export const Route = createFileRoute("/dashboard/quickAccessLinks/")({
  component: Linktree,
});

function Linktree() {
  return <LinktreePage />;
}
