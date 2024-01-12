import { PasswordInput, TextInput, Title } from "@mantine/core";
import LoginSignupLInks from "./LoginSignupLinks";
import { useForm } from "@mantine/form";
import Link from "next/link";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import GoogleSignInButton from "./GoogleSigninButton";
import styles from "./AuthForm.module.css";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { signUpType } from "./SignupForm";
import PhoneNumberForm from "./phoneNumberForm";
import { isValidPhoneNumber } from "react-phone-number-input";

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

        /^\S+@\S+$/.test(value) ? null : "Invalid email";
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
    signIn(values.email, values.password, values.phoneNumber).finally(() => {
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
          required
          {...loginForm.getInputProps("password")}
        />
        <Link
          className={styles["login-form-forgot-password-link"]}
          href="/login/reset-password"
        >
          Forgot password?
        </Link>

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
        <RateupButtonSecondary
          type="button"
          title="Login with Phone Number"
          onClick={() => setSignUpTypeValue(signUpType.SIGNUP_WITH_PHONE)}
          className={styles["login-signup-form-submit-btn"]}
          color="var(--shade-of-blue-5)"
          mt="md"
        />
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
