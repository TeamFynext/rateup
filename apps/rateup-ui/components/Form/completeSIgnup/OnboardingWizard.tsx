"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import {
  useCompleteOrgDetails,
  useOrgNameAndPhone,
} from "@/backend/org/org.query";

import OnboardingStep1 from "./Onboarding1";
import OnboardingStep2 from "./Onboarding2";
import OnboardingStep3 from "./Onboarding3";

export default function OnboardingWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: info, isLoading } = useOrgNameAndPhone();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    orgName: "",
    website: "",
    industry: "",
    employees: "",
    reasons: [] as string[],
    storage: "",
    role: "",
    phone: "",
  });

  useEffect(() => {
    if (info) {
      setFormData((prev) => ({
        ...prev,
        orgName: info.orgName === "NULL" ? "" : info.orgName || "",
        phone: info.userPhone || "",
      }));
    }
  }, [info]);

  const completeOrgDetails = useCompleteOrgDetails();

  const handleNext = () => setStep((s) => Math.min(s + 1, 3));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  const handleFinish = () => {
    completeOrgDetails.mutate(
      {
        orgName: formData.orgName,
        tellUsMore: {
          website: formData.website,
          industry: formData.industry,
          employees: formData.employees,
          reasons: formData.reasons,
          storage: formData.storage,
          role: formData.role,
        },
        phone: formData.phone,
      },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: ["istellusmorecomplete"],
          });
          await queryClient.refetchQueries({
            queryKey: ["istellusmorecomplete"],
          });
          router.replace("/dashboard");
        },
      },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-2xl">
        {step === 1 && (
          <OnboardingStep1
            data={formData}
            setData={setFormData}
            onNext={handleNext}
            userName={info?.nameOfUser || ""}
          />
        )}
        {step === 2 && (
          <OnboardingStep2
            data={formData}
            setData={setFormData}
            onBack={handleBack}
            onNext={handleNext}
          />
        )}
        {step === 3 && (
          <OnboardingStep3
            data={formData}
            setData={setFormData}
            onBack={handleBack}
            onFinish={handleFinish}
            loading={completeOrgDetails.isPending}
          />
        )}
      </div>
    </div>
  );
}
