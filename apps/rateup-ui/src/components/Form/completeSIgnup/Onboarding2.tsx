"use client";

import { ArrowLeft, ArrowRight, Building, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

export default function OnboardingStep2({
  currentStep,
  data,
  handleInputChange,
  handleBack,
  handleNext,
}: {
  currentStep: number;
  data: any;
  handleInputChange: any;
  handleNext: any;
  handleBack: any;
}) {
  const canProceed = () => {
    return data.industry !== "";
  };

  const industries = [
    "E-commerce",
    "Retail",
    "Restaurant & Food",
    "Healthcare",
    "Education",
    "Real Estate",
    "Financial Services",
    "Travel & Tourism",
    "Technology",
    "Beauty & Wellness",
    "Automotive",
    "Entertainment",
    "Other",
  ];
  return (
    <div className="space-y-4">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-orange-400 to-pink-500 shadow-lg shadow-orange-500/30 mx-auto mb-1"
        >
          <Building className="w-5 h-5 text-white" />
        </motion.div>
        <h2 className="text-gray-900">What's Your Industry?</h2>
        <p className="text-gray-600 text-sm">
          This helps us provide industry-specific recommendations
        </p>
      </div>

      <div className="space-y-3 w-full">
        <div className="space-y-1.5 w-full">
          <label className="text-gray-700">Select Your Industry</label>
          <Select
            onValueChange={(value) => handleInputChange("industry", value)}
            value={data.industry}
          >
            <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-orange-400 bg-white text-gray-900 shadow-sm w-full">
              <SelectValue placeholder="Choose your industry..." />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 w-full">
              {industries.map((industry) => (
                <SelectItem
                  key={industry}
                  value={industry}
                  className="text-gray-900 focus:bg-gray-100 focus:text-gray-900 w-full"
                >
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Industry Selection feedback */}
        {data.industry && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-linear-to-r from-orange-100 to-pink-100 border border-orange-300/60 rounded-lg p-3 mt-4 shadow-sm backdrop-blur-sm"
          >
            <div className="flex items-start space-x-3">
              <Sparkles className="w-3 h-3 text-orange-600" />
              <div>
                <p className="text-orange-700 text-sm">
                  Perfect! We'll customize your experience
                </p>
                <p className="text-gray-700 text-sm">
                  Expect industry-specific templates and features for{" "}
                  {data.industry}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
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
            className={`flex items-center px-6 py-2 text-white shadow-lg hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
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
