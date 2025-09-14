"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import {
  useCompleteOrgDetails,
  useOrgNameAndPhone,
} from "@/backend/org/org.query";
import { useRouteAndCartStore } from "@/components/HomePage/pages/Pricing/store/RouteAndCartStore";

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
    business_type: "",
    website: "",
    team_size: "",
    role: "",
    phone: "",
    country: "",
    which_platforms_do_you_actively_use: "",
    do_you_currently_use_any_tools_for_engagement: "",
    what_do_you_want_to_automate_first: "",
    interest_in_whatsapp_loyality_or_web_surveys: "",
    how_did_you_hear_about_rateup: "",
    specific_feature_or_custom_feature: "",
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
  const { route, updateRouteAndCart } = useRouteAndCartStore();

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
          "Business Name": formData.orgName,
          "Business Type": formData.business_type,
          "Team Size": formData.team_size,
          Country: formData.country,
          "Phone Number": formData.phone,
          "What is your role at your organization?": formData.role,
          "Company Website": formData.website,
          "Which platform do you actively use?":
            formData.which_platforms_do_you_actively_use,
          "Do you currently use any tools for engagement?":
            formData.do_you_currently_use_any_tools_for_engagement,
          "What do you want to automate?":
            formData.what_do_you_want_to_automate_first,
          "Are you interested in WhatsApp Loyalty, Web Survey Programs for your business?":
            formData.interest_in_whatsapp_loyality_or_web_surveys,
          "How did you hear about RateUp?":
            formData.how_did_you_hear_about_rateup,
          "Need help with onboarding, have a specific use case, or require custom features? Let us know below":
            formData.specific_feature_or_custom_feature,
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

          const data = localStorage.getItem("subscriptionRoutAndCart");
          let updatedRoute = "/dashboard";
          if (route === "/dashboard") {
            if (data) {
              const { route: newRoute, cartData } = JSON.parse(data);
              updatedRoute = newRoute;
              updateRouteAndCart(newRoute, cartData);
            }
          }
          router.replace(updatedRoute);
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
