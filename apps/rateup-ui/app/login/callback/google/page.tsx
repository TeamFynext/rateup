"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LoadingOverlay, Text } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { signInAndUp } from "supertokens-auth-react/recipe/thirdparty";

const GoogleCallbacck = () => {
  const router = useRouter();

  async function handleGoogleCallback() {
    try {
      const response = await signInAndUp();

      if (response.status === "OK") {
        if (
          response.createdNewRecipeUser &&
          response.user.loginMethods.length === 1
        ) {
          // sign up successful
          router.push("/signup?auth=google");

          toast.loading("Sign up success", {
            id: "load-data",
          });
        } else {
          // login successful
          toast.loading("Login Successful..", {
            id: "load-data",
          });

          // router.push("/signup?auth=google");

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
        console.log(err);
        // this may be a custom error message sent from the API by you.
        // window.alert(err.message);
        toast.loading(err.message, {
          id: "load-data",
        });
        router.push("/logout");
      } else {
        toast.loading("Oops! Something went wrong" + JSON.stringify(err), {
          id: "load-data",
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

export default GoogleCallbacck;
