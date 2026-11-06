import { createFileRoute } from "@tanstack/react-router";

import SignupSuccessPage from "@/components/Form/SignupSuccessPage.tsx";

export const Route = createFileRoute("/(auth)/signup/success/")({
  component: SignupSuccess,
});

function SignupSuccess() {
  return <SignupSuccessPage />;
}
