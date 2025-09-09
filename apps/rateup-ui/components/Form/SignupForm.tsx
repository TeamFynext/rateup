"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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
import {
  IconCheck,
  IconChevronLeft,
  IconMail,
  IconPhone,
  IconX,
} from "@tabler/icons-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";
import { z } from "zod/v4";

import { useSendMailPlanSelectDetails } from "@/backend/payment/payment.query";

import { SAVE_HOTKEY } from "../../utils/constants";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import { useRouteAndCartStore } from "../HomePage/pages/Pricing/store/RouteAndCartStore";
import styles from "./AuthForm.module.css";
import GoogleSignInButton from "./GoogleSigninButton";
import LoginSignupLinks from "./LoginSignupLinks";
import PhoneNumberForm from "./phoneNumberForm";

export const signUpType = {
  SIGNUP_WITH_GOOGLE: "google",
  SIGNUP_WITH_EMAIL: "email",
  SIGNUP_WITH_PHONE: "phone",
};

const passwordRules = [
  {
    label: "At least 8 characters",
    test: (val: string) => val.length >= 8,
  },
  {
    label: "At least 1 uppercase letter",
    test: (val: string) => /[A-Z]/.test(val),
  },
  {
    label: "At least 1 lowercase letter",
    test: (val: string) => /[a-z]/.test(val),
  },
  {
    label: "At least 1 number",
    test: (val: string) => /\d/.test(val),
  },
  {
    label: "At least 1 special character",
    test: (val: string) => /[!@#$%^&*(),.?\":{}|<>]/.test(val),
  },
];

function SignupForm({ setIsLoading, signUp, isLoading }) {
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [signUpTypeValue, setSignUpTypeValue] = useState("");
  const translations = useTranslations();
  // const phoneInputContainerRef = useRef(null);

  const [termsPrivacyAgreed, setTermsPrivacyAgreed] = useState(true);

  const signUpSchema =
    signUpTypeValue === signUpType.SIGNUP_WITH_PHONE
      ? z.object({
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
        })
      : z.object({
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
          name: z.string().min(1, translations("Name is required")),
        });

  const signUpForm = useForm({
    initialValues: {
      email: "",
      password: "",
      name: "",
    },

    validate: zod4Resolver(signUpSchema),
  });

  useEffect(() => {
    const newUserFromPricingPage = localStorage.getItem(
      "newUserFromPricingPage",
    );
    if (newUserFromPricingPage) {
      const data = JSON.parse(newUserFromPricingPage);
      signUpForm.setValues({
        email: data.email,
        name: data.name,
        orgName: data.orgName,
      });
    }
  }, []);

  const allPasswordRulesValid = passwordRules.every((rule) =>
    rule.test((signUpForm.values.password as string) || ""),
  );
  const sendMail = useSendMailPlanSelectDetails();
  // const hasPhoneInputErr = signUpForm.errors?.phoneNumber;
  const { cart } = useRouteAndCartStore();
  const handleSubmit = (values) => {
    const selectedPlan = JSON.parse(localStorage.getItem("selected_plan"));
    if (cart?.planId.length) {
      sendMail.mutate({
        email: values.email,
        name: values.name,
        planName: cart?.name,
      });
    }
    if (termsPrivacyAgreed) {
      setIsLoading(true);
      signUp(
        values.email,
        values.password,
        values.name,
        "NULL",
        values.phoneNumber,
        selectedPlan?.id,
      ).finally(() => {
        setIsLoading(false);
        localStorage.removeItem("selected_plan");
        localStorage.removeItem("newUserFromPricingPage");
      });
    }
  };

  let signupPageView = (
    <>
      <RateupButtonSecondary
        type="button"
        title={translations("SignUp with Email")}
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
        title={translations("Sign Up")}
      />
    );
  } else if (signUpTypeValue === signUpType.SIGNUP_WITH_EMAIL) {
    signupPageView = (
      <Grid grow gutter={"1.25rem"}>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            classNames={styles}
            withAsterisk
            placeholder={translations("Name")}
            {...signUpForm.getInputProps("name")}
          />
        </Grid.Col>
        {/* <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            classNames={styles}
            withAsterisk
            placeholder={translations("Organization Name")}
            {...signUpForm.getInputProps("orgName")}
          />
        </Grid.Col> */}
        <Grid.Col>
          <TextInput
            classNames={styles}
            withAsterisk
            placeholder={translations("Email ID")}
            {...signUpForm.getInputProps("email")}
          />
        </Grid.Col>
        <Grid.Col>
          <PasswordInput
            classNames={styles}
            withAsterisk
            placeholder={translations("Enter Password")}
            {...signUpForm.getInputProps("password")}
            onClick={() => setPasswordTouched(true)}
          />
          {passwordTouched && (
            <Box mt="xs">
              {passwordRules.map((rule, idx) => {
                const isValid = rule.test(
                  (signUpForm.values.password as string) || "",
                );
                return (
                  <Text
                    key={idx}
                    size="sm"
                    c={isValid ? "green" : "red"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {isValid ? <IconCheck size={14} /> : <IconX size={14} />}
                    {rule.label}
                  </Text>
                );
              })}
            </Box>
          )}
        </Grid.Col>
        {/* <Grid.Col>
          <Box
            className={`${styles["phone-input-container"]} ${hasPhoneInputErr ? styles["phone-input-error"] : ""}`}
            ref={phoneInputContainerRef}
          >
            <PhoneInputWithCountrySelect
              defaultCountry="IN"
              // international
              countryCallingCodeEditable={false}
              placeholder={translations("Enter Mobile Number (Optional)")}
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
        </Grid.Col> */}
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
                {translations("I accept")}{" "}
                <Link href="/terms-of-service">
                  {translations("terms of service")}
                </Link>{" "}
                {translations("and")}{" "}
                <Link href="/privacy-policy">
                  {translations("privacy policy")}
                </Link>
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
            title={translations("Go Back")}
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
            disabled={!termsPrivacyAgreed || !allPasswordRulesValid}
            type="submit"
            title={translations("Sign Up")}
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
        <span>{translations("SignUp now &")}</span>
        <span>{translations("Start engaging with your Customers")}</span>
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
            {signupPageView}
          </motion.div>
        </AnimatePresence>
      </form>
    </>
  );
}

export default SignupForm;
