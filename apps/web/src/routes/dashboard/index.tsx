import { createFileRoute } from "@tanstack/react-router";

import { Loader } from "@/components/ui/loader.tsx";

export const Route = createFileRoute("/dashboard/")({
  ssr: false,
  // Dynamic so the user query, auth checks and permission tables stay out of the entry chunk.
  loader: async ({ context }) =>
    (await import("@/utils/dashboard-landing.ts")).redirectToDashboardLanding({ context }),
  component: DashboardHome,
});

function DashboardHome() {
  return <Loader />;
}
