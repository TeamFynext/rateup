import { createFileRoute } from "@tanstack/react-router";

import OnboardingWizard from "@/components/Form/completeSIgnup/OnboardingWizard.tsx";
import { useCheckSession } from "@/hooks/checkSession.tsx";

export const Route = createFileRoute("/(auth)/login/complete-login/")({
  component: page,
});

function page() {
  useCheckSession();
  return <OnboardingWizard />;
}
