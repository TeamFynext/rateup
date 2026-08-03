// Extracted verbatim from `SignupFormNew.tsx`. Behaviour is unchanged.

import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCircleCheck,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconPoint,
  IconUser,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useCheckEmailExistMutation } from "@/backend/user/user.query";

import { Button } from "../../ui/button.tsx";
import { Checkbox } from "../../ui/checkbox.tsx";
import { Field, FieldError, FieldLabel } from "../../ui/field.tsx";
import { Input } from "../../ui/input.tsx";
import { Loader } from "../../ui/loader.tsx";
import AppleSignInButton from "../AppleSigninButton.tsx";
import GoogleSignInButton from "../GoogleSigninButton.tsx";
import { signUpType, STEP_ONE_FIELDS, errorMessage } from "./shared.tsx";
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
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const password = values.password;
  const [emailError, setEmailError] = useState(false);
  const [termsError, setTermsError] = useState(false);

  const rules = [
    {
      label: "At least 8 characters",
      valid: /.{8,}/.test(password),
    },
    {
      label: "1 uppercase letter",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "1 lowercase letter",
      valid: /[a-z]/.test(password),
    },
    { label: "1 number", valid: /[0-9]/.test(password) },
    {
      label: "1 special character",
      valid: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

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
    <div className="flex flex-col justify-between gap-2 sm:gap-3 w-full min-h-96">
      <div className="flex flex-col gap-2">
        {isSocial ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <IconCircleCheck className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Account connected successfully!
                </p>
                <p className="text-xs text-gray-600 mt-1">{values.email}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <GoogleSignInButton
              className="p-2 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 font-medium"
              buttonText={"Continue with Google"}
            />
            <AppleSignInButton
              className="p-2 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 font-medium"
              buttonText="Continue with Apple"
            />
          </div>
        )}
        {!isSocial && (
          <>
            {/* Divider */}

            <div className="relative mt-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-black px-3 text-gray-400 tracking-wider uppercase">
                  Or continue with email
                </span>
              </div>
            </div>
          </>
        )}
        <div className="space-y-2 sm:space-y-3">
          <Field className="gap-1">
            <FieldLabel id="name-label" htmlFor="name" className="text-xs font-medium">
              Full Name
              <span className="text-red-500">*</span>
            </FieldLabel>
            <div className="relative">
              <IconUser className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Controller
                name="name"
                control={formData.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="name"
                    type="text"
                    autoComplete="name"
                    aria-labelledby="name-label"
                    aria-invalid={!!errors.name}
                    placeholder={translations("Name")}
                    className="pl-11 h-8 border-2 border-gray-200 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 bg-white"
                  />
                )}
              />
            </div>
            <FieldError className="text-xs" errors={[errors.name]} />
          </Field>
          {/* Email + Passwords (only if not Google signup) */}

          {!isSocial && (
            <>
              <div className="space-y-0.5 sm:space-y-1">
                <Field className="gap-1">
                  <FieldLabel id="email-label" htmlFor="email" className="text-xs font-medium">
                    Email Address
                    <span className="text-red-500">*</span>
                  </FieldLabel>
                  <div className="relative">
                    <IconMail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Controller
                      name="email"
                      control={formData.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="email"
                          type="email"
                          autoComplete="email"
                          aria-labelledby="email-label"
                          aria-invalid={!!emailError || !!errors.email}
                          aria-describedby={emailError ? "email-error" : undefined}
                          placeholder="you@company.com"
                          className="pl-11 h-8 border-2 border-gray-200 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 bg-white"
                        />
                      )}
                    />
                  </div>
                  <FieldError className="text-xs" errors={[errors.email]} />
                </Field>

                {/* Animated Error Message */}
                <AnimatePresence>
                  {emailError && (
                    <motion.div
                      id="email-error"
                      role="alert"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-1 mt-0.5 sm:mt-1 text-xs text-red-600 font-medium"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {translations("This account already exists")}.{" "}
                      {translations("Please sign in to continue")}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Password */}
              <Field className="gap-1">
                <FieldLabel id="password-label" htmlFor="password" className="text-xs font-medium">
                  Password
                  <span className="text-red-500">*</span>
                </FieldLabel>
                <div className="relative">
                  <IconLock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Controller
                    name="password"
                    control={formData.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        aria-labelledby="password-label"
                        aria-invalid={!!errors.password}
                        placeholder="Create a strong password"
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={(_e) => {
                          field.onBlur();
                          setIsPasswordFocused(false);
                        }}
                        className="pl-11 pr-11 h-8 border-2 border-gray-200 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 bg-white"
                      />
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    aria-controls="password"
                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <IconEyeOff className="w-4 h-4" />
                    ) : (
                      <IconEye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </Field>
              {/* Password Validation Errors */}
              <AnimatePresence>
                {errors.password && (
                  <motion.div
                    key="password-invalid"
                    role="alert"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-1 mt-0.5 sm:mt-1 text-xs text-red-600 font-medium"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {errorMessage(errors.password)}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Password Rules */}
              <AnimatePresence>
                {isPasswordFocused && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-xs text-gray-500 dark:text-gray-100 mt-0.5 sm:mt-1 overflow-hidden"
                  >
                    {translations("Password must have")}:
                    <ul className="list-none mt-0.5 sm:mt-1 space-y-0.5 sm:space-y-1">
                      {rules.map((rule) => (
                        <li key={rule.label} className="flex items-center space-x-1">
                          {rule.valid ? (
                            <span className="text-green-600">
                              <IconCheck size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              <IconPoint size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </span>
                          )}
                          <span
                            className={
                              rule.valid ? "text-gray-800 dark:text-gray-100" : "text-gray-500"
                            }
                          >
                            {rule.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
      {/* Terms checkbox */}
      <div className="flex flex-col gap-1">
        <Field orientation="horizontal" className="gap-3 items-start pt-2">
          <Checkbox
            id="terms"
            checked={agreesToTerms}
            aria-invalid={termsError}
            aria-describedby={termsError ? "terms-error" : undefined}
            onCheckedChange={(checked) => {
              setAgreesToTerms(checked as boolean);
              if (checked) {
                setTermsError(false);
              }
            }}
            className="border-2 border-gray-300 h-4 w-4 shrink mt-0.5"
          />
          <FieldLabel htmlFor="terms" className="text-xs leading-relaxed cursor-pointer">
            I agree to the{" "}
            <button
              onClick={() =>
                navigate({
                  to: "/terms-of-service",
                })
              }
              className="text-primary hover:underline"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              onClick={() =>
                navigate({
                  to: "/privacy-policy",
                })
              }
              className="text-primary hover:underline"
            >
              Privacy Policy
            </button>
          </FieldLabel>
        </Field>
        {termsError && (
          <FieldError id="terms-error" className="text-xs">
            {translations("Please accept the Terms of Service and Privacy Policy to continue")}
          </FieldError>
        )}

        {/* Footer actions */}

        <div className="flex justify-between gap-4 mt-2">
          <Button
            variant="outline"
            disabled={true}
            className="flex items-center px-4 h-8 border-2 border-gray-300 hover:border-gray-400 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleClick}
            className="flex items-center px-4 h-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader /> : translations("Continue")}
            <IconArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
