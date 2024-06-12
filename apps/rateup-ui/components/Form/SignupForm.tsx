import { Grid, PasswordInput, TextInput, Title } from "@mantine/core";
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
import { isValidPhoneNumber } from "react-phone-number-input";
import { IconChevronLeft, IconMail, IconPhone } from "@tabler/icons-react";
import { getHotkeyHandler } from "@mantine/hooks";
import { SAVE_HOTKEY } from "../../utils/constants";

export const signUpType = {
  SIGNUP_WITH_GOOGLE: "google",
  SIGNUP_WITH_EMAIL: "email",
  SIGNUP_WITH_PHONE: "phone",
};

function SignupForm({ setIsLoading, signUp, isLoading }) {
  const [signUpTypeValue, setSignUpTypeValue] = useState("");

  const signUpForm = useForm({
    initialValues: {
      email: "",
      password: "",
      name: "",
      orgName: "",
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
        if (!value.length) {
          return "Name cannot be blank";
        }
        return null; // Validation passed
      },
      orgName: (value) => {
        if (signUpTypeValue === signUpType.SIGNUP_WITH_PHONE) return null;
        if (!value.length) {
          return "Organization name cannot be blank";
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

  const handleSubmit = (values) => {
    setIsLoading(true);
    signUp(
      values.email,
      values.password,
      values.name,
      values.orgName,
      values.phoneNumber,
    ).finally(() => {
      setIsLoading(false);
    });
  };

  let signupPageView = (
    <>
      <RateupButtonSecondary
        type="button"
        title="SignUp with Email"
        loading={isLoading}
        onClick={() => setSignUpTypeValue(signUpType.SIGNUP_WITH_EMAIL)}
        className={styles["login-signup-form-submit-btn"]}
        color="var(--shade-of-blue-5)"
        leftIcon={<IconMail size={16} />}
        fw={600}
      />
      <GoogleSignInButton
        className={styles["login-signup-with-google-btn"]}
        buttonText={"SignUp with Google"}
      />
      {/* <RateupButtonSecondary
        type="button"
        title="SignUp with Phone Number"
        loading={isLoading}
        onClick={() => setSignUpTypeValue(signUpType.SIGNUP_WITH_PHONE)}
        className={styles["login-signup-form-submit-btn"]}
        color="var(--shade-of-blue-5)"
        mt="md"
        leftIcon={<IconPhone size={16} />}
        fw={600}
      /> */}
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
      <Grid grow>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            classNames={styles}
            withAsterisk
            placeholder="Name"
            {...signUpForm.getInputProps("name")}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            classNames={styles}
            withAsterisk
            placeholder="Organization Name"
            {...signUpForm.getInputProps("orgName")}
          />
        </Grid.Col>
        <Grid.Col>
          <TextInput
            classNames={styles}
            withAsterisk
            placeholder={"Email ID"}
            {...signUpForm.getInputProps("email")}
          />
        </Grid.Col>
        <Grid.Col>
          <PasswordInput
            classNames={styles}
            placeholder="Enter Password"
            required
            {...signUpForm.getInputProps("password")}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }} order={{ base: 2, lg: 1 }}>
          <RateupButtonSecondary
            type="button"
            title="Go Back"
            onClick={() => setSignUpTypeValue("")}
            className={styles["login-signup-form-submit-btn"]}
            leftIcon={<IconChevronLeft size={18} />}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }} order={{ base: 1, lg: 2 }}>
          <RateupButtonBlue
            type="submit"
            title="Sign Up"
            loading={isLoading}
            className={styles["login-signup-form-submit-btn"]}
          />
        </Grid.Col>
      </Grid>
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
        <span>SignUp now &</span>
        <span>Start engaging with your Customers</span>
      </Title>

      <LoginSignupLinks isSignup />

      <form
        className={`
            ${styles["login-sign-up-form"]}
            ${styles["signup-form"]}
          `}
        onSubmit={signUpForm.onSubmit(handleSubmit)}
        onKeyDown={getHotkeyHandler([
          [
            SAVE_HOTKEY,
            (event: any) => signUpForm.onSubmit(handleSubmit)(event),
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
            {signupPageView}
          </motion.div>
        </AnimatePresence>
      </form>
    </>
  );
}

export default SignupForm;
