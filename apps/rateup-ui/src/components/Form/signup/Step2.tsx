// Extracted verbatim from `SignupFormNew.tsx`. Behaviour is unchanged.

import { IconArrowLeft, IconArrowRight, IconBuilding, IconGlobe } from "@tabler/icons-react";
import { useId } from "react";
import { Controller } from "react-hook-form";

import { PhoneInput } from "@/components/ui/phone-input.tsx";

import { Button } from "../../ui/button.tsx";
import { Field, FieldError, FieldLabel, FieldTitle } from "../../ui/field.tsx";
import { Input } from "../../ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select.tsx";
import { STEP_TWO_FIELDS } from "./shared.tsx";
import type { SignupForm } from "./shared.tsx";

export function Step2({
  formData,
  handleBack,
  handleNext,
}: {
  formData: SignupForm;
  handleBack: () => void;
  handleNext: () => void;
}) {
  const uid = useId();
  const industries = [
    "E-commerce",
    "Healthcare",
    "Education",
    "Finance",
    "Real Estate",
    "Hospitality",
    "Retail",
    "Technology",
    "Marketing",
    "Other",
  ];
  const teamSizes = ["1–5", "6–25", "26–100", "100+"];

  const { errors } = formData.formState;

  const handleContinue = async () => {
    // Nothing else runs the resolver on this step, so validate explicitly.
    const isStepValid = await formData.trigger(STEP_TWO_FIELDS, { shouldFocus: true });
    if (isStepValid) {
      handleNext();
    }
  };

  return (
    <div className="w-full h-101 flex flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {/* Business Name */}
        <Field className="gap-1">
          <FieldLabel id="orgName-label" htmlFor="orgName" className="text-xs font-medium">
            Business Name
            <span className="text-red-500">*</span>
          </FieldLabel>
          <div className="relative">
            <IconBuilding className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Controller
              name="orgName"
              control={formData.control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="orgName"
                  autoComplete="organization"
                  aria-labelledby="orgName-label"
                  aria-invalid={!!errors.orgName}
                  placeholder="Your Company Name"
                  className="h-8 pl-9 text-xs border border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white"
                />
              )}
            />
          </div>
          <FieldError className="text-xs" errors={[errors.orgName]} />
        </Field>

        {/* Website */}
        <Field className="gap-1">
          <FieldLabel id="website-label" htmlFor="website" className="text-xs font-medium">
            Website URL
          </FieldLabel>
          <div className="relative">
            <IconGlobe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Controller
              name="website"
              control={formData.control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="website"
                  type="url"
                  autoComplete="url"
                  aria-labelledby="website-label"
                  aria-describedby="website-hint"
                  aria-invalid={!!errors.website}
                  placeholder="https://yourcompany.com"
                  className="h-8 pl-9 text-xs border border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white"
                />
              )}
            />
          </div>
          <FieldError className="text-xs" errors={[errors.website]} />
          <span id="website-hint" className="text-gray-500 text-[11px]">
            Optional — helps us prefill your loyalty program landing page.
          </span>
        </Field>

        {/* Phone */}
        <Field>
          <FieldLabel htmlFor={`${uid}-contact-number`} className="text-xs font-medium">
            Contact Number
            <span className="text-red-500">*</span>
          </FieldLabel>
          <Controller
            name="phoneNumber"
            control={formData.control}
            render={({ field }) => (
              <PhoneInput
                id={`${uid}-contact-number`}
                international
                defaultCountry="IN"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={!!errors.phoneNumber}
                className="w-full"
              />
            )}
          />
          <FieldError className="text-xs" errors={[errors.phoneNumber]} />
        </Field>

        {/* Industry */}
        <Field>
          <FieldLabel htmlFor={`${uid}-industry`} className="text-xs font-medium">
            Industry <span className="text-red-500">*</span>
          </FieldLabel>
          <Controller
            name="industry"
            control={formData.control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                items={industries.map((industry) => ({ value: industry, label: industry }))}
              >
                <SelectTrigger
                  id={`${uid}-industry`}
                  aria-invalid={!!errors.industry}
                  className="h-8 w-full text-xs border border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white"
                >
                  <SelectValue placeholder="Select Industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError className="text-xs" errors={[errors.industry]} />
        </Field>

        <div className="space-y-1">
          <FieldTitle id="teamSize-label" className="text-xs font-medium">
            Team Size <span className="text-red-500">*</span>
          </FieldTitle>

          <Controller
            name="teamSize"
            control={formData.control}
            render={({ field }) => (
              <div className="flex gap-2" role="group" aria-labelledby="teamSize-label">
                {teamSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={field.value === size}
                    onClick={() => field.onChange(size)}
                    className={`px-3 py-1.5 text-xs rounded-md border ${
                      field.value === size
                        ? "bg-primary text-white border-primary"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          />
          <FieldError className="text-xs" errors={[errors.teamSize]} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between gap-3 mt-2 pt-2">
        <Button
          variant="outline"
          onClick={handleBack}
          className="h-8 px-4 text-xs border border-gray-300"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <Button
          onClick={handleContinue}
          className="h-8 px-4 text-xs bg-primary text-white disabled:opacity-50"
        >
          Continue
          <IconArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
