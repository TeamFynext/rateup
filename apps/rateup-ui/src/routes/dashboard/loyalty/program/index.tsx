import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ONBOARDING_STEPS } from "@/backend/loyalty/onboarding.api";
import { ProgramPage } from "@/components/dashboard/loyalty/program/ProgramPage.tsx";

// `?section=` opens one section's editor; without it the page is the five summary cards.
// A search param rather than a child route so the sidebar's Program entry stays active
// and closing the editor is just clearing the search.
const searchSchema = z.object({
  section: z.enum(ONBOARDING_STEPS).optional().catch(undefined),
});

export const Route = createFileRoute("/dashboard/loyalty/program/")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { section } = Route.useSearch();
  return <ProgramPage section={section} />;
}
