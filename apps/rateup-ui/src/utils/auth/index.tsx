import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";
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

/**
 * SuperTokens reports recoverable problems (bad OTP, unknown email, …) as a
 * general error carrying a user-facing message.
 */
export function isSuperTokensGeneralError(
  error: unknown,
): error is { isSuperTokensGeneralError: true; message?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "isSuperTokensGeneralError" in error &&
    (error as { isSuperTokensGeneralError?: unknown }).isSuperTokensGeneralError === true
  );
}

import { useRouteAndCartStore } from "@/components/HomePage/pages/Pricing/store/RouteAndCartStore.ts";

import {
  isEmailVerified,
  refreshEmailVerificationClaim,
  VERIFY_EMAIL_PATH,
} from "./emailVerification.ts";

const handleCreateCode = async (phoneNumber: string, navigate: ReturnType<typeof useNavigate>) => {
  try {
    const response = await createCode({
      phoneNumber,
    });
    if (response.status === "OK") {
      // OTP sent successfully.
      navigate({
        to: `/login/verify-phone-number`,
      });
    } else {
      // this can happen due to automatic account linking. See that section in our docs.
    }
  } catch (err) {
    if (isSuperTokensGeneralError(err)) {
      // this may be a custom error message sent from the API by you,
      // or if the input email / phone number is not valid.
      toast.error(err.message || "Failed to send OTP", {
        id: "load-data",
      });
    } else {
      toast.error("Oops! Something went wrong.", {
        id: "load-data",
      });
    }
  }
};
export function useSignIn() {
  const navigate = useNavigate();
  const { route } = useRouteAndCartStore();

  return async function (email?: string, password?: string, phoneNumber?: string) {
    try {
      if (phoneNumber) {
        await handleCreateCode(phoneNumber, navigate);
      } else {
        const response = await signIn({
          formFields: [
            {
              id: "email",
              value: email ?? "",
            },
            {
              id: "password",
              value: password ?? "",
            },
          ],
        });

        if (response?.status === "FIELD_ERROR") {
          response?.formFields?.forEach((formField) => {
            if (formField?.id === "email") {
              // Email validation failed (for example incorrect email syntax).
              toast.error(formField?.error || "Invalid email", {
                id: "load-data",
              });
            }
          });
        } else if (response?.status === "WRONG_CREDENTIALS_ERROR") {
          // Email password combination is incorrect.
          toast.error("Email password combination is incorrect.", {
            id: "load-data",
          });
        } else {
          // sign in successful. The session tokens are automatically handled by
          // the frontend SDK.
          //
          // A session now exists, but the API runs EmailVerification in REQUIRED mode:
          // every guarded route answers 403 "invalid claim" until the email is verified,
          // and /dashboard reads that as "no account" and sends the visitor back to
          // /login — which, seeing a session, sends them to /dashboard again. Landing an
          // unverified sign-in on the verify page is what breaks that loop.
          const verified = await isEmailVerified();
          navigate({
            to: verified ? route : VERIFY_EMAIL_PATH,
          });
        }
      }
    } catch (err) {
      if (isSuperTokensGeneralError(err)) {
        // this may be a custom error message sent from the API by you.
        toast.error(err?.message || "Error", { id: "load-data" });
      } else {
        toast.error("Oops! Something went wrong.", { id: "load-data" });
      }
    }
  };
}

export async function resendOTP() {
  try {
    const response = await resendCode();

    if (response.status === "RESTART_FLOW_ERROR") {
      // this can happen if the user has already successfully logged in into
      // another device whilst also trying to login to this one.

      // we clear the login attempt info that was added when the createCode function
      // was called - so that if the user does a page reload, they will now see the
      // enter email / phone UI again.
      await clearLoginAttemptInfo();
      toast.error("Login failed. Please try again", { id: "load-data" });
      window.location.assign("/login");
    } else {
      toast.success("Otp resend sucessfully", { id: "load-data" });
    }
  } catch (err) {
    console.log(err);

    if (isSuperTokensGeneralError(err)) {
      // this may be a custom error message sent from the API by you.
      toast.error(err.message || "Failed", { id: "load-data" });
    } else {
      toast.error("Oops! Something went wrong.", { id: "load-data" });
    }
  }
}

export function useSignUp() {
  const navigate = useNavigate();

  return async function (
    email: string,
    password: string,
    name: string,
    orgName: string,
    phoneNumber: string,
    planId?: string,
    website?: string,
    industry?: string,
    location?: string,
    // Both arrive as the multi-select arrays the signup wizard collects.
    goals?: string[],
    integrationsSelected?: string[],
    teamSize?: string,
  ) {
    try {
      const existingCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("referral_code="));
      const referralCode = existingCookie?.split("=")[1];

      const optionalFormFields: Array<{ id: string; value: string | string[] | null }> = [
        {
          id: "phoneNumber",
          value: phoneNumber || null,
        },
        {
          id: "planId",
          value: planId || null,
        },
        {
          id: "website",
          value: website || null,
        },
        {
          id: "industry",
          value: industry || null,
        },
        {
          id: "location",
          value: location || null,
        },
        {
          id: "goals",
          value: goals || null,
        },
        {
          id: "integrationsSelected",
          value: integrationsSelected || null,
        },
        {
          id: "teamSize",
          value: teamSize || null,
        },
        {
          id: "referralCode",
          value: referralCode || null,
        },
      ].filter((field) => field.value !== null);

      const response = await signUp({
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
          ...optionalFormFields,
          // `goals` and `integrationsSelected` are sent as the arrays the signup
          // wizard collects, which SuperTokens' formFields type does not model.
        ] as Array<{ id: string; value: string }>,
      });

      if (response?.status === "FIELD_ERROR") {
        response?.formFields?.forEach((formField) => {
          if (formField?.id === "email") {
            // Email validation failed (for example incorrect email syntax),
            // or the email is not unique.
            toast.error(formField?.error || "Invalid email", {
              id: "load-data",
            });
          } else if (formField?.id === "password") {
            // Password validation failed.
            // Maybe it didn't match the password strength
            toast.error(formField?.error || "Invalid password", {
              id: "load-data",
            });
          }
        });
      } else {
        // sign up successful. The session tokens are automatically handled by
        // the frontend SDK.
        //
        // Signing up is the one moment that sends a verification email. Nothing else
        // does — the API only registers the claim validator, and the verify screen no
        // longer sends on mount, because it is also reached by a refresh and by every
        // later login. Anyone who needs another has the Resend button there.
        try {
          await sendVerificationEmail();
        } catch (err) {
          // Navigate regardless: the verify screen can resend, which is a better
          // outcome than a signup that appears to have failed.
          console.error("Failed to send the verification email:", err);
        }
        navigate({
          to: VERIFY_EMAIL_PATH,
        });
      }
      // }
    } catch (err) {
      if (isSuperTokensGeneralError(err)) {
        // this may be a custom error message sent from the API by you.
        toast.error(err?.message || "Failed", { id: "load-data" });
      } else {
        console.log(err);
        toast.error("Oops! Something went wrong.", { id: "load-data" });
      }
    }
  };
}

export const useConsumeVerificationCode = () => {
  const navigate = useNavigate();
  const consumeVerificationCode = async () => {
    toast.loading("Hold on, We are verifying your email...", {
      id: "verify-email",
    });
    try {
      const response = await verifyEmail();
      if (response?.status === "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR") {
        // This can happen if the verification code is expired or invalid.
        // You should ask the user to retry
        toast.error("Verification link expired. Please try again.", {
          id: "verify-email",
        });
        // window.location.assign("/login/verify-email"); // back to the email sending screen.
      } else {
        // email was verified successfully.
        toast.success("Verified email successfully.", {
          id: "verify-email",
        });
        // <SessionAuth> guards /dashboard with the `st-ev` session claim, and a `false`
        // value is cached in the access token payload for ~10s before it is refetched.
        // Without this refresh the dashboard redirects straight back here, and this page
        // sends the user to the dashboard again — the two bounce off each other.
        await refreshEmailVerificationClaim();
        // Verifying the address is the last step of signing up, so this lands on
        // the success screen rather than the dashboard: it says what was set up
        // and hands over from there.
        navigate({
          to: "/signup/success",
        });
      }
    } catch (err) {
      if (isSuperTokensGeneralError(err)) {
        // this may be a custom error message sent from the API by you.
        toast.error(err?.message || "Error", {
          id: "verify-email",
        });
      } else {
        toast.error("Oops! Something went wrong.", { id: "verify-email" });
      }
    }
  };

  return consumeVerificationCode;
};

export function useEmailSend() {
  const navigate = useNavigate();

  return useCallback(async () => {
    try {
      const response = await sendVerificationEmail();
      if (response?.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
        // The backend says verified but the session claim may still say otherwise.
        // Refresh it first, or /dashboard sends the user right back here.
        await refreshEmailVerificationClaim();
        navigate({
          to: "/dashboard",
        });
      } else {
        toast.info("Please check your email and click the link in it", {
          id: "send-mail-error",
        });
      }
    } catch (err) {
      if (isSuperTokensGeneralError(err)) {
        toast.error(err?.message || "Error", { id: "send-mail-error" });
      } else {
        toast.error("Oops! Something went wrong.", { id: "send-mail-error" });
      }
    }
  }, [navigate]);
}
