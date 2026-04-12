"use client";

import AuthForm from "../../../../components/Form/AuthForm";
import { useCheckSession } from "../../../../hooks/checkSession";
import { AuthMode } from "../../../../utils/enums";

const VerifyEmail = () => {
  useCheckSession();
  return <AuthForm mode={AuthMode.VERIFY} />;
};

export default VerifyEmail;
