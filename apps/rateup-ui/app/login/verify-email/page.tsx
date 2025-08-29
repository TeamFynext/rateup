"use client";

import AuthForm from "../../../components/Form/AuthForm";
import LoginSignupLayout from "../../../components/LoginSignupLayout";
import { useCheckSession } from "../../../hooks/checkSession";
import { AuthMode } from "../../../utils/enums";

const VerifyEmail = () => {
  useCheckSession();
  return (
    <LoginSignupLayout>
      <AuthForm mode={AuthMode.VERIFY} />
    </LoginSignupLayout>
  );
};

export default VerifyEmail;
