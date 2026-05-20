import { createFileRoute } from "@tanstack/react-router";

import LandingPageComp from "@/components/LandingPage/index.tsx";

export const Route = createFileRoute("/dashboard/landingPages/")({
  component: LandingPage,
});

function LandingPage() {
  return <LandingPageComp />;
}
