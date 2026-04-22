"use client";

import { useSearchParams } from "next/navigation";

import AuthForm from "../../../components/Form/AuthForm";
import { useCheckSession } from "../../../hooks/checkSession";
import { AuthMode } from "../../../utils/enums";

const Signup = () => {
  const searchParams = useSearchParams();
  const auth = searchParams.get("auth");
  useCheckSession();
  return (
    // <LoginSignupLayout>
    // </LoginSignupLayout>
    <AuthForm mode={AuthMode.SIGNUP} authType={auth} />
  );
};

export default Signup;
