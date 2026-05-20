import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
// save new password
import {
  sendPasswordResetEmail,
  submitNewPassword,
} from "supertokens-auth-react/recipe/emailpassword";

export function useSendResetEmail() {
  const navigate = useNavigate();
  return async function (email: string) {
    try {
      const response = await sendPasswordResetEmail({
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
            toast.error(formField?.error, { id: "email-error" });
          }
        });
      } else {
        // reset password email sent.
        // window.alert("Please check your email for the password reset link")
        toast.success("Please check your email for the password reset link", {
          id: "send-mail-success",
        });
        navigate({
          to: `/login/reset-password?emailTo=${encodeURIComponent(email)}&requestStatus=success`,
        });
        navigate({
          to: `/login/reset-password?emailTo=${encodeURIComponent(email)}&requestStatus=success`,
        });
      }
    } catch (err: any) {
      if (err?.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        toast.error(err?.message, { id: "reset-email-error" });
      } else {
        toast.error("Oops! Something went wrong.", { id: "general-error" });
      }
    }
  };
}

export function useSetNewPassword(open) {
  const navigate = useNavigate();
  return async function (newPassword: string) {
    try {
      const response = await submitNewPassword({
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
            toast.error(formField?.error, { id: "password-error" });
          }
        });
      } else if (response?.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
        // the password reset token in the URL is invalid, expired, or already consumed
        toast.error("Password reset failed. Please try again", {
          id: "reset-error",
        });
        navigate({
          to: "/login",
        }); // back to the login scree.
      } else {
        open();
      }
    } catch (err: any) {
      if (err?.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        toast.error(err?.message, { id: "set-pwd-error" });
      } else {
        toast.error("Oops! Something went wrong.", { id: "set-pwd-error" });
      }
    }
  };
}
