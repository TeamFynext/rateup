import { LoadingOverlay, Text } from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useEffect } from "react";
import { toast } from "sonner";
import { signInAndUp } from "supertokens-auth-react/recipe/thirdparty";

export const Route = createFileRoute("/(auth)/login/callback/google/")({
  component: GoogleCallbacck,
});

function GoogleCallbacck() {
  const navigate = useNavigate();

  async function handleGoogleCallback() {
    try {
      const response = await signInAndUp();

      if (response.status === "OK") {
        if (response.createdNewRecipeUser && response.user.loginMethods.length === 1) {
          // sign up successful
          navigate({
            to: "/signup?auth=google",
          });

          toast.success("Sign up success", {
            id: "load-data",
          });
        } else {
          // login successful
          toast.success("Login Successful..", {
            id: "load-data",
          });

          // router.push("/signup?auth=google");

          navigate({
            to: "/dashboard",
          });
        }
        // window.location.assign("/home");
      } else {
        // SuperTokens requires that the third party provider
        // gives an email for the user. If that's not the case, sign up / in
        // will fail.

        // As a hack to solve this, you can override the backend functions to create a fake email for the user.
        // TODO remov alert
        window.alert("No email provided by social login. Please use another form of login");
        window.location.assign("/logout"); // redirect back to login page
      }
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        console.log(err);
        // this may be a custom error message sent from the API by you.
        // window.alert(err.message);
        toast.error(err.message, {
          id: "load-data",
        });
        navigate({
          to: "/logout",
        });
      } else {
        toast.error("Oops! Something went wrong" + JSON.stringify(err), {
          id: "load-data",
        });
        navigate({
          to: "/logout",
        });
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
}
