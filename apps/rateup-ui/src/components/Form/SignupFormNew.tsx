import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod/v4";

import { useSendMailPlanSelectDetails } from "@/backend/payment/payment.query";
import type { useSignUp } from "@/utils/auth/index.tsx";

import { useRouteAndCartStore } from "../HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import { Card } from "../ui/card.tsx";
import { AuthShell, AuthTitle } from "./AuthShell.tsx";
import {
  signUpType,
  STEP_ONE_FIELDS,
  STEP_TWO_FIELDS,
  asSignupForm,
  isPasswordValid,
} from "./signup/shared.tsx";
import { SIGNUP_COPY, SIGNUP_TOTAL_STEPS, SignupProgress } from "./signup/SignupProgress.tsx";
import { Step1 } from "./signup/Step1.tsx";
import { Step2 } from "./signup/Step2.tsx";
import { Step3 } from "./signup/Step3.tsx";

export function SignUpFlow({
  setIsLoading,
  signUp,
  isLoading,
}: {
  setIsLoading: (loading: boolean) => void;
  signUp: ReturnType<typeof useSignUp>;
  isLoading: boolean;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const { t: translations } = useTranslation();

  // Only fields that are actually rendered may be required — a required field with no
  // input (as `location` used to be) makes the form permanently invalid.
  const signUpSchema = z.object({
    email: z
      .string()
      .min(1, translations("Email is required"))
      .pipe(z.email(translations("Enter a valid email"))),
    password: z
      .string()
      .min(1, translations("Password is required"))
      .refine(isPasswordValid, {
        message: translations("Your password must meet all security requirements"),
      }),
    name: z.string().min(1, translations("Name is required")),
    orgName: z.string().min(1, translations("Business name is required")),
    website: z.string().optional(),
    phoneNumber: z
      .string()
      .min(1, translations("Phone number is required"))
      .refine((val) => isValidPhoneNumber(val), {
        message: translations("Enter a valid phone number"),
      }),
    industry: z.string().min(1, translations("Industry is required")),
    location: z.string().min(1, translations("Location is required")),
    goals: z.array(z.string()).optional(),
    integrationsSelected: z.array(z.string()).optional(),
    teamSize: z.string().min(1, translations("Team size is required")),
  });

  const signupForm = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      orgName: "",
      website: "",
      phoneNumber: "",
      industry: "",
      location: "",
      goals: [],
      integrationsSelected: [],
      teamSize: "",
    },
  });

  useEffect(() => {
    const newUserFromPricingPage = localStorage.getItem("newUserFromPricingPage");
    if (newUserFromPricingPage) {
      const data = JSON.parse(newUserFromPricingPage);
      signupForm.reset({
        ...signupForm.getValues(),
        email: data.email,
        name: data.name,
        orgName: data.orgName,
      });
    }
  }, []);

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
  const sendMail = useSendMailPlanSelectDetails();

  const { cart } = useRouteAndCartStore();

  const handleSubmit = async () => {
    // Final guard for values prefilled from localStorage and never touched.
    // Validate one step at a time: a bare `trigger()` checks every key in the schema,
    // including ones no step renders, so it can fail with nothing on screen to fix.
    if (!(await signupForm.trigger(STEP_ONE_FIELDS))) {
      setCurrentStep(1);
      return;
    }
    if (!(await signupForm.trigger(STEP_TWO_FIELDS))) {
      setCurrentStep(2);
      return;
    }

    const selectedPlan = JSON.parse(localStorage.getItem("selected_plan") ?? "null");
    if (cart?.planId?.length) {
      sendMail.mutate({
        email: signupForm.getValues("email"),
        name: signupForm.getValues("name"),
        planName: cart?.name,
      });
    }

    setIsLoading(true);
    signUp(
      signupForm.getValues("email"),
      signupForm.getValues("password"),
      signupForm.getValues("name"),
      signupForm.getValues("orgName"),
      signupForm.getValues("phoneNumber"),
      selectedPlan?.id,
      signupForm.getValues("website"),
      signupForm.getValues("industry"),
      signupForm.getValues("location"),
      signupForm.getValues("goals"),
      signupForm.getValues("integrationsSelected"),
      signupForm.getValues("teamSize"),
    ).finally(() => {
      setIsLoading(false);
      localStorage.removeItem("selected_plan");
      localStorage.removeItem("newUserFromPricingPage");
    });
  };
  const copy = SIGNUP_COPY[Math.min(currentStep, SIGNUP_TOTAL_STEPS) - 1];

  return (
    <AuthShell isSignup={true}>
      <div className="flex w-full max-w-108 flex-col gap-3.5">
        <SignupProgress currentStep={currentStep} />

        <Card className="min-h-121 gap-4 rounded-2xl px-6 py-4 shadow-md ring-border sm:px-7.5">
          <AuthTitle title={translations(copy.title)} subtitle={translations(copy.subtitle)} />

          {currentStep === 1 && (
            <Step1
              formData={asSignupForm(signupForm)}
              handleNext={handleNext}
              authType={signUpType.SIGNUP_WITH_EMAIL}
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

export { Step1 } from "./signup/Step1.tsx";
export { Step2 } from "./signup/Step2.tsx";
export { Step3 } from "./signup/Step3.tsx";
export { asSignupForm } from "./signup/shared.tsx";
export type { SignupForm } from "./signup/shared.tsx";
