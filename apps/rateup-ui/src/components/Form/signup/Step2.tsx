import { IconAlertCircle, IconArrowLeft, IconBuilding, IconWorld } from "@tabler/icons-react";
import { useId } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { PhoneInput } from "@/components/ui/phone-input.tsx";

import { Button } from "../../ui/button.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "../../ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../../ui/input-group.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select.tsx";
import { AUTH_CONTROL } from "../AuthShell.tsx";
import { errorMessage, RequiredMark, STEP_TWO_FIELDS } from "./shared.tsx";
import type { SignupForm } from "./shared.tsx";

const INDUSTRIES = [
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

const TEAM_SIZES = ["1–5", "6–25", "26–100", "100+"];

/** The pill used for the small single-choice rows in the wizard. */
export function choicePillClass(selected: boolean) {
  return [
    "h-8 cursor-pointer rounded-full border px-3.5 text-[13px] transition-colors",
    selected
      ? "border-primary bg-accent font-semibold text-primary"
      : "border-border bg-card font-medium text-muted-foreground hover:border-input hover:text-foreground",
  ].join(" ");
}

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
  const { t: translations } = useTranslation();
  const { errors } = formData.formState;

  const handleContinue = async () => {
    // Nothing else runs the resolver on this step, so validate explicitly.
    const isStepValid = await formData.trigger(STEP_TWO_FIELDS, { shouldFocus: true });
    if (isStepValid) {
      handleNext();
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <FieldGroup className="gap-2.5">
        <Controller
          name="orgName"
          control={formData.control}
          render={({ field }) => (
            <Field data-invalid={!!errors.orgName} className="gap-0.5">
              <FieldLabel htmlFor="orgName" className="text-xs font-medium">
                {translations("Business name")} <RequiredMark />
              </FieldLabel>
              <InputGroup className={AUTH_CONTROL}>
                <InputGroupAddon className="pl-3.5">
                  <IconBuilding />
                </InputGroupAddon>
                <InputGroupInput
                  {...field}
                  id="orgName"
                  autoComplete="organization"
                  aria-invalid={!!errors.orgName}
                  placeholder={translations("Enter business name")}
                  className="text-[13.5px]"
                />
              </InputGroup>
              {errors.orgName && (
                <FieldError className="flex items-center gap-1.5 text-[12.5px]">
                  <IconAlertCircle className="size-3.5 shrink-0" />
                  {errorMessage(errors.orgName)}
                </FieldError>
              )}
            </Field>
          )}
        />

        <Controller
          name="phoneNumber"
          control={formData.control}
          render={({ field }) => (
            <Field data-invalid={!!errors.phoneNumber} className="gap-0.5">
              <FieldLabel htmlFor={`${uid}-phone`} className="text-xs font-medium">
                {translations("WhatsApp business number")} <RequiredMark />
              </FieldLabel>
              <PhoneInput
                id={`${uid}-phone`}
                international
                defaultCountry="IN"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={!!errors.phoneNumber}
                placeholder={translations("Enter WhatsApp number")}
                className="w-full [&_button]:h-9 [&_input]:h-9 [&_input]:text-[13.5px]"
              />
              {errors.phoneNumber && (
                <FieldError className="flex items-center gap-1.5 text-[12.5px]">
                  <IconAlertCircle className="size-3.5 shrink-0" />
                  {errorMessage(errors.phoneNumber)}
                </FieldError>
              )}
            </Field>
          )}
        />

        <Controller
          name="website"
          control={formData.control}
          render={({ field }) => (
            <Field data-invalid={!!errors.website} className="gap-0.5">
              <FieldLabel htmlFor="website" className="text-xs font-medium">
                {translations("Website")}
                {""}
                <span className="font-normal text-muted-foreground">
                  {translations("(optional)")}
                </span>
              </FieldLabel>
              <InputGroup className={AUTH_CONTROL}>
                <InputGroupAddon className="pl-3.5">
                  <IconWorld />
                </InputGroupAddon>
                <InputGroupInput
                  {...field}
                  id="website"
                  type="url"
                  autoComplete="url"
                  aria-invalid={!!errors.website}
                  placeholder={translations("Enter website URL")}
                  className="text-[13.5px]"
                />
              </InputGroup>
              {errors.website && (
                <FieldError className="flex items-center gap-1.5 text-[12.5px]">
                  <IconAlertCircle className="size-3.5 shrink-0" />
                  {errorMessage(errors.website)}
                </FieldError>
              )}
            </Field>
          )}
        />

        <Controller
          name="industry"
          control={formData.control}
          render={({ field }) => (
            <Field data-invalid={!!errors.industry} className="gap-0.5">
              <FieldLabel htmlFor={`${uid}-industry`} className="text-xs font-medium">
                {translations("What do you sell?")} <RequiredMark />
              </FieldLabel>
              <Select
                value={field.value}
                onValueChange={(value) => field.onChange(value ?? "")}
                items={INDUSTRIES.map((industry) => ({ value: industry, label: industry }))}
              >
                <SelectTrigger
                  id={`${uid}-industry`}
                  aria-invalid={!!errors.industry}
                  className={`w-full text-[14.5px] ${AUTH_CONTROL}`}
                >
                  <SelectValue placeholder={translations("Select an industry")} />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.industry && (
                <FieldError className="flex items-center gap-1.5 text-[12.5px]">
                  <IconAlertCircle className="size-3.5 shrink-0" />
                  {errorMessage(errors.industry)}
                </FieldError>
              )}
            </Field>
          )}
        />

        <Controller
          name="teamSize"
          control={formData.control}
          render={({ field }) => (
            <Field data-invalid={!!errors.teamSize} className="gap-1">
              <FieldLabel id={`${uid}-team`} className="text-xs font-medium">
                {translations("How big is your team?")} <RequiredMark />
              </FieldLabel>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${uid}-team`}>
                {TEAM_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={field.value === size}
                    onClick={() => field.onChange(size)}
                    className={choicePillClass(field.value === size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {errors.teamSize && (
                <FieldError className="flex items-center gap-1.5 text-[12.5px]">
                  <IconAlertCircle className="size-3.5 shrink-0" />
                  {errorMessage(errors.teamSize)}
                </FieldError>
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="mt-auto flex items-center gap-3">
        <Button
          variant="outline"
          onClick={handleBack}
          className="h-10 cursor-pointer gap-2 rounded-lg px-4 text-[13.5px] font-semibold"
        >
          <IconArrowLeft className="size-4" />
          {translations("Back")}
        </Button>
        <Button
          onClick={handleContinue}
          className="h-10 flex-1 cursor-pointer rounded-lg text-sm font-semibold"
        >
          {translations("Continue")}
        </Button>
      </div>
    </div>
  );
}
