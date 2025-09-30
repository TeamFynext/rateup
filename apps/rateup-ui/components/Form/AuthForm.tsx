"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Flex, Image, Stack, useMantineColorScheme } from "@mantine/core";

import { useCreateUserMutation } from "../../backend/user/user.query";
import {
  useConsumeVerificationCode,
  useEmailSend,
  useSignIn,
  useSignUp,
} from "../../utils/auth";
import { AuthMode } from "../../utils/enums";
import { rateupLogoUrl } from "../HomePage/constants";
import { useRouteAndCartStore } from "../HomePage/pages/Pricing/store/RouteAndCartStore";
import styles from "./AuthForm.module.css";
import AuthTypeSignupForm from "./AuthTypeSignupForm";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import { SignUpFlow } from "./SignupFormNew";
import VerifyEmailPage from "./VerifyEmailPage";
import VerifyPhoneNumberPage from "./VerifyPhoneNumberPage";

const AuthForm = ({
  mode,
  authType,
}: {
  mode: string;
  authType?: string | string[];
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const rid = searchParams.get("rid");
  const consumeVerificationCode = useConsumeVerificationCode();
  const sendEmail = useEmailSend();
  const { colorScheme } = useMantineColorScheme();

  useEffect(() => {
    if (mode === AuthMode.VERIFY) {
      if (token && token?.length > 0) {
        consumeVerificationCode();
      } else {
        sendEmail(); //TODO : Add time gaps for resending verification mails
      }
    }
  }, [mode, token, rid]); // add dependencies here

  const signIn = useSignIn();
  const signUp = useSignUp();

  const [isLoading, setIsLoading] = useState(false);

  const createUserMutation = useCreateUserMutation(setIsLoading);

  const isLogin = mode === AuthMode.LOGIN;

  let jsxToReturn = <></>;
  if (mode === AuthMode.VERIFY) {
    jsxToReturn = <VerifyEmailPage sendEmail={sendEmail} />;
  } else if (mode === AuthMode.VERIFY_PHONE_NO) {
    jsxToReturn = <VerifyPhoneNumberPage />;
  } else {
    if (isLogin) {
      jsxToReturn = (
        <LoginForm
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
            isLoading={isLoading}
            authType={authType}
          />
        );
      else
        jsxToReturn = (
          // <SignupForm
          //   setIsLoading={setIsLoading}
          //   signUp={signUp}
          //   isLoading={isLoading}
          // />
          <SignUpFlow />
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
