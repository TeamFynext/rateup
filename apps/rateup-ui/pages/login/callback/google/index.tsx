import React, {useEffect} from 'react'
import { thirdPartySignInAndUp } from "supertokens-web-js/recipe/thirdpartyemailpassword";
import { useRouter } from 'next/router';
import { IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { LoadingOverlay, Text } from '@mantine/core';
const index = () => {
    const router = useRouter();

async function handleGoogleCallback() {
    try {
        const response = await thirdPartySignInAndUp();

        if (response.status === "OK") {
            console.log(response.user)
            if (response.createdNewUser) {
                // sign up successful

                router.push('/signup?auth=google');

                notifications.show({
                    id: 'load-data',
                    color: 'teal',
                    title: 'Success',
                    message: 'Sign up process is Complete!',
                    icon: <IconCheck size="1rem" />,
                    autoClose: 3000,
                  });
            } else {
                // sign in successful
                notifications.show({
                    id: 'load-data',
                    color: 'teal',
                    title: 'Success',
                    message: 'Login Successful..',
                    icon: <IconCheck size="1rem" />,
                    autoClose: 3000,
                  });

                  router.push('/dashboard');
            }
            //window.location.assign("/home");
        } else {
            // SuperTokens requires that the third party provider
            // gives an email for the user. If that's not the case, sign up / in
            // will fail.

            // As a hack to solve this, you can override the backend functions to create a fake email for the user.
            //TODO remov alert
            window.alert("No email provided by social login. Please use another form of login");
            window.location.assign("/logout"); // redirect back to login page
        }
    } catch (err: any) {
        if (err.isSuperTokensGeneralError === true) {
            // this may be a custom error message sent from the API by you.
            window.alert(err.message);
        } else {
            window.alert("Oops! Something went wrong.");
            //TODO remov alert

        }
    }
}


useEffect(() => {
    handleGoogleCallback()
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingOverlay visible />
            <Text pt="7rem" size="md">
                    Signing with Google... Please wait...
            </Text>
     </div>

  )
}

export default index