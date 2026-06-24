"use client";

import { useState } from "react";

import { Flex, NavLink, Text, TextInput, Title } from "@mantine/core";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconArrowAutofitLeft, IconSend } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  clearLoginAttemptInfo,
  consumeCode,
} from "supertokens-auth-react/recipe/passwordless";

import { fetchUserProfile } from "@/backend/user/user.api";
import { resendOTP } from "@/utils/auth/index.tsx";
import { SAVE_HOTKEY } from "@/utils/constants.ts";

import { RateupButtonBlue } from "../Button/RateupButtons.tsx";
import { useRouteAndCartStore } from "../HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import styles from "./AuthForm.module.css";

function VerifyPhoneNumberPage() {
  const navigate = useNavigate();
  const [otpNumber, setOtpNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { route } = useRouteAndCartStore();
  const { t: translations } = useTranslation();

  async function handleOTPInput() {
    try {
      setIsLoading(true);
      const response = await consumeCode({
        userInputCode: otpNumber,
      });

      if (response.status === "OK") {
        // we clear the login attempt info that was added when the createCode function
        // was called since the login was successful.
        await clearLoginAttemptInfo();
        const profile = await fetchUserProfile();
        if (Object.keys(profile?.data?.data || {}).length === 0) {
          navigate({
            to: "/signup?auth=phone",
          });
        } else {
          navigate({
            to: route,
          });
        }
      } else if (response.status === "INCORRECT_USER_INPUT_CODE_ERROR") {
        // the user entered an invalid OTP
        toast.error(
          translations(
            "Wrong OTP! Please try again. Number of attempts left: ",
          ) +
            (response.maximumCodeInputAttempts -
              response.failedCodeInputAttemptCount),
          { id: "incorrect-otp" },
        );
      } else if (response.status === "EXPIRED_USER_INPUT_CODE_ERROR") {
        // it can come here if the entered OTP was correct, but has expired because
        // it was generated too long ago.
        toast.error(
          translations(
            "Old OTP entered. Please regenerate a new one and try again",
          ),
          { id: "expired-otp" },
        );
      } else {
        // this can happen if the user tried an incorrect OTP too many times.
        // or if it was denied due to security reasons in case of automatic account linking

        // we clear the login attempt info that was added when the createCode function
        // was called - so that if the user does a page reload, they will now see the
        // enter email / phone UI again.
        await clearLoginAttemptInfo();
        navigate({
          to: "/login",
        });
      }
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        toast.error(err.message, { id: "super-tokens-error" });
      } else {
        toast.error("Oops! Something went wrong.", { id: "general-error" });
      }
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <>
      <Title order={2} className={styles["login-signup-form-heading"]}>
        {translations("Verify your Phone Number")}
      </Title>
      <Text className={styles["verify-email-para"]}>
        {translations(
          "Kindly enter the OTP we have sent via SMS to authenticate your phone number.",
        )}
      </Text>
      <form
        className={`
            ${styles["login-sign-up-form"]}
            ${styles["signup-form"]}
          `}
        onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, handleOTPInput]])}
      >
        <TextInput
          classNames={styles}
          withAsterisk
          placeholder={translations("OTP Code")}
          mt={"lg"}
          onChange={(e) => setOtpNumber(e.target.value)}
          mb={"md"}
        />
        <RateupButtonBlue
          type="button"
          title={translations("Verify OTP")}
          loading={isLoading}
          className={styles["login-signup-form-submit-btn"]}
          onClick={handleOTPInput}
        />
        <Flex justify={"end"} gap={0}>
          <NavLink
            onClick={resendOTP}
            component="div"
            label={translations("Resend OTP")}
            leftSection={<IconSend size="1rem" stroke={1.5} />}
            variant="subtle"
            w={"max-content"}
            mb={"md"}
          />
        </Flex>
      </form>
      <Link to="/logout" style={{ textDecoration: "none" }}>
        <NavLink
          component="div"
          style={{ fontWeight: 620 }}
          label={translations("Logout")}
          leftSection={<IconArrowAutofitLeft size="1rem" stroke={1.5} />}
          variant="subtle"
        />
      </Link>
    </>
  );
}

export default VerifyPhoneNumberPage;
