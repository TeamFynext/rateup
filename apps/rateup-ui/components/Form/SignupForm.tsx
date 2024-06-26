import {
  Anchor,
  Box,
  Checkbox,
  Grid,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconChevronLeft, IconMail } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";
import { SAVE_HOTKEY } from "../../utils/constants";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import styles from "./AuthForm.module.css";
import GoogleSignInButton from "./GoogleSigninButton";
import LoginSignupLinks from "./LoginSignupLinks";
import PhoneNumberForm from "./phoneNumberForm";
import Link from "next/link";

export const signUpType = {
  SIGNUP_WITH_GOOGLE: "google",
  SIGNUP_WITH_EMAIL: "email",
  SIGNUP_WITH_PHONE: "phone",
};

function SignupForm({ setIsLoading, signUp, isLoading }) {
  const [signUpTypeValue, setSignUpTypeValue] = useState("");

  const phoneInputContainerRef = useRef(null);

  const [termsPrivacyAgreed, setTermsPrivacyAgreed] = useState(true);

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
      name: (value) => {
        if (signUpTypeValue === signUpType.SIGNUP_WITH_PHONE) return null;
        if (!value.length) {
          return "Name is required";
        }
        return null; // Validation passed
      },
      orgName: (value) => {
        if (signUpTypeValue === signUpType.SIGNUP_WITH_PHONE) return null;
        if (!value.length) {
          return "Organization name is required";
        }
        return null; // Validation passed
      },
      phoneNumber: (value) => {
        // if (signUpTypeValue !== signUpType.SIGNUP_WITH_PHONE) return null;
        if (!value) return null;

        if (!isValidPhoneNumber(value)) {
          return "Enter a valid phone number";
        } else return null;
      },
    },
  });

  const hasPhoneInputErr = signUpForm.errors?.phoneNumber;

  const handleSubmit = (values) => {
    if (termsPrivacyAgreed) {
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
    }
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
      <Grid grow gutter={"1.25rem"}>
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
            {...signUpForm.getInputProps("password")}
          />
        </Grid.Col>
        <Grid.Col>
          <Box
            className={`${styles["phone-input-container"]} ${hasPhoneInputErr ? styles["phone-input-error"] : ""}`}
            ref={phoneInputContainerRef}
          >
            <PhoneInputWithCountrySelect
              defaultCountry="IN"
              international
              countryCallingCodeEditable={false}
              placeholder="Enter phone number"
              value={signUpForm?.getValues()?.phoneNumber || null}
              {...signUpForm?.getInputProps("phoneNumber")}
              className={styles.inputPhone}
              onFocus={() =>
                phoneInputContainerRef.current?.classList.add(
                  styles["phone-input-focused"],
                )
              }
              onBlur={() =>
                phoneInputContainerRef.current?.classList.remove(
                  styles["phone-input-focused"],
                )
              }
            />
          </Box>
          <Text className={styles["phone-input-err-text"]}>
            {signUpForm.errors.phoneNumber}
          </Text>
        </Grid.Col>
        <Grid.Col
          className={styles["terms-of-service-and-privacy-policy-checkbox-div"]}
        >
          <Checkbox
            defaultChecked
            onChange={(event) =>
              setTermsPrivacyAgreed(event.currentTarget.checked)
            }
            label={
              <>
                I accept <Link href="/terms-of-service">terms of service</Link>{" "}
                and <Link href="/privacy-policy">privacy policy</Link>
              </>
            }
          />
        </Grid.Col>
        <Grid.Col
          span={{ base: 12, md: 6 }}
          order={{ base: 2, lg: 1 }}
          className={styles["go-back-btn"]}
        >
          <RateupButtonSecondary
            type="button"
            title="Go Back"
            onClick={() => setSignUpTypeValue("")}
            className={styles["login-signup-form-submit-btn"]}
            leftIcon={<IconChevronLeft size={18} />}
          />
        </Grid.Col>
        <Grid.Col
          span={{ base: 12, md: 6 }}
          order={{ base: 1, lg: 2 }}
          className={styles["signup-btn"]}
        >
          <RateupButtonBlue
            disabled={!termsPrivacyAgreed}
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
