import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle,
  ClipboardList,
  Crown,
  MessageSquare,
} from "lucide-react";
import { motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";

import type { OnboardingFormData } from "./onboarding-types.ts";

export default function OnboardingStep1({
  data,
  setData,
  currentStep,
  handleBack,
  handleNext,
}: {
  data: OnboardingFormData;
  setData: Dispatch<SetStateAction<OnboardingFormData>>;
  currentStep: number;
  handleNext: () => void;
  handleBack: () => void;
}) {
  const services = [
    {
      id: "whatsapp-api",
      name: "WhatsApp Business API",
      icon: MessageSquare,
      color: "bg-linear-to-br from-green-400 to-emerald-500",
      description: "Advanced WhatsApp automation and messaging",
      benefit: "Reach 2.5B+ users",
      recommended: true,
    },
    {
      id: "whatsapp-loyalty",
      name: "WhatsApp Loyalty Program",
      icon: Crown,
      color: "bg-linear-to-br from-orange-400 to-pink-500",
      description: "Reward customers via WhatsApp",
      benefit: "Increase repeat purchases",
    },
    {
      id: "web-survey",
      name: "Web Survey Platform",
      icon: BarChart3,
      color: "bg-linear-to-br from-blue-400 to-indigo-500",
      description: "Collect customer feedback and insights",
      benefit: "Data-driven decisions",
    },
  ];

  const canProceed = () => {
    return data.services.length > 0;
  };

  const handleServiceToggle = (serviceId: string) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter((s: string) => s !== serviceId)
        : [...prev.services, serviceId],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/30 mb-2 mx-auto"
        >
          <ClipboardList className="w-5 h-5 text-white" />
        </motion.div>
        <h2 className="text-gray-900 text-base">Select Your Services</h2>
        <p className="text-gray-600 text-sm">
          Choose the tools and features you need for your business
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {services.map((service) => (
          <motion.div key={service.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card
              className={`p-3 cursor-pointer transition-all duration-300 hover:shadow-md border-2 ${
                data.services.includes(service.id)
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 shadow-lg shadow-blue-200/60"
                  : "border-gray-200 hover:border-blue-300 bg-white"
              }`}
              onClick={() => handleServiceToggle(service.id)}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${service.color} shadow-md`}
                >
                  <service.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-900 text-sm">{service.name}</span>
                    {service.recommended && (
                      <span className="bg-linear-to-r from-orange-400 to-pink-400 text-white px-2 py-0.5 rounded-full shadow-sm text-sm">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">{service.description}</p>
                  <p className="text-blue-600 mt-1 text-sm">✓ {service.benefit}</p>
                </div>
                {data.services.includes(service.id) && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Selection feedback */}
      {data.services.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-linear-to-r from-blue-100 to-indigo-100 border border-blue-300/60 rounded-lg p-2.5 mt-3 shadow-sm backdrop-blur-sm"
        >
          <div className="flex items-center space-x-2.5">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-blue-700 text-sm">
                Great! You've selected {data.services.length} service
                {data.services.length !== 1 ? "s" : ""}
              </p>
              <p className="text-gray-700 mt-0.5 text-sm">We'll configure these for you</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex justify-between mt-5 pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="flex items-center px-4 py-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex space-x-2">
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center px-6 py-2  text-white shadow-lg hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              canProceed() ? "hover:scale-105" : ""
            }`}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
