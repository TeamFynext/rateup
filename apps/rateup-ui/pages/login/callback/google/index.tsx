import React, { useEffect } from "react";
import { thirdPartySignInAndUp } from "supertokens-web-js/recipe/thirdpartyemailpassword";
import { useRouter } from "next/router";
import { IconCheck, IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { LoadingOverlay, Text } from "@mantine/core";
const index = () => {
  const router = useRouter();

  async function handleGoogleCallback() {
    try {
      const response = await thirdPartySignInAndUp();

      if (response.status === "OK") {
        if (response.createdNewUser) {
          // sign up successful
          router.push("/signup?auth=google");

          notifications.show({
            id: "load-data",
            color: "teal",
            title: "Success",
            message: "Sign up success",
            icon: <IconCheck size="1rem" />,
            autoClose: 3000,
          });
        } else {
          // sign in successful
          notifications.show({
            id: "load-data",
            color: "teal",
            title: "Success",
            message: "Login Successful..",
            icon: <IconCheck size="1rem" />,
            autoClose: 3000,
          });

          router.push("/dashboard");
        }
        //window.location.assign("/home");
      } else {
        // SuperTokens requires that the third party provider
        // gives an email for the user. If that's not the case, sign up / in
        // will fail.

        // As a hack to solve this, you can override the backend functions to create a fake email for the user.
        //TODO remov alert
        window.alert(
          "No email provided by social login. Please use another form of login",
        );
        window.location.assign("/logout"); // redirect back to login page
      }
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        // window.alert(err.message);
        notifications.show({
          id: "load-data",
          color: "red",
          title: "Error",
          message: err.message,
          icon: <IconX size="1rem" />,
          autoClose: 6000,
        });
        router.push("/logout");
      } else {
        notifications.show({
          id: "load-data",
          color: "red",
          title: "Error",
          message: "Oops! Something went wrong..." + err,
          icon: <IconX size="1rem" />,
          autoClose: 6000,
        });
        router.push("/logout");
      }
    }
  }

  useEffect(() => {
    handleGoogleCallback();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LoadingOverlay visible />
      <Text pt="7rem" size="md">
        Signing with Google... Please wait...
      </Text>
    </div>
  );
};

export default index;
