import { useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { useCreateAppleUserMutation, useCreateUserMutation } from "@/backend/user/user.query";
import { useResolvedTheme } from "@/components/theme/theme-provider.tsx";
import {
  useConsumeVerificationCode,
  useEmailSend,
  useSignIn,
  useSignUp,
} from "@/utils/auth/index.tsx";
import { AuthMode } from "@/utils/enums/index.ts";

import AuthTypeSignupForm from "./AuthTypeSignupFormNew.tsx";
import SignInFlow from "./LoginFormNew.tsx";
import { SignUpFlow } from "./SignupFormNew.tsx";
import VerifyEmailPage from "./VerifyEmailPage.tsx";
import VerifyPhoneNumberPage from "./VerifyPhoneNumberPage.tsx";

import styles from "./AuthForm.module.css";

const AuthForm = ({ mode, authType }: { mode: string; authType?: string | string[] }) => {
  const searchParams = useSearch({ strict: false });
  const token = typeof searchParams.token === "string" ? searchParams.token : undefined;
  const rid = typeof searchParams.rid === "string" ? searchParams.rid : undefined;
  const consumeVerificationCode = useConsumeVerificationCode();
  const sendEmail = useEmailSend();
  const colorScheme = useResolvedTheme();

  // Spending an already-consumed token reports the link as expired, so this must not run
  // twice. StrictMode replays effects in dev, and `rid` can settle to a new value after
  // mount, so guard on the token already handled rather than on deps alone.
  //
  // Landing here without a token sends nothing. The screen is reached by a refresh, by
  // every later login and by every bounce off a guarded route, so sending on mount meant
  // a mailbox of identical links; signing up sends the first email, and the Resend button
  // below sends any further one.
  const handledVerification = useRef<string | null>(null);

  useEffect(() => {
    if (mode !== AuthMode.VERIFY) return;
    if (!token) return;
    if (handledVerification.current === token) return;

    handledVerification.current = token;
    consumeVerificationCode();
  }, [mode, token, rid]);

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
        <SignInFlow setIsLoading={setIsLoading} signIn={signIn} isLoading={isLoading} />
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
          <SignUpFlow setIsLoading={setIsLoading} signUp={signUp} isLoading={isLoading} />
        );
    }
  }

  return (
    <div
      className={`
          flex flex-col gap-4
          ${styles[`${authType ? "auth-type-signup-form" : ""}`]}
          ${styles[`color-scheme-${colorScheme}`]}
        `}
    >
      {jsxToReturn}
    </div>
  );
};

export default AuthForm;
