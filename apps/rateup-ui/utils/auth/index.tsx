import { signIn , signUp} from "supertokens-web-js/recipe/emailpassword";
import { useRouter } from "next/router";
import { IconInfoCircleFilled, IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

export function useSignIn() {
  const router = useRouter();
  
  return async function(email: string, password: string) {
    try {
      let response = await signIn({
        formFields: [
          {
            id: "email",
            value: email,
          },
          {
            id: "password",
            value: password,
          },
        ],
      });

      if (response.status === "FIELD_ERROR") {
        response.formFields.forEach((formField) => {
          if (formField.id === "email") {
            // Email validation failed (for example incorrect email syntax).
            showNotification('load-data', 'red', 'Error', formField.error, <IconX size="1rem" />);
          }
        });
      } else if (response.status === "WRONG_CREDENTIALS_ERROR") {
        // Email password combination is incorrect.
        showNotification('load-data', 'red', 'Failed', 'Email password combination is incorrect.', <IconX size="1rem" />);
      } else {
        // sign in successful. The session tokens are automatically handled by
        // the frontend SDK.
        router.push("/dashboard");
      }
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        showNotification('load-data', 'red', 'Error', err.message, <IconX size="1rem" />);
      } else {
        showNotification('load-data', 'red', 'Error', "Oops! Something went wrong.", <IconX size="1rem" />);
      }
    }
  }
}

export function showNotification(id: string, color: string, title: string, message: string, icon: JSX.Element, autoClose: number = 4000) {
  notifications.show({
    id,
    color,
    title,
    message,
    icon,
    autoClose,
  });
}

export function useSignUp() {
  const router = useRouter();
  
  return async function(email: string, password: string) {
    try {
      let response = await signUp({
        formFields: [
          {
            id: "email",
            value: email,
          },
          {
            id: "password",
            value: password,
          },
        ],
      });

      if (response.status === "FIELD_ERROR") {
        response.formFields.forEach((formField) => {
          if (formField.id === "email") {
            // Email validation failed (for example incorrect email syntax),
            // or the email is not unique.
            showNotification('sign-up-error', 'red', 'Error', formField.error, <IconX size="1rem" />);
          } else if (formField.id === "password") {
            // Password validation failed.
            // Maybe it didn't match the password strength
            showNotification('sign-up-error', 'red', 'Error', formField.error, <IconX size="1rem" />);
          }
        });
      } else {
        // sign up successful. The session tokens are automatically handled by
        // the frontend SDK.
        router.push("/login/verify-email");
        //consumeVerificationCode()
      }
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        showNotification('sign-up-error', 'red', 'Error', err.message, <IconX size="1rem" />);
      } else {
        showNotification('sign-up-error', 'red', 'Error', "Oops! Something went wrong.", <IconX size="1rem" />);
      }
    }
  }
}


import { verifyEmail } from "supertokens-web-js/recipe/emailverification";

export const useConsumeVerificationCode = () => {
  const router = useRouter();

  const consumeVerificationCode = async () => {
    try {
      let response = await verifyEmail();
      if (response.status === "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR") {
        // This can happen if the verification code is expired or invalid.
        // You should ask the user to retry
        showNotification(
          "verify-email-error",
          "red",
          "Error",
          "Oops! Seems like the verification link expired. Please try again",
          <IconX size="1rem" />
        );
        //window.location.assign("/login/verify-email"); // back to the email sending screen.
      } else {
        // email was verified successfully.
        window.location.assign("/dashboard");
        console.log("verified success");
        router.push("/dashboard");
      }
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        showNotification(
          "sign-up-error",
          "red",
          "Error",
          err.message,
          <IconX size="1rem" />
        );
      } else {
        showNotification(
          "sign-up-error",
          "red",
          "Error",
          "Oops! Something went wrong.",
          <IconX size="1rem" />
        );
      }
    }
  };

  return consumeVerificationCode;
};

import { sendVerificationEmail } from "supertokens-web-js/recipe/emailverification";
import { useCallback } from 'react';

export function useEmailSend() {
  const router = useRouter();

  return useCallback(async () => {
    try {
      let response = await sendVerificationEmail();
      if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
        console.log("verified success")
        router.push("/dashboard");
      } else {
        showNotification('send-mail-error', 'blue', 'Check mail inbox & Verify', "Please check your email and click the link in it", <IconInfoCircleFilled size="1rem" />);
      }
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        showNotification('send-mail-error', 'red', 'Error', err.message, <IconX size="1rem" />);
      } else {
        showNotification('send-mail-error', 'red', 'Error', "Oops! Something went wrong.", <IconX size="1rem" />);
      }
    }
  }, [router]);
}


