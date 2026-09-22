import {
  IconAlertCircle,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconUser,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useCheckEmailExistMutation } from "@/backend/user/user.query";

import { Button } from "../../ui/button.tsx";
import { Checkbox } from "../../ui/checkbox.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "../../ui/field.tsx";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "../../ui/input-group.tsx";
import AppleSignInButton from "../AppleSigninButton.tsx";
import { AUTH_CONTROL, AUTH_CTA } from "../AuthShell.tsx";
import GoogleSignInButton from "../GoogleSigninButton.tsx";
import { PasswordStrengthMeter } from "../PasswordStrength.tsx";
import { errorMessage, RequiredMark, signUpType, STEP_ONE_FIELDS } from "./shared.tsx";
import type { SignupForm } from "./shared.tsx";

export function Step1({
  formData,
  handleNext,
  authType,
}: {
  formData: SignupForm;
  handleNext: () => void;
  authType?: string | string[];
}) {
  const values = formData.watch();
  const { errors } = formData.formState;
  const { t: translations } = useTranslation();
  const checkEmailMutaion = useCheckEmailExistMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [agreesToTerms, setAgreesToTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [termsError, setTermsError] = useState(false);

  const google = authType === signUpType.SIGNUP_WITH_GOOGLE;
  const apple = authType === signUpType.SIGNUP_WITH_APPLE;

  const isSocial = google || apple;

  const handleClick = async () => {
    setEmailError(false);
    setTermsError(false);

    // Nothing else runs the resolver on this step, so validate explicitly.
    const isStepValid = await formData.trigger(isSocial ? ["name"] : STEP_ONE_FIELDS, {
      shouldFocus: true,
    });
    if (!isStepValid) {
      return;
    }
    if (!agreesToTerms) {
      setTermsError(true);
      return;
    }

    if (isSocial) {
      handleNext();
      return;
    }

    setLoading(true);
    try {
      const response = await checkEmailMutaion.mutateAsync({
        email: values.email.trim(),
      });

      if (response.success) {
        setEmailError(true);
        return;
      }
      handleNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      {isSocial ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-600/25 bg-green-600/10 px-4 py-3.5">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-green-600/15 text-green-700 dark:text-green-500">
            <IconCheck className="size-3" stroke={3} />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-[13.5px] font-semibold text-foreground">
              {translations("Account connected")}
            </p>
            <p className="text-[11.5px] text-muted-foreground">{values.email}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2.5">
            <GoogleSignInButton
              className={`flex-[1_1_180px] ${AUTH_CONTROL} [&_span]:text-[13.5px]`}
              buttonText={translations("Google")}
            />
            <AppleSignInButton
              className={`flex-[1_1_180px] ${AUTH_CONTROL} [&_span]:text-[13.5px]`}
              buttonText={translations("Apple")}
            />
          </div>
          <div className="flex items-center gap-3.5">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11.5px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
              {translations("or with email")}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <FieldGroup className="gap-2.5">
        <Controller
          name="name"
          control={formData.control}
          render={({ field }) => (
            <Field data-invalid={!!errors.name} className="gap-0.5">
              <FieldLabel htmlFor="name" className="text-xs font-medium">
                {translations("Full name")} <RequiredMark />
              </FieldLabel>
              <InputGroup className={AUTH_CONTROL}>
                <InputGroupAddon className="pl-3.5">
                  <IconUser />
                </InputGroupAddon>
                <InputGroupInput
                  {...field}
                  id="name"
                  type="text"
                  autoComplete="name"
                  aria-invalid={!!errors.name}
                  placeholder={translations("Enter full name")}
                  className="text-[13.5px]"
                />
              </InputGroup>
              {errors.name && (
                <FieldError className="flex items-center gap-1.5 text-[12.5px]">
                  <IconAlertCircle className="size-3.5 shrink-0" />
                  {errorMessage(errors.name)}
                </FieldError>
              )}
            </Field>
          )}
        />

        {!isSocial && (
          <>
            <Controller
              name="email"
              control={formData.control}
              render={({ field }) => (
                <Field data-invalid={!!errors.email || emailError} className="gap-0.5">
                  <FieldLabel htmlFor="email" className="text-xs font-medium">
                    {translations("Work email")} <RequiredMark />
                  </FieldLabel>
                  <InputGroup className={AUTH_CONTROL}>
                    <InputGroupAddon className="pl-3.5">
                      <IconMail />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={!!errors.email || emailError}
                      placeholder={translations("Enter email")}
                      className="text-[13.5px]"
                    />
                  </InputGroup>
                  {errors.email && (
                    <FieldError className="flex items-center gap-1.5 text-[12.5px]">
                      <IconAlertCircle className="size-3.5 shrink-0" />
                      {errorMessage(errors.email)}
                    </FieldError>
                  )}
                  <AnimatePresence>
                    {emailError && (
                      <motion.p
                        role="alert"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-1.5 text-[12.5px] text-destructive"
                      >
                        <IconAlertCircle className="size-3.5 shrink-0" />
                        {translations("This account already exists")}.{" "}
                        {translations("Please sign in to continue")}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </Field>
              )}
            />

            <Controller
              name="password"
              control={formData.control}
              render={({ field }) => (
                <Field data-invalid={!!errors.password} className="gap-1">
                  <FieldLabel htmlFor="password" className="text-xs font-medium">
                    {translations("Password")} <RequiredMark />
                  </FieldLabel>
                  <InputGroup className={AUTH_CONTROL}>
                    <InputGroupAddon className="pl-3.5">
                      <IconLock />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      aria-invalid={!!errors.password}
                      placeholder={translations("Enter password")}
                      className="text-[13.5px]"
                    />
                    <InputGroupAddon align="inline-end" className="pr-2">
                      <InputGroupButton
                        size="icon-sm"
                        aria-label={
                          showPassword
                            ? translations("Hide password")
                            : translations("Show password")
                        }
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <IconEyeOff /> : <IconEye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>

                  <PasswordStrengthMeter password={values.password ?? ""} />

                  {errors.password && (
                    <FieldError className="flex items-center gap-1.5 text-[12.5px]">
                      <IconAlertCircle className="size-3.5 shrink-0" />
                      {errorMessage(errors.password)}
                    </FieldError>
                  )}
                </Field>
              )}
            />
          </>
        )}
      </FieldGroup>

      <div className="flex flex-col gap-2">
        <Field orientation="horizontal" className="items-start gap-2.75">
          <Checkbox
            id="terms"
            checked={agreesToTerms}
            aria-invalid={termsError}
            aria-describedby={termsError ? "terms-error" : undefined}
            onCheckedChange={(checked) => {
              setAgreesToTerms(checked as boolean);
              if (checked) setTermsError(false);
            }}
            className="mt-px size-4.5 shrink-0 rounded-md"
          />
          <FieldLabel
            htmlFor="terms"
            className="text-[13px] leading-snug font-normal text-secondary-foreground"
          >
            {translations("I agree to the")}
            {""}
            <Link to="/terms-of-service" className="font-medium text-primary hover:underline">
              {translations("Terms of Service")}
            </Link>
            {""}
            {translations("and")}
            {""}
            <Link to="/privacy-policy" className="font-medium text-primary hover:underline">
              {translations("Privacy Policy")}
            </Link>
            .
          </FieldLabel>
        </Field>
        {termsError && (
          <FieldError id="terms-error" className="flex items-center gap-1.5 text-[12.5px]">
            <IconAlertCircle className="size-3.5 shrink-0" />
            {translations("Please accept the Terms of Service and Privacy Policy to continue")}
          </FieldError>
        )}
      </div>

      <Button onClick={handleClick} loading={loading} className={`mt-auto ${AUTH_CTA}`}>
        {translations("Continue")}
      </Button>
    </div>
  );
}
