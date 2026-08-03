import { createFileRoute } from "@tanstack/react-router";

import { RateUpOnboarding } from "@/components/auth/login/setup/RateUpOnboarding.tsx";

export const Route = createFileRoute("/(auth)/login/setup/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RateUpOnboarding />;
}
