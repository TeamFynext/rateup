import { sendPasswordResetEmail } from "supertokens-web-js/recipe/emailpassword";
import { IconInfoCircleFilled, IconX , IconCheck} from "@tabler/icons-react";
import { useRouter } from "next/router";


export function useSendResetEmail() {
    const router = useRouter();
    return async function(email: string) {
        try {
            let response = await sendPasswordResetEmail({
                formFields: [{
                    id: "email",
                    value: email
                }]
            });
    
            if (response.status === "FIELD_ERROR") {
                // one of the input formFields failed validaiton
                response.formFields.forEach(formField => {
                    if (formField.id === "email") {
                        // Email validation failed (for example incorrect email syntax).
                        window.alert(formField.error)
                    }
                })
            } else {
                // reset password email sent.
                //window.alert("Please check your email for the password reset link")
                showNotification('send-mail-error', 'teal', 'Reset Email Sent', 
    
                "Please check your email for the password reset link", <IconCheck size="1rem" />);
               router.push(`/login/reset-password?emailTo=${encodeURIComponent(email)}&requestStatus=success`);
    
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
}


//save new password

import { submitNewPassword } from "supertokens-web-js/recipe/emailpassword";
import { showNotification } from ".";

export async function setNewPassword(newPassword: string) {
    try {
        let response = await submitNewPassword({
            formFields: [{
                id: "password",
                value: newPassword
            }]
        });

        if (response.status === "FIELD_ERROR") {
            response.formFields.forEach(formField => {
                if (formField.id === "password") {
                    // New password did not meet password criteria on the backend.
                    window.alert(formField.error)
                }
            })
        } else if (response.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
            // the password reset token in the URL is invalid, expired, or already consumed
            window.alert("Password reset failed. Please try again")
            window.location.assign("/login") // back to the login scree.
        } else {
            window.alert("Password reset successful!")
            window.location.assign("/login")
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