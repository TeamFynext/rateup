import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";

import { RateUpOnboarding } from "@/components/dashboard/setup/RateUpOnboarding.tsx";

/** `step` is which task the sidebar's "Get started" section is pointing at. */
const setupSearchSchema = z.object({
  step: z.string().optional(),
});

export const Route = createFileRoute("/dashboard/setup/")({
  validateSearch: setupSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { step } = Route.useSearch();

  return <RateUpOnboarding step={step} />;
}
