import { zodResolver } from "@hookform/resolvers/zod";
import { IconBriefcase, IconSparkles, IconUserPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

import type { ICreateGoogleUser } from "@/backend/user/user.api";
import { useUserInfo } from "@/backend/user/user.query";

import { Card } from "../ui/card.tsx";
import { AuthHeader } from "./AuthHeader.tsx";
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
        return "Reimagine customer engagement - set up RateUp in under two minutes.";
      case 2:
        return "We'll personalize templates, automations and onboarding for your industry.";
      case 3:
        return "Select all that apply - we'll tailor your dashboard, templates and onboarding tour.";
      default:
        return "";
    }
  };

  const getStepShortTitle = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-primary flex items-center gap-1">
            <IconUserPlus size={12} strokeWidth={2.5} />
            <span className="text-xs">Get started</span>
          </div>
        );
      case 2:
        return (
          <div className="text-primary flex items-center gap-1">
            <IconBriefcase size={12} strokeWidth={2.5} />
            <span className="text-xs">Your business</span>
          </div>
        );
      case 3:
        return (
          <div className="text-primary flex items-center gap-1">
            <IconSparkles size={12} strokeWidth={2.5} />
            <span className="text-xs">Personalize</span>
          </div>
        );
      default:
        return "";
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
                  fill = 1;
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
                        ease: [0.22, 1, 0.36, 1],
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
      </div>
    </div>
  );
}

export default AuthTypeSignupForm;
