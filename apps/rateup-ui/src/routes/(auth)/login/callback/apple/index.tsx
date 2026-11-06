import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { signInAndUp } from "supertokens-auth-react/recipe/thirdparty";

import { Spinner } from "@/components/ui/spinner";
import { isSuperTokensGeneralError } from "@/utils/auth/index.tsx";

export const Route = createFileRoute("/(auth)/login/callback/apple/")({
  component: AppleCallback,
});

function AppleCallback() {
  const navigate = useNavigate();

  async function handleAppleCallback() {
    try {
      const response = await signInAndUp();
      if (response.status === "OK") {
        if (response.createdNewRecipeUser && response.user.loginMethods.length === 1) {
          // sign up successful
          navigate({
            to: "/signup",
            search: { auth: "apple" },
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
    } catch (err) {
      if (isSuperTokensGeneralError(err)) {
        console.log(err);
        // this may be a custom error message sent from the API by you.
        // window.alert(err.message);
        toast.error(err.message, {
          id: "load-data",
        });
        navigate({
          to: "/logout",
        });
        console.log("Redirecting to logout...");
      } else {
        toast.error("Oops! Something went wrong" + JSON.stringify(err), {
          id: "load-data",
        });
        navigate({
          to: "/logout",
        });
        console.log("Redirecting to logout...");
      }
    }
  }

  useEffect(() => {
    handleAppleCallback();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Spinner className="size-8" />
      <p className="pt-28 text-base">Signing with Apple... Please wait...</p>
    </div>
  );
}
