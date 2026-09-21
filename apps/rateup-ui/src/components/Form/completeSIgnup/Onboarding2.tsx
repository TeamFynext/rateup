import { IconArrowLeft, IconArrowRight, IconBuilding, IconSparkles } from "@tabler/icons-react";
import { motion } from "motion/react";
import { useId } from "react";

import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import type { OnboardingFormData } from "./onboarding-types.ts";

export default function OnboardingStep2({
  currentStep,
  data,
  handleInputChange,
  handleBack,
  handleNext,
}: {
  currentStep: number;
  data: OnboardingFormData;
  handleInputChange: (field: string, value: string) => void;
  handleNext: () => void;
  handleBack: () => void;
}) {
  const uid = useId();
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
          <IconBuilding className="w-5 h-5 text-white" />
        </motion.div>
        <h2 className="text-foreground">What's Your Industry?</h2>
        <p className="text-muted-foreground text-sm">
          This helps us provide industry-specific recommendations
        </p>
      </div>

      <div className="space-y-3 w-full">
        <Field className="w-full">
          <FieldLabel htmlFor={`${uid}-select-your-industry`} className="text-foreground">
            Select Your Industry
          </FieldLabel>
          <Select
            onValueChange={(value) => handleInputChange("industry", value ?? "")}
            value={data.industry}
            items={industries.map((industry) => ({ value: industry, label: industry }))}
          >
            <SelectTrigger
              id={`${uid}-select-your-industry`}
              className="h-11 border-2 border-border focus:border-primary bg-background text-foreground shadow-sm w-full"
            >
              <SelectValue placeholder="Choose your industry..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border w-full">
              {industries.map((industry) => (
                <SelectItem
                  key={industry}
                  value={industry}
                  className="text-foreground focus:bg-muted focus:text-foreground w-full"
                >
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Industry Selection feedback */}
        {data.industry && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-linear-to-r from-orange-100 to-pink-100 border border-orange-300/60 rounded-lg p-3 mt-4 shadow-sm backdrop-blur-sm"
          >
            <div className="flex items-start space-x-3">
              <IconSparkles className="w-3 h-3 text-orange-600" />
              <div>
                <p className="text-orange-700 dark:text-orange-400 text-sm">
                  Perfect! We'll customize your experience
                </p>
                <p className="text-foreground text-sm">
                  Expect industry-specific templates and features for {data.industry}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      <div className="flex justify-between mt-5 pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="flex items-center px-4 py-2 border-2 border-border hover:border-muted-foreground text-foreground bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <IconArrowLeft className="w-4 h-4 mr-2" />
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
            <IconArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
