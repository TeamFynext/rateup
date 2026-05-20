import { createFileRoute } from "@tanstack/react-router";

import LandingPageEdtior from "@/components/LandingPage/LandingPageEditor/index.tsx";

export const Route = createFileRoute("/dashboard/landingPages/$shortUrlId/")({
  component: LandingPageEditor,
});

function LandingPageEditor() {
  return <LandingPageEdtior />;
}
