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
import { Loader } from "../../ui/loader.tsx";
import AppleSignInButton from "../AppleSigninButton.tsx";
import { AUTH_CONTROL, AUTH_CTA } from "../AuthShell.tsx";
import GoogleSignInButton from "../GoogleSigninButton.tsx";
import { errorMessage, RequiredMark, signUpType, STEP_ONE_FIELDS } from "./shared.tsx";
import type { SignupForm } from "./shared.tsx";

/**
 * A 0–4 reading of the password, one point per property the meter can show:
 * length, extra length, mixed case, and a number plus a symbol. Anything typed
 * scores at least 1 so the bar never reads as empty while the field has content.
 */
function passwordScore(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  if (password.length > 0 && score === 0) score = 1;
  return score;
}

const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"] as const;

/** Fill colour for the meter, by score. Unfilled segments stay on `bg-secondary`. */
function strengthFill(score: number) {
  if (score <= 1) return "bg-destructive";
  if (score === 2) return "bg-amber-500 dark:bg-amber-400";
  return "bg-green-600 dark:bg-green-500";
}

function strengthText(score: number) {
  if (score === 0) return "text-muted-foreground";
  if (score <= 1) return "text-destructive";
  if (score === 2) return "text-amber-700 dark:text-amber-500";
  return "text-green-700 dark:text-green-500";
}

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

  const score = passwordScore(values.password ?? "");
  const strengthHint =
    score >= 3
      ? translations("Good to go — that would take years to guess.")
      : translations("Mix cases, a number and a symbol. 12+ is ideal.");

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

                  {/* Strength meter: four segments and a one-word verdict, so the
                      requirement reads as a target rather than a list of failures.
                      The row is pinned to the height of the verdict — without that it
                      is only as tall as the 4px bars until the first keystroke, and
                      the whole card jumps the moment a verdict appears. */}
                  <div className="flex h-4 items-center gap-2.5">
                    <div
                      className="grid flex-1 grid-cols-4 gap-1"
                      role="meter"
                      aria-valuenow={score}
                      aria-valuemin={0}
                      aria-valuemax={4}
                      aria-label={translations("Password strength")}
                    >
                      {[1, 2, 3, 4].map((segment) => (
                        <span
                          key={segment}
                          className={`h-1 rounded-sm transition-colors ${
                            score >= segment ? strengthFill(score) : "bg-secondary"
                          }`}
                        />
                      ))}
                    </div>
                    <span
                      className={`min-w-14 text-right text-xs leading-4 font-semibold ${strengthText(score)}`}
                    >
                      {score > 0 ? translations(STRENGTH_LABEL[score]) : ""}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground">{strengthHint}</p>

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
            {translations("I agree to the")}{" "}
            <Link to="/terms-of-service" className="font-medium text-primary hover:underline">
              {translations("Terms of Service")}
            </Link>{" "}
            {translations("and")}{" "}
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

      <Button onClick={handleClick} disabled={loading} className={`mt-auto ${AUTH_CTA}`}>
        {loading && <Loader className="size-4 border-white/35" />}
        {loading ? translations("Creating account…") : translations("Continue")}
      </Button>
    </div>
  );
}
