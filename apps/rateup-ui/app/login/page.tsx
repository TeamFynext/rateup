"use client";

import AuthForm from "../../components/Form/AuthForm";
import LoginSignupLayout from "../../components/LoginSignupLayout";
import { useCheckSession } from "../../hooks/checkSession";
import { AuthMode } from "../../utils/enums";

const Login = () => {
  useCheckSession();

  return <AuthForm mode={AuthMode.LOGIN} />;
};

export default Login;
