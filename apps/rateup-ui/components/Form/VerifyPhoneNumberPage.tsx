import {
  Flex,
  Group,
  Image,
  NavLink,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconArrowAutofitLeft,
  IconChevronRight,
  IconSend,
} from "@tabler/icons-react";
import Link from "next/link";
import styles from "./AuthForm.module.css";
import { RateupButtonBlue } from "../Button/RateupButtons";
import { useState } from "react";
import {
  clearLoginAttemptInfo,
  consumeCode,
} from "supertokens-web-js/recipe/Passwordless";
import { useRouter } from "next/router";

function VerifyPhoneNumberPage() {
  const router = useRouter();
  const [otpNumber, setOtpNumber] = useState("");
  async function handleOTPInput() {
    try {
      let response = await consumeCode({
        userInputCode: otpNumber,
      });

      if (response.status === "OK") {
        // we clear the login attempt info that was added when the createCode function
        // was called since the login was successful.
        await clearLoginAttemptInfo();
        console.log(response?.user?.timeJoined);

        if (
          response?.createdNewUser &&
          response?.user?.loginMethods?.length === 1
        ) {
          // user sign up success
          console.log("sign up");
        } else {
          // user sign in success
          console.log("sign in");
        }
        router.push("/dashboard");
      } else if (response.status === "INCORRECT_USER_INPUT_CODE_ERROR") {
        // the user entered an invalid OTP
        window.alert(
          "Wrong OTP! Please try again. Number of attempts left: " +
            (response.maximumCodeInputAttempts -
              response.failedCodeInputAttemptCount),
        );
      } else if (response.status === "EXPIRED_USER_INPUT_CODE_ERROR") {
        // it can come here if the entered OTP was correct, but has expired because
        // it was generated too long ago.
        window.alert(
          "Old OTP entered. Please regenerate a new one and try again",
        );
      } else {
        // this can happen if the user tried an incorrect OTP too many times.
        // or if it was denied due to security reasons in case of automatic account linking

        // we clear the login attempt info that was added when the createCode function
        // was called - so that if the user does a page reload, they will now see the
        // enter email / phone UI again.
        await clearLoginAttemptInfo();
        window.alert("Login failed. Please try again");
        window.location.assign("/auth");
      }
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        window.alert(err.message);
      } else {
        window.alert("Oops! Something went wrong.");
      }
    }
  }
  return (
    <>
      <Title order={2} className={styles["login-signup-form-heading"]}>
        Verify your Phone Number
      </Title>
      <Text className={styles["verify-email-para"]}>
        Kindly enter the OTP code we've sent via SMS to authenticate your phone
        number.
      </Text>
      <form
        className={`
            ${styles["login-sign-up-form"]}
            ${styles["signup-form"]}
          `}
      >
        <TextInput
          classNames={styles}
          withAsterisk
          placeholder="Otp Code"
          mt={"lg"}
          onChange={(e) => setOtpNumber(e.target.value)}
        />
        <RateupButtonBlue
          type="button"
          title="Verfy Otp"
          // loading={isLoading}
          className={styles["login-signup-form-submit-btn"]}
          onClick={handleOTPInput}
        />
        <Flex justify={"end"} gap={0}>
          <NavLink
            // onClick={resendOTP}
            component="div"
            label="Resend Otp"
            leftSection={<IconSend size="1rem" stroke={1.5} />}
            variant="subtle"
            w={"max-content"}
            mb={"md"}
          />
        </Flex>
      </form>
      <NavLink
        className={styles["resend-change-email-navlink-component"]}
        // onClick={sendEmail}
        component="div"
        label="change phone number"
        leftSection={<IconSend size="1rem" stroke={1.5} />}
        rightSection={<IconChevronRight size="0.8rem" stroke={1.5} />}
        variant="subtle"
      />

      <Link href="/auth/logout" style={{ textDecoration: "none" }}>
        <NavLink
          component="div"
          style={{ fontWeight: 620 }}
          label="Logout"
          leftSection={<IconArrowAutofitLeft size="1rem" stroke={1.5} />}
          variant="subtle"
        />
      </Link>
    </>
  );
}

export default VerifyPhoneNumberPage;
