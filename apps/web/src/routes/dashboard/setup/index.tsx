import { createFileRoute } from "@tanstack/react-router";

import { RateUpOnboarding } from "@/components/dashboard/setup/RateUpOnboarding.tsx";
import { optionalString } from "@/utils/search.ts";

export const Route = createFileRoute("/dashboard/setup/")({
  /** `step` is which task the sidebar's "Get started" section is pointing at. */
  validateSearch: (search: Record<string, unknown>): { step?: string } => ({
    step: optionalString(search.step),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { step } = Route.useSearch();

  return <RateUpOnboarding step={step} />;
}
