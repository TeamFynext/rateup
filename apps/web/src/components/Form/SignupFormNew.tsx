import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";

import type { useSignUp } from "@/utils/auth/index.tsx";

import { Card } from "../ui/card.tsx";
import { AuthShell, AuthTitle } from "./AuthShell.tsx";
import { signUpType, STEP_ONE_FIELDS, asSignupForm, isPasswordValid } from "./signup/shared.tsx";
import { SIGNUP_COPY, SignupProgress } from "./signup/SignupProgress.tsx";
import { Step1 } from "./signup/Step1.tsx";

export function SignUpFlow({
  setIsLoading,
  signUp,
  isLoading,
}: {
  setIsLoading: (loading: boolean) => void;
  signUp: ReturnType<typeof useSignUp>;
  isLoading: boolean;
}) {
  const { t: translations } = useTranslation();

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
  });

  const signupForm = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", name: "", password: "" },
  });

  // The pricing page's business name waits in storage for `/signup/business`.
  useEffect(() => {
    const newUserFromPricingPage = localStorage.getItem("newUserFromPricingPage");
    if (newUserFromPricingPage) {
      const data = JSON.parse(newUserFromPricingPage);
      signupForm.reset({ ...signupForm.getValues(), email: data.email, name: data.name });
    }
  }, []);

  const handleSubmit = async () => {
    // Final guard for values prefilled from localStorage and never touched.
    if (!(await signupForm.trigger(STEP_ONE_FIELDS))) return;

    const selectedPlan = JSON.parse(localStorage.getItem("selected_plan") ?? "null");

    setIsLoading(true);
    signUp(
      signupForm.getValues("email"),
      signupForm.getValues("password"),
      signupForm.getValues("name"),
      selectedPlan?.id,
    ).finally(() => {
      setIsLoading(false);
      localStorage.removeItem("selected_plan");
    });
  };
  const copy = SIGNUP_COPY[0];

  return (
    <AuthShell isSignup={true}>
      <div className="flex w-full max-w-108 flex-col gap-3.5">
        <SignupProgress currentStep={1} />

        <Card className="min-h-121 gap-4 rounded-2xl px-6 py-4 shadow-md ring-border sm:px-7.5">
          <AuthTitle title={translations(copy.title)} subtitle={translations(copy.subtitle)} />
          <Step1
            formData={asSignupForm(signupForm)}
            handleNext={handleSubmit}
            authType={signUpType.SIGNUP_WITH_EMAIL}
            submitLabel="Create account"
            submitting={isLoading}
          />
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
