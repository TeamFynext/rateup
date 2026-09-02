import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

import type { ICreateGoogleUser } from "@/backend/user/user.api";
import { useUserInfo } from "@/backend/user/user.query";

import { Card } from "../ui/card.tsx";
import { AuthShell, AuthTitle } from "./AuthShell.tsx";
import { SIGNUP_COPY, SIGNUP_TOTAL_STEPS, SignupProgress } from "./signup/SignupProgress.tsx";
import { Step1, Step2, Step3 } from "./SignupFormNew.tsx";
import { asSignupForm } from "./SignupFormNew.tsx";

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
  const [currentStep, setCurrentStep] = useState(1);
  const [isUserExist, setIsUserExist] = useState(false);

  useEffect(() => {
    if (userInfo && "data" in userInfo) {
      if (userInfo?.data && userInfo.data?.userId) {
        setIsUserExist(true);
      }
    }
  }, [userInfo]);

  const signupSchema = z.object({
    name: z.string().min(4, "Name should be at least 4 characters long"),

    orgName: z.string().min(4, "Organization name should be at least 4 characters long"),

    email: z.email("Invalid email").optional(),

    // `.optional()` only permits `undefined`, but the field defaults to "" — accept
    // the empty string explicitly so a blank optional website doesn't block the step.
    website: z.literal("").or(z.url("Invalid website URL")).optional(),

    phoneNumber: z.string().optional(),

    industry: z.string().optional(),

    location: z.string().optional(),

    goals: z.array(z.string()),

    integrationsSelected: z.array(z.string()),
  });
  const signupForm = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      name: "",
      orgName: "",
      website: "",
      phoneNumber: "",
      industry: "",
      location: "",
      goals: [],
      integrationsSelected: [],
    },
  });

  const handleNext = () => {
    if (currentStep < SIGNUP_TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

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
      name: values?.name ?? "",
      orgName: values?.orgName ?? "",
      email: values?.email,
      type: authType,
      industry: values?.industry,
      website: values?.website,
      phoneNumber: values?.phoneNumber,
      location: values?.location,
      goals: values?.goals,
      integrationsSelected: values?.integrationsSelected,
      referralCode: referralCode || undefined,
    };
    if (authType === "apple") {
      createAppleUserMutation.mutate(data);
    } else {
      createUserMutation.mutate(data);
    }
  };

  const copy = SIGNUP_COPY[Math.min(currentStep, SIGNUP_TOTAL_STEPS) - 1];

  return (
    <AuthShell isSignup={true}>
      <div className="flex w-full max-w-108 flex-col gap-3.5">
        <SignupProgress currentStep={currentStep} />

        <Card className="min-h-121 gap-4 rounded-2xl px-6 py-4 shadow-md ring-border sm:px-7.5">
          <AuthTitle title={copy.title} subtitle={copy.subtitle} />

          {currentStep === 1 && (
            <Step1
              formData={asSignupForm(signupForm)}
              handleNext={handleNext}
              authType={authType}
            />
          )}
          {currentStep === 2 && (
            <Step2
              formData={asSignupForm(signupForm)}
              handleBack={handleBack}
              handleNext={handleNext}
            />
          )}
          {currentStep === 3 && (
            <Step3
              formData={asSignupForm(signupForm)}
              handleBack={handleBack}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          )}
        </Card>
      </div>
    </AuthShell>
  );
}

export default AuthTypeSignupForm;
