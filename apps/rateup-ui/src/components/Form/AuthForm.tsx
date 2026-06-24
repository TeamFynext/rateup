"use client";

import { useEffect, useState } from "react";

import { Stack, useMantineColorScheme } from "@mantine/core";
import { useNavigate, useSearch } from "@tanstack/react-router";

import {
  useCreateAppleUserMutation,
  useCreateUserMutation,
} from "@/backend/user/user.query";
import {
  useConsumeVerificationCode,
  useEmailSend,
  useSignIn,
  useSignUp,
} from "@/utils/auth/index.tsx";
import { AuthMode } from "@/utils/enums/index.ts";

import styles from "./AuthForm.module.css";
import AuthTypeSignupForm from "./AuthTypeSignupFormNew.tsx";
import SignInFlow from "./LoginFormNew.tsx";
import { SignUpFlow } from "./SignupFormNew.tsx";
import VerifyEmailPage from "./VerifyEmailPage.tsx";
import VerifyPhoneNumberPage from "./VerifyPhoneNumberPage.tsx";

const AuthForm = ({
  mode,
  authType,
}: {
  mode: string;
  authType?: string | string[];
}) => {
  const searchParams = useSearch({ strict: false });
  const token = searchParams.token;
  const rid = searchParams.rid;
  const consumeVerificationCode = useConsumeVerificationCode();
  const sendEmail = useEmailSend();
  const { colorScheme } = useMantineColorScheme();

  useEffect(() => {
    if (mode === AuthMode.VERIFY) {
      if (token && token?.length > 0) {
        consumeVerificationCode();
      } else {
        sendEmail(); // TODO : Add time gaps for resending verification mails
      }
    }
  }, [mode, token, rid]); // add dependencies here

  const signIn = useSignIn();
  const signUp = useSignUp();

  const [isLoading, setIsLoading] = useState(false);

  const createUserMutation = useCreateUserMutation(setIsLoading);
  const createAppleUserMutation = useCreateAppleUserMutation(setIsLoading);

  const isLogin = mode === AuthMode.LOGIN;

  let jsxToReturn = <></>;
  if (mode === AuthMode.VERIFY) {
    jsxToReturn = <VerifyEmailPage sendEmail={sendEmail} />;
  } else if (mode === AuthMode.VERIFY_PHONE_NO) {
    jsxToReturn = <VerifyPhoneNumberPage />;
  } else {
    if (isLogin) {
      jsxToReturn = (
        <SignInFlow
          setIsLoading={setIsLoading}
          signIn={signIn}
          isLoading={isLoading}
        />
      );
    } else {
      if (authType)
        jsxToReturn = (
          <AuthTypeSignupForm
            setIsLoading={setIsLoading}
            createUserMutation={createUserMutation}
            createAppleUserMutation={createAppleUserMutation}
            isLoading={isLoading}
            authType={authType}
          />
        );
      else
        jsxToReturn = (
          <SignUpFlow
            setIsLoading={setIsLoading}
            signUp={signUp}
            isLoading={isLoading}
          />
        );
    }
  }

  return (
    <Stack
      className={`
          ${styles[`${authType ? "auth-type-signup-form" : ""}`]}
          ${styles[`color-scheme-${colorScheme}`]}
        `}
    >
      {jsxToReturn}
    </Stack>
  );
};

export default AuthForm;
