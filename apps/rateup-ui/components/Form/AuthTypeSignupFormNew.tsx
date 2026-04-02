import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useExtracted } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

import { useSendMailPlanSelectDetails } from "@/backend/payment/payment.query";
import { useUserInfo } from "@/backend/user/user.query";

import { Card } from "../ui/card";
import { Step1, Step2, Step3 } from "./SignupFormNew";

function AuthTypeSignupForm({
  setIsLoading,
  createUserMutation,
  isLoading,
  authType,
}) {
  const { data: userInfo, isPending } = useUserInfo();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isUserExist, setIsUserExist] = useState(false);

  useEffect(() => {
    if (userInfo && "data" in userInfo) {
      if (userInfo?.data && userInfo.data?.userId) {
        setIsUserExist(true);
      }
    }
  }, [userInfo]);

  const translations = useExtracted();
  const signupSchema = z.object({
    name: z.string().min(4, "Name should be at least 4 characters long"),

    orgName: z
      .string()
      .min(4, "Organization name should be at least 4 characters long"),

    email: z.email("Invalid email").optional(),

    website: z.url("Invalid website URL").optional(),

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

  const sendMail = useSendMailPlanSelectDetails();

  const handleSubmit = () => {
    const values = signupForm.getValues();
    setIsLoading(true);
    if (isUserExist) {
      toast.success("Sign up process is already completed");
      router.push("/dashboard");
      return;
    }
    const data = {
      name: values?.name,
      orgName: values?.orgName,
      email: values?.email,
      type: authType,
      industry: values?.industry,
      website: values?.website,
      phoneNumber: values?.phoneNumber,
      location: values?.location,
      goals: values?.goals,
      integrationsSelected: values?.integrationsSelected,
    };
    const planData = localStorage.getItem("subscriptionRoutAndCart");
    if (planData) {
      const { cartData } = JSON.parse(planData);
      sendMail.mutate({
        email: values.email,
        name: values.name,
        orgName: values?.orgName,
        planName: cartData?.name,
        planId: cartData?.planId,
        website: values?.website,
        phoneNumber: values?.phoneNumber,
        location: values?.location,
        goals: values?.goals,
        integrationsSelected: values?.integrationsSelected,
      });
    }
    createUserMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center w-full p-4">
      <div className="text-center mb-1">
        <div className="flex items-center justify-center mb-1">
          <img
            src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup-logo-blue-text.svg`}
            alt="RateUp Logo"
            className="w-18 h-auto"
          />
        </div>
        <h2 className="text-lg text-gray-900 mb-1">
          {translations("Welcome to RateUp")}
        </h2>
        <p className="text-sm text-gray-600">
          {translations("Set up your account in few steps")}
        </p>
      </div>
      <div className="max-w-2xl">
        {/* progress bar */}
        <div className="mb-2 sm:min-w-lg max-w-2xl">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>
              Step {currentStep} of {totalSteps}
            </span>
            <span>
              {Math.round(progress)}% {translations("complete")}{" "}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-blue-400 via-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <Card className="flex flex-col items-center px-6 py-4 sm:min-w-md">
          {currentStep === 1 && (
            <Step1
              formData={signupForm}
              handleNext={handleNext}
              google={true}
            />
          )}
          {currentStep === 2 && (
            <Step2
              formData={signupForm}
              handleBack={handleBack}
              handleNext={handleNext}
            />
          )}
          {currentStep === 3 && (
            <Step3
              formData={signupForm}
              handleBack={handleBack}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

export default AuthTypeSignupForm;
