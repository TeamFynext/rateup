import React, { useEffect, useState } from "react";
import { Image, Flex, ScrollArea } from "@mantine/core";
import { useRouter } from "next/router";
import {
  useConsumeVerificationCode,
  useEmailSend,
  useSignIn,
  useSignUp,
} from "../../utils/auth";
import Link from "next/link";
import { AuthMode } from "../../utils/enums";
import { useCreateUserMutation } from "../../backend/user/user.query";
import styles from "./AuthForm.module.css";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import VerifyEmailPage from "./VerifyEmailPage";
import AuthTypeSignupForm from "./AuthTypeSignupForm";
import { rateupLogoUrl } from "../HomePage/constants";

const AuthForm = ({
  mode,
  authType,
}: {
  mode: string;
  authType?: string | string[];
}) => {
  const router = useRouter();
  const { token, rid } = router.query;
  const consumeVerificationCode = useConsumeVerificationCode();
  const sendEmail = useEmailSend();
  useEffect(() => {
    if (mode === AuthMode.VERIFY) {
      if (token && rid === "emailverification") {
        consumeVerificationCode();
      } else {
        sendEmail();
      }
    }
  }, [mode, token, sendEmail, consumeVerificationCode, rid]); // add dependencies here

  const signIn = useSignIn();
  const signUp = useSignUp();

  const [isLoading, setIsLoading] = useState(false);

  const createUserMutation = useCreateUserMutation(setIsLoading);

  const isLogin = mode === AuthMode.LOGIN;

  let jsxToReturn = <></>;
  if (mode === AuthMode.VERIFY) {
    jsxToReturn = <VerifyEmailPage sendEmail={sendEmail} />;
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
          />
        );
      else
        jsxToReturn = (
          <SignupForm
            setIsLoading={setIsLoading}
            signUp={signUp}
            isLoading={isLoading}
          />
        );
    }
  }

  return (
    <Flex
      className={`
          ${styles["auth-form-container"]}
          ${styles[`${mode}-auth-form-container`]}
          ${styles[`${authType ? "auth-type-signup-form" : ""}`]}
        `}
    >
      <ScrollArea h={"100%"} w={"100%"} scrollbarSize={5} type="hover">
        <Flex justify={"center"}>
          <Link href="/">
            <Image
              className={styles["rateup-logo-img"]}
              src={rateupLogoUrl}
              alt="RateUp Logo"
            />
          </Link>
        </Flex>
        {jsxToReturn}
      </ScrollArea>
    </Flex>
  );
};

export default AuthForm;
