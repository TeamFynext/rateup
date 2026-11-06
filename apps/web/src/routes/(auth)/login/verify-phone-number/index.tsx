import { createFileRoute } from "@tanstack/react-router";

import AuthForm from "@/components/Form/AuthForm.tsx";
import LoginSignupLayout from "@/components/LoginSignupLayout/index.tsx";
import { useCheckSession } from "@/hooks/checkSession.tsx";
import { AuthMode } from "@/utils/enums/index.ts";

export const Route = createFileRoute("/(auth)/login/verify-phone-number/")({
  component: VerifyOtp,
});

function VerifyOtp() {
  useCheckSession();
  return (
    <LoginSignupLayout>
      <AuthForm mode={AuthMode.VERIFY_PHONE_NO} />
    </LoginSignupLayout>
  );
}
