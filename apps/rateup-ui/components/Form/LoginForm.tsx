import { useState } from "react";
import Link from "next/link";

import { PasswordInput, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconPhone } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { isValidPhoneNumber } from "react-phone-number-input";

import { SAVE_HOTKEY } from "../../utils/constants";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import styles from "./AuthForm.module.css";
import GoogleSignInButton from "./GoogleSigninButton";
import LoginSignupLInks from "./LoginSignupLinks";
import PhoneNumberForm from "./phoneNumberForm";
import { signUpType } from "./SignupForm";

function LoginForm({ setIsLoading, signIn, isLoading }) {
  const loginForm = useForm({
    initialValues: {
      email: "",
      password: "",
      phoneNumber: "",
    },

    validate: {
      email: (value) => {
        if (signUpTypeValue === signUpType.SIGNUP_WITH_PHONE) return null;

        if (!value) return "Email is required";
        else return /^\S+@\S+$/.test(value) ? null : "Invalid email";
      },
      password: (value) => {
        if (signUpTypeValue === signUpType.SIGNUP_WITH_PHONE) return null;
        if (!value) {
          return "Password is required";
        }
        if (value.length < 5) {
          return "Password should be at least 5 characters long";
        }
        if (!/\d/.test(value) || !/[a-zA-Z]/.test(value)) {
          return "Password should contain at least one letter and one number";
        }
        return null; // Validation passed
      },
      phoneNumber: (value) => {
        if (signUpTypeValue !== signUpType.SIGNUP_WITH_PHONE) return null;
        if (!isValidPhoneNumber(value)) {
          return "Enter a valid phone number";
        } else return null;
      },
    },
  });
  const [signUpTypeValue, setSignUpTypeValue] = useState("");

  const handleSubmit = (values) => {
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
        title="Login"
      />
    );
  } else {
    signInPageView = (
      <>
        <TextInput
          classNames={styles}
          placeholder="Email ID"
          {...loginForm.getInputProps("email")}
        />
        <PasswordInput
          classNames={styles}
          placeholder="Enter Password"
          {...loginForm.getInputProps("password")}
        />
        <div className={styles["forgot-password-container"]}>
          <Link
            className={styles["login-form-forgot-password-link"]}
            href="/login/reset-password"
          >
            Forgot password?
          </Link>
        </div>
        <RateupButtonBlue
          type="submit"
          title="Login"
          loading={isLoading}
          className={styles["login-signup-form-submit-btn"]}
        />

        <GoogleSignInButton
          className={styles["login-signup-with-google-btn"]}
          buttonText={"Login with Google"}
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
        Welcome Back
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
        <AnimatePresence mode="wait">
          <motion.div
            key={signUpTypeValue ? signUpTypeValue?.toString() : null}
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
