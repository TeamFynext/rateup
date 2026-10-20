import { createFileRoute } from "@tanstack/react-router";

import { FeatureSelectionPage } from "@/components/dashboard/setup/FeatureSelectionPage.tsx";

export const Route = createFileRoute("/dashboard/setup/features")({
  component: FeatureSelectionPage,
});
