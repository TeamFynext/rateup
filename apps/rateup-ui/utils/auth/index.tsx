import { JSX, useCallback } from "react";
import { useRouter } from "next/navigation";

import { notifications } from "@mantine/notifications";
import { IconCheck, IconInfoCircleFilled, IconX } from "@tabler/icons-react";
import { signIn, signUp } from "supertokens-auth-react/recipe/emailpassword";
import {
  sendVerificationEmail,
  verifyEmail,
} from "supertokens-auth-react/recipe/emailverification";
import {
  clearLoginAttemptInfo,
  createCode,
  resendCode,
} from "supertokens-auth-react/recipe/passwordless";

import { useRouteAndCartStore } from "../../components/HomePage/pages/Pricing/store/RouteAndCartStore";

const handleCreateCode = async (phoneNumber: string, router) => {
  try {
    let response = await createCode({
      phoneNumber,
    });
    if (response.status !== "OK") {
      // this can happen due to automatic account linking. See that section in our docs.
    } else {
      // OTP sent successfully.
      router.push(`/login/verify-phone-number`);
    }
  } catch (err: any) {
    if (err.isSuperTokensGeneralError === true) {
      // this may be a custom error message sent from the API by you,
      // or if the input email / phone number is not valid.
      showNotification(
        "load-data",
        "red",
        "Failed",
        err.message,
        <IconX size="1rem" />,
      );
    } else {
      showNotification(
        "load-data",
        "red",
        "Failed",
        "Oops! Something went wrong.",
        <IconX size="1rem" />,
      );
    }
  }
};
export function useSignIn() {
  const router = useRouter();
  const { route } = useRouteAndCartStore();

  return async function (email: string, password: string, phoneNumber: string) {
    try {
      if (phoneNumber) {
        await handleCreateCode(phoneNumber, router);
      } else {
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

        if (response?.status === "FIELD_ERROR") {
          response?.formFields?.forEach((formField) => {
            if (formField?.id === "email") {
              // Email validation failed (for example incorrect email syntax).
              showNotification(
                "load-data",
                "red",
                "Error",
                formField?.error,
                <IconX size="1rem" />,
              );
            }
          });
        } else if (response?.status === "WRONG_CREDENTIALS_ERROR") {
          // Email password combination is incorrect.
          showNotification(
            "load-data",
            "red",
            "Failed",
            "Email password combination is incorrect.",
            <IconX size="1rem" />,
          );
        } else {
          // sign in successful. The session tokens are automatically handled by
          // the frontend SDK.
          router.push(route);
        }
      }
    } catch (err: any) {
      if (err?.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        showNotification(
          "load-data",
          "red",
          "Error",
          err?.message,
          <IconX size="1rem" />,
        );
      } else {
        showNotification(
          "load-data",
          "red",
          "Error",
          "Oops! Something went wrong.",
          <IconX size="1rem" />,
        );
      }
    }
  };
}

export function showNotification(
  id: string,
  color: string,
  title: string,
  message: string,
  icon: JSX.Element,
  autoClose: number = 4000,
) {
  notifications.show({
    id,
    color,
    title,
    message,
    icon,
    autoClose,
  });
}

export async function sendOTP(phoneNumber: string) {
  const router = useRouter();

  try {
    let response = await createCode({
      phoneNumber,
    });
    if (response.status !== "OK") {
      // this can happen due to automatic account linking. See that section in our docs.
    } else {
      // OTP sent successfully.
      router.push("/login/verify-email");
    }
  } catch (err: any) {
    if (err.isSuperTokensGeneralError === true) {
      // this may be a custom error message sent from the API by you,
      // or if the input email / phone number is not valid.
      showNotification(
        "load-data",
        "red",
        "Error",
        err.message,
        <IconX size="1rem" />,
      );
    } else {
      showNotification(
        "load-data",
        "red",
        "Error",
        "Oops! Something went wrong.",
        <IconX size="1rem" />,
      );
    }
  }
}
export async function resendOTP() {
  try {
    let response = await resendCode();

    if (response.status === "RESTART_FLOW_ERROR") {
      // this can happen if the user has already successfully logged in into
      // another device whilst also trying to login to this one.

      // we clear the login attempt info that was added when the createCode function
      // was called - so that if the user does a page reload, they will now see the
      // enter email / phone UI again.
      await clearLoginAttemptInfo();
      showNotification(
        "load-data",
        "red",
        "Failed",
        "Login failed. Please try again",
        <IconX size="1rem" />,
      );
      window.location.assign("/login");
    } else {
      showNotification(
        "load-data",
        "green",
        "Sucess",
        "Otp resend sucessfully",
        <IconCheck size="1rem" />,
      );
    }
  } catch (err: any) {
    console.log(err);

    if (err.isSuperTokensGeneralError === true) {
      // this may be a custom error message sent from the API by you.
      showNotification(
        "load-data",
        "red",
        "Failed",
        err.message,
        <IconX size="1rem" />,
      );
    } else {
      showNotification(
        "load-data",
        "red",
        "Failed",
        "Oops! Something went wrong.",
        <IconX size="1rem" />,
      );
    }
  }
}

export function useSignUp() {
  const router = useRouter();

  return async function (
    email: string,
    password: string,
    name: string,
    orgName: string,
    phoneNumber: string,
    planId?: string,
  ) {
    try {
      // if (phoneNumber) {
      //   await handleCreateCode(phoneNumber, router);
      // } else {
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
          {
            id: "name",
            value: name,
          },
          {
            id: "orgName",
            value: orgName,
          },
          {
            id: "phoneNumber",
            value: phoneNumber || null,
          },
          {
            id: "planId",
            value: planId || null,
          },
        ],
      });

      if (response?.status === "FIELD_ERROR") {
        response?.formFields?.forEach((formField) => {
          if (formField?.id === "email") {
            // Email validation failed (for example incorrect email syntax),
            // or the email is not unique.
            showNotification(
              "sign-up-error",
              "red",
              "Error",
              formField?.error,
              <IconX size="1rem" />,
            );
          } else if (formField?.id === "password") {
            // Password validation failed.
            // Maybe it didn't match the password strength
            showNotification(
              "sign-up-error",
              "red",
              "Error",
              formField?.error,
              <IconX size="1rem" />,
            );
          }
        });
      } else {
        // sign up successful. The session tokens are automatically handled by
        // the frontend SDK.
        router.push("/login/verify-email");
        //consumeVerificationCode()
      }
      // }
    } catch (err: any) {
      if (err?.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        showNotification(
          "sign-up-error",
          "red",
          "Error",
          err?.message,
          <IconX size="1rem" />,
        );
      } else {
        showNotification(
          "sign-up-error",
          "red",
          "Error",
          "Oops! Something went wrong.",
          <IconX size="1rem" />,
        );
      }
    }
  };
}

export const useConsumeVerificationCode = () => {
  const router = useRouter();
  const consumeVerificationCode = async (route) => {
    notifications.show({
      id: "verify-email",
      loading: true,
      title: "Verifying email",
      message: `Hold on, We are verifying your email...`,
      autoClose: false,
      withCloseButton: false,
    });

    try {
      let response = await verifyEmail();
      if (response?.status === "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR") {
        // This can happen if the verification code is expired or invalid.
        // You should ask the user to retry
        showNotification(
          "verify-email",
          "red",
          "Error",
          "Oops! Seems like the verification link expired. Please try again",
          <IconX size="1rem" />,
        );
        //window.location.assign("/login/verify-email"); // back to the email sending screen.
      } else {
        // email was verified successfully.
        notifications.update({
          id: "verify-email",
          color: "teal",
          loading: false,
          title: "Success",
          message: "Verified email successfully.",
          icon: <IconCheck size="1rem" />,
          autoClose: 3000,
        });
        // router.push(route);
        router.push("/login/complete-login");
      }
    } catch (err: any) {
      if (err?.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        showNotification(
          "verify-email",
          "red",
          "Error",
          err?.message,
          <IconX size="1rem" />,
        );
      } else {
        showNotification(
          "verify-email",
          "red",
          "Error",
          "Oops! Something went wrong.",
          <IconX size="1rem" />,
        );
      }
    }
  };

  return consumeVerificationCode;
};

export function useEmailSend() {
  const router = useRouter();

  return useCallback(async () => {
    try {
      let response = await sendVerificationEmail();
      if (response?.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
        router.push("/dashboard");
      } else {
        showNotification(
          "send-mail-error",
          "blue",
          "Check mail inbox & Verify",
          "Please check your email and click the link in it",
          <IconInfoCircleFilled size="1rem" />,
        );
      }
    } catch (err: any) {
      if (err?.isSuperTokensGeneralError === true) {
        showNotification(
          "send-mail-error",
          "red",
          "Error",
          err?.message,
          <IconX size="1rem" />,
        );
      } else {
        showNotification(
          "send-mail-error",
          "red",
          "Error",
          "Oops! Something went wrong.",
          <IconX size="1rem" />,
        );
      }
    }
  }, [router]);
}
