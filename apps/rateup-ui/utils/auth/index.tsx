import { signIn , signUp} from "supertokens-web-js/recipe/emailpassword";
import { useRouter } from "next/router";
import { IconCheck, IconX } from "@tabler/icons-react";
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

function showNotification(id: string, color: string, title: string, message: string, icon: JSX.Element, autoClose: number = 4000) {
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
        //router.push("/dashboard");
        consumeVerificationCode()
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

async function consumeVerificationCode() {
    try {
        let response = await verifyEmail();
        if (response.status === "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR") {
            // This can happen if the verification code is expired or invalid.
            // You should ask the user to retry
            window.alert("Oops! Seems like the verification link expired. Please try again")
            window.location.assign("/login/verify-email") // back to the email sending screen.
        } else {
            // email was verified successfully.
            window.location.assign("/dashboard")
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



import { sendVerificationEmail } from "supertokens-web-js/recipe/emailverification";

export async function sendEmail() {
    try {
        let response = await sendVerificationEmail();
        if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
            // This can happen if the info about email verification in the session was outdated.
            // Redirect the user to the home page
            window.location.assign("/dashbard");
        } else {
            // email was sent successfully.
            window.alert("Please check your email and click the link in it")
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