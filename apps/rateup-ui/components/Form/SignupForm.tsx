import { PasswordInput, TextInput, Title } from "@mantine/core";
import LoginSignupLinks from "./LoginSignupLinks";
import { useForm } from "@mantine/form";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import GoogleSignInButton from "./GoogleSigninButton";
import styles from "./AuthForm.module.css";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import PhoneNumberForm from "./phoneNumberForm";

export const signUpType = {
  SIGNUP_WITH_GOOGLE: "google",
  SIGNUP_WITH_EMAIL: "email",
  SIGNUP_WITH_PHONE: "phone",
};

function SignupForm({ setIsLoading, signUp, isLoading }) {
  const [phoneNumberSignIn, setPhoneNumberSignIn] = useState(false);
  const [signUpTypeValue, setSignUpTypeValue] = useState("");

  const signUpForm = useForm({
    initialValues: {
      email: "",
      password: "",
      name: "",
      orgName: "",
      inviteCode: "",
      phoneNumber: "",
    },

    validate: {
      email: (value) => {
        if (signUpTypeValue === signUpType.SIGNUP_WITH_PHONE) return null;
        return /^\S+@\S+$/.test(value) ? null : "Invalid email";
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
      name: (value) => {
        if (signUpTypeValue === signUpType.SIGNUP_WITH_PHONE) return null;
        if (value.length < 4) {
          return "Name should be at least 4 characters long";
        }
        return null; // Validation passed
      },
      orgName: (value) => {
        if (signUpTypeValue === signUpType.SIGNUP_WITH_PHONE) return null;
        if (value.length < 4) {
          return "Organization name should be at least 4 characters long";
        }
        return null; // Validation passed
      },
      inviteCode: (value) => {
        if (signUpTypeValue === signUpType.SIGNUP_WITH_PHONE) return null;
        if (value.length < 5) {
          return "Invalid invite code";
        }
        return null; // Validation passed
      },
    },
  });

  const handleSubmit = (values) => {
    setIsLoading(true);
    signUp(
      values.email,
      values.password,
      values.name,
      values.orgName,
      values.inviteCode,
      values.phoneNumber,
    ).finally(() => {
      setIsLoading(false);
    });
  };

  let signupPageView = (
    <>
      <RateupButtonSecondary
        type="button"
        title="Sign Up With Email"
        loading={isLoading}
        onClick={() => setSignUpTypeValue(signUpType.SIGNUP_WITH_EMAIL)}
        className={styles["login-signup-form-submit-btn"]}
        color="var(--shade-of-blue-5)"
      />
      <GoogleSignInButton
        className={styles["login-signup-with-google-btn"]}
        buttonText={"SignUp with Google"}
      />
      <RateupButtonSecondary
        type="button"
        title="Sign Up With Phone Number"
        loading={isLoading}
        onClick={() => setSignUpTypeValue(signUpType.SIGNUP_WITH_PHONE)}
        className={styles["login-signup-form-submit-btn"]}
        color="var(--shade-of-blue-5)"
        mt="md"
      />
    </>
  );
  if (signUpTypeValue === signUpType.SIGNUP_WITH_PHONE) {
    signupPageView = (
      <PhoneNumberForm
        form={signUpForm}
        isLoading={isLoading}
        setSignUpTypeValue={setSignUpTypeValue}
        title="Sign Up"
      />
    );
  } else if (signUpTypeValue === signUpType.SIGNUP_WITH_EMAIL) {
    signupPageView = (
      <>
        <TextInput
          classNames={styles}
          withAsterisk
          placeholder="Name"
          {...signUpForm.getInputProps("name")}
        />
        <TextInput
          classNames={styles}
          withAsterisk
          placeholder="Organization Name"
          {...signUpForm.getInputProps("orgName")}
        />
        <TextInput
          classNames={styles}
          withAsterisk
          placeholder={"Email ID"}
          {...signUpForm.getInputProps("email")}
        />

        <PasswordInput
          classNames={styles}
          placeholder="Enter Password"
          required
          {...signUpForm.getInputProps("password")}
        />

        <TextInput
          classNames={styles}
          withAsterisk
          placeholder="Invite Code *"
          {...signUpForm.getInputProps("inviteCode")}
        />

        <RateupButtonBlue
          type="submit"
          title="Sign Up"
          loading={isLoading}
          className={styles["login-signup-form-submit-btn"]}
        />
        <RateupButtonSecondary
          type="button"
          title="Go Back"
          onClick={() => setSignUpTypeValue("")}
          className={styles["login-signup-form-submit-btn"]}
        />
      </>
    );
  }
  return (
    <>
      <Title
        className={`${styles["login-signup-form-heading"]}
           ${styles["signup-form-heading"]}
          `}
        order={2}
      >
        <span>Sign up now</span>
        <span>Start engaging with your Customers</span>
      </Title>

      <LoginSignupLinks isSignup />

      <form
        className={`
            ${styles["login-sign-up-form"]}
            ${styles["signup-form"]}
          `}
        onSubmit={signUpForm.onSubmit(handleSubmit)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={signUpTypeValue ? signUpTypeValue?.toString() : null}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {signupPageView}
          </motion.div>
        </AnimatePresence>
      </form>
    </>
  );
}

export default SignupForm;
