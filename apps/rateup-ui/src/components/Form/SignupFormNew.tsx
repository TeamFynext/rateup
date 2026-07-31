import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { Briefcase, Sparkles, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod/v4";

import { useSendMailPlanSelectDetails } from "@/backend/payment/payment.query";
import type { useSignUp } from "@/utils/auth/index.tsx";

import { useRouteAndCartStore } from "../HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import { Card } from "../ui/card.tsx";
import { AuthHeader } from "./AuthHeader.tsx";
import {
  signUpType,
  STEP_ONE_FIELDS,
  STEP_TWO_FIELDS,
  asSignupForm,
  isPasswordValid,
} from "./signup/shared.tsx";
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
  const navigate = useNavigate();
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

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;
  const handleNext = () => {
    if (currentStep < totalSteps) {
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
  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Create Your Account";
      case 2:
        return "Tell Us About Your Business";
      case 3:
        return "What are you most excited to use?";
      default:
        return "";
    }
  };
  const getStepSubtitle = () => {
    switch (currentStep) {
      case 1:
        return "Reimagine customer engagement — set up RateUp in under two minutes.";
      case 2:
        return "We'll personalize templates, automations and onboarding for your industry.";
      case 3:
        return "Select all that apply — we'll tailor your dashboard, templates and onboarding tour.";
      default:
        return "";
    }
  };
  const getStepShortTitle = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-primary flex items-center gap-1">
            <UserPlus size={12} strokeWidth={2.5} /> <span className="text-xs">Get started</span>
          </div>
        );
      case 2:
        return (
          <div className="text-primary flex items-center gap-1">
            <Briefcase size={12} strokeWidth={2.5} /> <span className="text-xs">Your business</span>
          </div>
        );
      case 3:
        return (
          <div className="text-primary flex items-center gap-1">
            <Sparkles size={12} strokeWidth={2.5} /> <span className="text-xs">Personalize</span>
          </div>
        );
      default:
        return "";
    }
  };
  return (
    <div className="min-h-screen flex flex-col w-full bg-linear-to-br from-blue-50/40 via-purple-50/30 to-pink-50/40 relative dark:bg-linear-to-br dark:from-gray-900/80 dark:via-gray-900/60 dark:to-gray-900/80">
      <div className="sticky top-0 z-50 w-full">
        <AuthHeader isSignup={true} maxWidth="max-w-md" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center w-full p-3 sm:p-4 md:p-6">
        <div className="w-full max-w-md mx-auto">
          {/* progress bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="text-xs font-semibold text-gray-500 tracking-wider uppercase">
                Step {currentStep} of {totalSteps}
              </div>
              <div className="text-xs font-semibold text-gray-500 tabular-nums">
                {Math.round(progress)}% complete
              </div>
            </div>

            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, index) => {
                let fill = 0;

                if (index < currentStep - 1) {
                  fill = 1; // fully filled
                } else if (index === currentStep - 1) {
                  const segmentProgress = (progress / 100) * totalSteps - index;
                  fill = Math.max(0, Math.min(segmentProgress, 1));
                }

                const isActive = index === currentStep - 1;

                return (
                  <div key={index} className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full bg-primary ${isActive ? "shadow-md" : ""}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: fill }}
                      transition={{
                        duration: 0.6,
                        ease: [0.22, 1, 0.36, 1], // smooth ease-out
                      }}
                      style={{ originX: 0 }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <Card className="p-6 shadow-sm border border-gray-200 mb-8">
            <div className="flex flex-col">
              <p className="text-sm font-semibold capitalize text-primary">{getStepShortTitle()}</p>
              <h2 className="text-xl font-bold">{getStepTitle()}</h2>
              <p className="font-normal text-[11px]">{getStepSubtitle()}</p>
            </div>
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
          <div className="flex items-center justify-center gap-6 mt-8 text-xs text-gray-400">
            <button
              onClick={() =>
                navigate({
                  to: "/privacy-policy",
                })
              }
              className="hover:text-gray-600 uppercase tracking-wider text-xs"
            >
              <span className="uppercase tracking-wider text-xs">Privacy Policy</span>
            </button>
            <button
              onClick={() =>
                navigate({
                  to: "/terms-of-service",
                })
              }
              className="hover:text-gray-600 uppercase tracking-wider text-xs"
            >
              <span className="uppercase tracking-wider text-xs">Terms of Service</span>
            </button>
            <button
              className="hover:text-gray-600 uppercase tracking-wider text-xs"
              onClick={() => window.open("https://docs.rateup.app", "_blank")}
            >
              <span className="uppercase tracking-wider text-xs">Help Center</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Step1 } from "./signup/Step1.tsx";
export { Step2 } from "./signup/Step2.tsx";
export { Step3 } from "./signup/Step3.tsx";
export { asSignupForm } from "./signup/shared.tsx";
export type { SignupForm } from "./signup/shared.tsx";
