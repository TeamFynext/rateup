import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@rateup/ui/components/card";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

import type { ICreateGoogleUser } from "@/backend/user/user.api";
import { useUserInfo } from "@/backend/user/user.query";

import { AuthShell, AuthTitle } from "./AuthShell.tsx";
import { asSignupForm } from "./signup/shared.tsx";
import { SIGNUP_COPY, SignupProgress } from "./signup/SignupProgress.tsx";
import { Step1 } from "./signup/Step1.tsx";

function AuthTypeSignupForm({
  setIsLoading,
  createUserMutation,
  createAppleUserMutation,
  isLoading,
  authType,
}: {
  setIsLoading: (loading: boolean) => void;
  createUserMutation: { mutate: (values: ICreateGoogleUser) => void };
  createAppleUserMutation: { mutate: (values: ICreateGoogleUser) => void };
  isLoading: boolean;
  authType?: string | string[];
}) {
  const { data: userInfo } = useUserInfo();
  const navigate = useNavigate();
  const [isUserExist, setIsUserExist] = useState(false);

  useEffect(() => {
    if (userInfo && "data" in userInfo) {
      if (userInfo?.data && userInfo.data?.userId) {
        setIsUserExist(true);
      }
    }
  }, [userInfo]);

  const signupSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Invalid email").optional(),
  });
  const signupForm = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", name: "" },
  });

  const handleSubmit = () => {
    const values = signupForm.getValues();
    setIsLoading(true);
    if (isUserExist) {
      toast.success("Sign up process is already completed");
      navigate({
        to: "/dashboard",
      });
      return;
    }
    const existingCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("referral_code="));
    const referralCode = existingCookie?.split("=")[1];

    const data = {
      name: values.name,
      email: values.email,
      type: authType,
      referralCode: referralCode || undefined,
    };
    if (authType === "apple") {
      createAppleUserMutation.mutate(data);
    } else {
      createUserMutation.mutate(data);
    }
  };

  const copy = SIGNUP_COPY[0];

  return (
    <AuthShell isSignup={true}>
      <div className="flex w-full max-w-108 flex-col gap-3.5">
        <SignupProgress currentStep={1} />

        <Card className="min-h-121 gap-4 rounded-2xl px-6 py-4 shadow-md ring-border sm:px-7.5">
          <AuthTitle title={copy.title} subtitle={copy.subtitle} />
          <Step1
            formData={asSignupForm(signupForm)}
            handleNext={handleSubmit}
            authType={authType}
            submitLabel="Create account"
            submitting={isLoading}
          />
        </Card>
      </div>
    </AuthShell>
  );
}

export default AuthTypeSignupForm;
