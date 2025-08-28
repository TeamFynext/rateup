"use client";

import AuthForm from "../../components/Form/AuthForm";
import LoginSignupLayout from "../../components/LoginSignupLayout";
import { useCheckSession } from "../../hooks/checkSession";
import { AuthMode } from "../../utils/enums";

const Login = () => {
  useCheckSession();

  return (
    <LoginSignupLayout>
      <AuthForm mode={AuthMode.LOGIN} />
    </LoginSignupLayout>
  );
};

export default Login;
