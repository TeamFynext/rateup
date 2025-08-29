"use client";

import AuthForm from "../../../components/Form/AuthForm";
import LoginSignupLayout from "../../../components/LoginSignupLayout";
import { useCheckSession } from "../../../hooks/checkSession";
import { AuthMode } from "../../../utils/enums";

const VerifyOtp = () => {
  useCheckSession();
  return (
    <LoginSignupLayout>
      <AuthForm mode={AuthMode.VERIFY_PHONE_NO} />
    </LoginSignupLayout>
  );
};

export default VerifyOtp;
