import { createFileRoute } from "@tanstack/react-router";

import { FeaturesPage } from "@/components/dashboard/features/FeaturesPage.tsx";

export const Route = createFileRoute("/dashboard/features/")({
  component: FeaturesPage,
});
