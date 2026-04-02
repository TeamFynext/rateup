"use client";

import { Button } from "@mantine/core";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle,
  Crown,
  Gift,
  HelpCircle,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { motion } from "motion/react";

import { Card } from "@/components/ui/card";

export default function OnboardingStep3({
  handleNext,
  handleBack,
  data,
  handleTemplateSelect,
}: {
  handleNext: any;
  handleBack: any;
  data: any;
  handleTemplateSelect: any;
}) {
  const templates = [
    {
      id: "ecommerce",
      label: "E-commerce Store",
      icon: Gift,
      color: "from-cyan-400 to-blue-500",
      description: "Product catalog, cart recovery, order tracking",
      features: "• Abandoned cart • Order updates • Product recommendations",
    },
    {
      id: "restaurant",
      label: "Restaurant & Food",
      icon: Users,
      color: "from-orange-400 to-red-500",
      description: "Menu sharing, table booking, delivery tracking",
      features: "• Digital menu • Reservations • Delivery updates",
    },
    {
      id: "healthcare",
      label: "Healthcare & Wellness",
      icon: HelpCircle,
      color: "from-green-400 to-emerald-500",
      description: "Appointment booking, reminders, health tips",
      features: "• Appointment scheduling • Reminders • Health resources",
    },
    {
      id: "retail",
      label: "Retail Store",
      icon: Crown,
      color: "from-purple-400 to-pink-500",
      description: "Loyalty programs, promotions, in-store pickup",
      features: "• Loyalty rewards • Flash sales • Store locator",
    },
    {
      id: "service",
      label: "Service Business",
      icon: Target,
      color: "from-indigo-400 to-purple-500",
      description: "Bookings, quotes, service reminders",
      features: "• Service booking • Quote requests • Follow-ups",
    },
    {
      id: "education",
      label: "Education & Training",
      icon: BarChart3,
      color: "from-pink-400 to-rose-500",
      description: "Course enrollment, class schedules, announcements",
      features: "• Course catalog • Class reminders • Progress tracking",
    },
  ];

  const canProceed = () => {
    return data.selectedTemplate !== "";
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-purple-400 to-pink-500 shadow-lg shadow-purple-500/30 mx-auto mb-1"
        >
          <Sparkles className="w-5 h-5 text-white" />
        </motion.div>
        <h2 className="text-gray-900">Choose Your Template</h2>
        <p className="text-gray-600 text-sm">
          Select a pre-built template tailored to your industry
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {templates.map((template) => (
          <motion.div
            key={template.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={`p-3 cursor-pointer transition-all duration-300 hover:shadow-md border-2 ${
                data.selectedTemplate === template.id
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 shadow-lg shadow-blue-200/60"
                  : "border-gray-200 hover:border-blue-300 bg-white"
              }`}
              onClick={() => handleTemplateSelect(template.id)}
            >
              <div className="flex items-start space-x-2.5">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shadow-md ${
                    data.selectedTemplate === template.id
                      ? `bg-linear-to-r ${template.color}`
                      : "bg-linear-to-br from-gray-200 to-gray-300"
                  }`}
                >
                  <template.icon
                    className={`w-5 h-5 ${
                      data.selectedTemplate === template.id
                        ? "text-white"
                        : "text-gray-600"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-semibold ${
                        data.selectedTemplate === template.id
                          ? "text-gray-900"
                          : "text-gray-700"
                      }`}
                    >
                      {template.label}
                    </span>
                    {data.selectedTemplate === template.id && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      </motion.div>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">
                    {template.description}
                  </p>
                  <p className="text-gray-700 text-sm">{template.features}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Selection feedback */}
      {data.selectedTemplate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-linear-to-r from-purple-100 to-pink-100 border border-purple-300/60 rounded-lg p-3 shadow-sm backdrop-blur-sm"
        >
          <div className="flex items-start space-x-3">
            <Sparkles className="w-3 h-3 text-purple-600 mt-0.5" />
            <div>
              <p className="text-purple-700 text-sm">Perfect choice!</p>
              <p className="text-gray-700 mt-1 text-sm">
                We'll set up your{" "}
                {templates.find((t) => t.id === data.selectedTemplate)?.label}{" "}
                template with pre-configured workflows
              </p>
            </div>
          </div>
        </motion.div>
      )}
      <div className="flex justify-between mt-5 pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center px-4 py-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex space-x-2">
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center px-6 py-2 bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
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
