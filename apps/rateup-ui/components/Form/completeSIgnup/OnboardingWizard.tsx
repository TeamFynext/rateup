"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { IconBrandWhatsapp } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Building, Check, ClipboardList, Sparkles, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import WhatsAppSettingsPage from "@/app/dashboard/whatsapp/settings/page";
import {
  useCompleteOrgDetails,
  useOrgNameAndPhone,
} from "@/backend/org/org.query";
import { useRouteAndCartStore } from "@/components/HomePage/pages/Pricing/store/RouteAndCartStore";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import OnboardingStep1 from "./Onboarding1";
import OnboardingStep2 from "./Onboarding2";
import OnboardingStep4 from "./Onboarding4";

export default function OnboardingWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: info, isLoading } = useOrgNameAndPhone();
  const [formData, setFormData] = useState({
    services: [] as string[],
    industry: "",
    selectedTemplate: "",
    integrationsSelected: [] as string[],
  });

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeIntegration, setActiveIntegration] = useState<string | null>(
    null,
  );
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const completeOrgDetails = useCompleteOrgDetails();
  const { route, updateRouteAndCart } = useRouteAndCartStore();

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
        onboarding: {
          services: formData.services,
          industry: formData.industry,
          template: formData.selectedTemplate,
          integration: formData.integrationsSelected,
        },
      },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: ["userInfoQuery"],
          });
          await queryClient.refetchQueries({
            queryKey: ["userInfoQuery"],
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const handleIntegrationToggle = (integrationId: string) => {
    setFormData((prev) => ({
      ...prev,
      integrationsSelected: prev.integrationsSelected.includes(integrationId)
        ? prev.integrationsSelected.filter((i) => i !== integrationId)
        : [...prev.integrationsSelected, integrationId],
    }));
  };

  const stepInfo = [
    {
      id: 1,
      title: "Select Services",
      icon: ClipboardList,
      description: "Choose your tools",
    },
    {
      id: 2,
      title: "Select Your Industry",
      icon: Building,
      description: "Tell us about your business",
    },
    {
      id: 3,
      title: "Select Integrations",
      icon: Zap,
      description: "Connect channels",
    },
  ];
  const integrations = [
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: IconBrandWhatsapp,
      color: "bg-green-500",
      description: "Connect WhatsApp Business",
      required: true,
    },
  ];
  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };
  const handleNext = () => {
    setCurrentStep(currentStep + 1);
    setCompletedSteps([...completedSteps, currentStep]);
  };
  const goToStep = (step: number) => {
    if (
      step <= currentStep ||
      completedSteps.includes(step - 1) ||
      step === 1
    ) {
      setCurrentStep(step);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50/40 via-purple-50/30 to-pink-50/40 flex flex-col items-center justify-center p-4 w-full">
      <AnimatePresence>
        {activeIntegration && (
          <motion.div
            className="fixed inset-0 bg-black/5 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl p-6 shadow-xl w-[90vw] max-w-lg relative h-[90vh] overflow-scroll"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
            >
              <button
                onClick={() => setActiveIntegration(null)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
              {activeIntegration === "whatsapp" && <WhatsAppSettingsPage />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-xl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-100/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center flex flex-col gap-1 items-center justify-center"
          >
            <div className="inline-flex items-center space-x-2 bg-linear-to-r from-blue-100 to-purple-100 border border-blue-200/60 rounded-full px-3 py-1 shadow-sm backdrop-blur-sm mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-blue-700 text-sm">Setup Guide</span>
            </div>
            <h1 className="text-gray-900 text-sm">
              Welcome to RateUp, {info?.nameOfUser || ""}! 👋
            </h1>
            <p className="text-gray-600 text-sm">
              Let's get your customer engagement platform ready in 3 quick steps
            </p>
          </motion.div>

          {/* Step Indicators */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className=""
          >
            <div className="flex justify-between items-center gap-2">
              {stepInfo.map((step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted = completedSteps.includes(step.id);
                const isAccessible =
                  step.id <= currentStep ||
                  completedSteps.includes(step.id - 1) ||
                  step.id === 1;

                return (
                  <React.Fragment key={step.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={() => goToStep(step.id)}
                          disabled={!isAccessible}
                          whileHover={isAccessible ? { scale: 1.05 } : {}}
                          whileTap={isAccessible ? { scale: 0.95 } : {}}
                          className={`flex-1 flex flex-col items-center space-y-1.5 p-2 rounded-xl border-2 transition-all duration-300 ${
                            isActive
                              ? "bg-linear-to-br from-blue-100 to-indigo-100 border-blue-400 shadow-lg shadow-blue-200/60"
                              : isCompleted
                                ? "bg-linear-to-br from-green-50 to-emerald-50 border-green-400/60 hover:border-green-500 cursor-pointer"
                                : isAccessible
                                  ? "bg-white/80 backdrop-blur-sm border-gray-300 hover:border-gray-400 cursor-pointer shadow-sm"
                                  : "bg-gray-100/50 border-gray-300 opacity-60 cursor-not-allowed"
                          }`}
                        >
                          <div
                            className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                              isActive
                                ? "bg-linear-to-r from-blue-500 to-indigo-600 shadow-lg"
                                : isCompleted
                                  ? "bg-linear-to-r from-green-500 to-emerald-500 shadow-md"
                                  : "bg-linear-to-br from-gray-300 to-gray-400"
                            }`}
                          >
                            {isCompleted ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 25,
                                }}
                              >
                                <Check className="w-4 h-4 text-white" />
                              </motion.div>
                            ) : (
                              <step.icon
                                className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400"}`}
                              />
                            )}
                            {isActive && (
                              <motion.div
                                className="absolute inset-0 rounded-xl bg-blue-400/30"
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [0.5, 0, 0.5],
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            )}
                          </div>
                          <div className="text-center">
                            <p
                              className={`transition-colors duration-300 text-sm ${
                                isActive
                                  ? "text-gray-900"
                                  : isCompleted
                                    ? "text-green-600"
                                    : "text-gray-600"
                              }`}
                            >
                              {step.title}
                            </p>
                          </div>
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="bg-white/95 backdrop-blur-sm border-gray-200/60 shadow-lg"
                      >
                        <p className="text-gray-700 text-xs">
                          {step.description}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    {index < stepInfo.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 transition-all duration-500 ${
                          completedSteps.includes(step.id)
                            ? "bg-linear-to-r from-green-400 to-emerald-400"
                            : "bg-gray-300/60"
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className=""
          >
            <div className="flex justify-between mb-1">
              <span className="text-gray-600 text-sm">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-blue-600 text-sm">
                {Math.round(progress)}% complete
              </span>
            </div>
            <div className="w-full bg-gray-200/60 rounded-full h-1.5 overflow-hidden shadow-inner backdrop-blur-sm border border-gray-300/60">
              <motion.div
                className="h-full bg-linear-to-r from-blue-400 via-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out shadow-sm"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-5 shadow-xl border-2 border-gray-200/60 bg-white/90 backdrop-blur-sm">
              {currentStep === 1 && (
                <OnboardingStep1
                  data={formData}
                  setData={setFormData}
                  currentStep={currentStep}
                  handleNext={handleNext}
                  handleBack={handleBack}
                />
              )}
              {currentStep === 2 && (
                <OnboardingStep2
                  data={formData}
                  currentStep={currentStep}
                  handleInputChange={handleInputChange}
                  handleNext={handleNext}
                  handleBack={handleBack}
                />
              )}
              {currentStep === 3 && (
                <OnboardingStep4
                  data={formData}
                  handleSubmit={handleFinish}
                  handleBack={handleBack}
                  handleIntegrationToggle={handleIntegrationToggle}
                  setActiveIntegration={setActiveIntegration}
                  integrations={integrations}
                  loading={completeOrgDetails.isPending}
                />
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
