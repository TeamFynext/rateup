"use client";

import { useRouter, useSearchParams } from "next/navigation";

import AuthForm from "../../components/Form/AuthForm";
import LoginSignupLayout from "../../components/LoginSignupLayout";
import { useCheckSession } from "../../hooks/checkSession";
import { AuthMode } from "../../utils/enums";

const Signup = () => {
  const searchParams = useSearchParams();
  const auth = searchParams.get("auth");
  useCheckSession();
  return (
    // <LoginSignupLayout>
    <AuthForm mode={AuthMode.SIGNUP} authType={auth} />
    // </LoginSignupLayout>
  );
};

export default Signup;
