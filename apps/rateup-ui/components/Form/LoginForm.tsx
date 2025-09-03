"use client";

import { useState } from "react";
import Link from "next/link";

import { PasswordInput, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod/v4";

import { SAVE_HOTKEY } from "../../utils/constants";
import { RateupButtonBlue } from "../Button/RateupButtons";
import styles from "./AuthForm.module.css";
import GoogleSignInButton from "./GoogleSigninButton";
import LoginSignupLInks from "./LoginSignupLinks";
import PhoneNumberForm from "./phoneNumberForm";
import { signUpType } from "./SignupForm";

function LoginForm({ setIsLoading, signIn, isLoading }) {
  const translations = useTranslations();
  const [signUpTypeValue, setSignUpTypeValue] = useState("");

  // Define Zod schema for form validation
  const loginSchema = z.object(
    signUpTypeValue === signUpType.SIGNUP_WITH_PHONE
      ? {
          phoneNumber: z
            .string()
            .refine(
              (val) =>
                signUpTypeValue !== signUpType.SIGNUP_WITH_PHONE ||
                isValidPhoneNumber(val),
              {
                error: translations("Enter a valid phone number"),
              },
            ),
        }
      : {
          email: z.email().min(1, translations("Email is required")),
          password: z
            .string()
            .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
              error: translations(
                "Password should contain at least one letter and one number",
              ),
            })
            .min(
              5,
              translations("Password should be at least 5 characters long"),
            ),
        },
  );

  const loginForm = useForm({
    initialValues: {
      email: "",
      password: "",
      phoneNumber: "",
    },
    validate: zod4Resolver(loginSchema),
  });

  const handleSubmit = (values) => {
    localStorage.removeItem("selected_plan");
    setIsLoading(true);
    signIn(
      values.email,
      values.password,
      values.phoneNumber,
      values.prefLanguage,
    ).finally(() => {
      setIsLoading(false);
    });
  };
  let signInPageView;
  if (signUpTypeValue === signUpType.SIGNUP_WITH_PHONE) {
    signInPageView = (
      <PhoneNumberForm
        form={loginForm}
        isLoading={isLoading}
        setSignUpTypeValue={setSignUpTypeValue}
        title={translations("Login")}
      />
    );
  } else {
    signInPageView = (
      <>
        <TextInput
          classNames={styles}
          placeholder={translations("Email ID")}
          {...loginForm.getInputProps("email")}
        />
        <PasswordInput
          classNames={styles}
          placeholder={translations("Enter Password")}
          {...loginForm.getInputProps("password")}
        />
        <div className={styles["forgot-password-container"]}>
          <Link
            className={styles["login-form-forgot-password-link"]}
            href="/login/reset-password"
          >
            {translations("Forgot password?")}
          </Link>
        </div>
        <RateupButtonBlue
          type="submit"
          title={translations("Login")}
          loading={isLoading}
          className={styles["login-signup-form-submit-btn"]}
        />

        <GoogleSignInButton
          className={styles["login-signup-with-google-btn"]}
          buttonText={translations("Login with Google")}
        />
        {/* <RateupButtonSecondary
          type="button"
          title="Login with Phone Number"
          onClick={() => setSignUpTypeValue(signUpType.SIGNUP_WITH_PHONE)}
          className={styles["login-signup-form-submit-btn"]}
          color="var(--shade-of-blue-5)"
          mt="md"
          leftIcon={<IconPhone size={16} />}
          fw={600}
        /> */}
      </>
    );
  }
  return (
    <>
      <Title className={styles["login-signup-form-heading"]} order={2}>
        {translations("Welcome Back")}
      </Title>
      <LoginSignupLInks isLogin />

      <form
        className={`
            ${styles["login-sign-up-form"]}
            ${styles["login-form"]}
          `}
        onSubmit={loginForm.onSubmit(handleSubmit)}
        onKeyDown={getHotkeyHandler([
          [
            SAVE_HOTKEY,
            (event: any) => loginForm.onSubmit(handleSubmit)(event),
          ],
        ])}
      >
        <AnimatePresence
          mode="wait"
          key={signUpTypeValue ? signUpTypeValue?.toString() : null}
        >
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {signInPageView}
          </motion.div>
        </AnimatePresence>
      </form>
    </>
  );
}

export default LoginForm;
