import { signIn } from "supertokens-web-js/recipe/emailpassword";
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