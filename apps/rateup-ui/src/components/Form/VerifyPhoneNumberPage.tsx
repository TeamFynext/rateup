import { IconArrowAutofitLeft, IconSend } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { clearLoginAttemptInfo, consumeCode } from "supertokens-auth-react/recipe/passwordless";

import { fetchUserProfile } from "@/backend/user/user.api";
import { isSuperTokensGeneralError } from "@/utils/auth/index.tsx";
import { resendOTP } from "@/utils/auth/index.tsx";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";

import { useRouteAndCartStore } from "../HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import { Button, buttonVariants } from "../ui/button.tsx";
import { Field, FieldGroup, FieldLabel } from "../ui/field.tsx";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp.tsx";
import { Spinner } from "../ui/spinner.tsx";

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
            to: "/signup",
            search: { auth: "phone" },
          });
        } else {
          navigate({
            to: route,
          });
        }
      } else if (response.status === "INCORRECT_USER_INPUT_CODE_ERROR") {
        // the user entered an invalid OTP
        toast.error(
          translations("Wrong OTP! Please try again. Number of attempts left: ") +
            (response.maximumCodeInputAttempts - response.failedCodeInputAttemptCount),
          { id: "incorrect-otp" },
        );
      } else if (response.status === "EXPIRED_USER_INPUT_CODE_ERROR") {
        // it can come here if the entered OTP was correct, but has expired because
        // it was generated too long ago.
        toast.error(translations("Old OTP entered. Please regenerate a new one and try again"), {
          id: "expired-otp",
        });
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
    } catch (err) {
      if (isSuperTokensGeneralError(err)) {
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
      <h2 className={`text-2xl font-bold ${styles["login-signup-form-heading"]}`}>
        {translations("Verify your Phone Number")}
      </h2>
      <p className={styles["verify-email-para"]}>
        {translations(
          "Kindly enter the OTP we have sent via SMS to authenticate your phone number.",
        )}
      </p>
      {/* Same reason as the sign-in form: before hydration the browser submits this
          itself, and a GET would put the one-time code in the URL. */}
      <form
        method="post"
        className={`
            ${styles["login-sign-up-form"]}
            ${styles["signup-form"]}
          `}
        onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, handleOTPInput]])}
      >
        <FieldGroup className="mt-5 mb-4">
          <Field>
            <FieldLabel htmlFor="verify-phone-otp">{translations("OTP Code")}</FieldLabel>
            <InputOTP
              id="verify-phone-otp"
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={otpNumber}
              onChange={setOtpNumber}
              onComplete={handleOTPInput}
              autoFocus
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </Field>
        </FieldGroup>
        <Button
          type="button"
          disabled={isLoading}
          className={styles["login-signup-form-submit-btn"]}
          onClick={handleOTPInput}
        >
          {isLoading && <Spinner />}
          {translations("Verify OTP")}
        </Button>
        <div className="flex justify-end gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => resendOTP()}
            className="mb-4 w-max justify-start"
          >
            <IconSend size="1rem" stroke={1.5} />
            {translations("Resend OTP")}
          </Button>
        </div>
      </form>
      <Link
        to="/logout"
        className={buttonVariants({
          variant: "ghost",
          className: "w-full justify-start font-semibold no-underline",
        })}
      >
        <IconArrowAutofitLeft size="1rem" stroke={1.5} data-icon="inline-start" />
        {translations("Logout")}
      </Link>
    </>
  );
}

export default VerifyPhoneNumberPage;
