import { useRouter } from "next/navigation";

import { IconCheck, IconX } from "@tabler/icons-react";
//save new password
import {
  sendPasswordResetEmail,
  submitNewPassword,
} from "supertokens-web-js/recipe/emailpassword";

import { showNotification } from ".";

export function useSendResetEmail() {
  const router = useRouter();
  return async function (email: string) {
    try {
      let response = await sendPasswordResetEmail({
        formFields: [
          {
            id: "email",
            value: email,
          },
        ],
      });

      if (response?.status === "FIELD_ERROR") {
        // one of the input formFields failed validaiton
        response?.formFields?.forEach((formField) => {
          if (formField?.id === "email") {
            // Email validation failed (for example incorrect email syntax).
            showNotification(
              "error",
              "red",
              "Error",
              formField?.error,
              <IconX size="1rem" />,
            );
          }
        });
      } else {
        // reset password email sent.
        //window.alert("Please check your email for the password reset link")
        showNotification(
          "send-mail-error",
          "teal",
          "Reset Email Sent",
          "Please check your email for the password reset link",
          <IconCheck size="1rem" />,
        );
        router.push(
          `/login/reset-password?emailTo=${encodeURIComponent(email)}&requestStatus=success`,
        );
      }
    } catch (err: any) {
      if (err?.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        showNotification(
          "reset-email-error",
          "red",
          "Error",
          err?.message,
          <IconX size="1rem" />,
        );
      } else {
        showNotification(
          "reset-email-error",
          "red",
          "Error",
          "Oops! Something went wrong.",
          <IconX size="1rem" />,
        );
      }
    }
  };
}

export function useSetNewPassword(open) {
  const router = useRouter();
  return async function (newPassword: string) {
    try {
      let response = await submitNewPassword({
        formFields: [
          {
            id: "password",
            value: newPassword,
          },
        ],
      });

      if (response?.status === "FIELD_ERROR") {
        response?.formFields.forEach((formField) => {
          if (formField?.id === "password") {
            // New password did not meet password criteria on the backend.
            showNotification(
              "error",
              "red",
              "Error",
              formField?.error,
              <IconX size="1rem" />,
            );
          }
        });
      } else if (response?.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
        // the password reset token in the URL is invalid, expired, or already consumed
        showNotification(
          "reset-error",
          "red",
          "Failed",
          "Password reset failed. Please try again",
          <IconX size="1rem" />,
        );
        router.push("/login"); // back to the login scree.
      } else {
        open();
      }
    } catch (err: any) {
      if (err?.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        showNotification(
          "set-pwd-error",
          "red",
          "Error",
          err?.message,
          <IconX size="1rem" />,
        );
      } else {
        showNotification(
          "set-pwd-error",
          "red",
          "Error",
          "Oops! Something went wrong.",
          <IconX size="1rem" />,
        );
      }
    }
  };
}
