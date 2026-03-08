import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useForm } from "@mantine/form";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Check,
  CheckCircle,
  Dot,
  Eye,
  EyeOff,
  Globe,
  Instagram,
  Lock,
  Mail,
  MessageSquare,
  Shield,
  Sparkles,
  Target,
  User,
  Users,
  Zap,
} from "lucide-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useTranslations } from "next-intl";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import SelectR from "react-select";
import countryList from "react-select-country-list";
import { z } from "zod/v4";

import { useSendMailPlanSelectDetails } from "@/backend/payment/payment.query";
import { useCheckEmailExistMutation } from "@/backend/user/user.query";

import { useRouteAndCartStore } from "../HomePage/pages/Pricing/store/RouteAndCartStore";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader } from "../ui/loader";
import styles from "./AuthForm.module.css";
import GoogleSignInButton from "./GoogleSigninButton";

export const signUpType = {
  SIGNUP_WITH_GOOGLE: "google",
  SIGNUP_WITH_EMAIL: "email",
  SIGNUP_WITH_PHONE: "phone",
};

export function SignUpFlow({ setIsLoading, signUp, isLoading }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [signUpTypeValue, setSignUpTypeValue] = useState("");
  const translations = useTranslations();

  const signUpSchema =
    signUpTypeValue === signUpType.SIGNUP_WITH_PHONE
      ? z.object({
          phoneNumber: z
            .string()
            .min(1, translations("Phone number is required"))
            .refine(
              (val) =>
                signUpTypeValue !== signUpType.SIGNUP_WITH_PHONE ||
                isValidPhoneNumber(val),
              { message: translations("Enter a valid phone number") },
            ),
          orgName: z.string().min(1, translations("Business name is required")),
          website: z.string().optional(),
          industry: z.string().min(1, translations("Industry is required")),
          location: z.string().min(1, translations("Location is required")),
          goals: z.array(z.string()).optional(),
          integrationsSelected: z.array(z.string()).optional(),
        })
      : z.object({
          email: z
            .string()
            .email(translations("Enter a valid email"))
            .min(1, translations("Email is required")),
          password: z
            .string()
            .min(
              5,
              translations("Password should be at least 5 characters long"),
            )
            .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
              message: translations(
                "Password should contain at least one letter and one number",
              ),
            }),
          confirmPassword: z
            .string()
            .min(1, translations("Confirm password is required")),
          name: z.string().min(1, translations("Name is required")),
          orgName: z.string().min(1, translations("Business name is required")),
          website: z.string().optional(),
          industry: z.string().min(1, translations("Industry is required")),
          location: z.string().min(1, translations("Location is required")),
          goals: z.array(z.string()).optional(),
          integrationsSelected: z.array(z.string()).optional(),
        });

  const signupForm = useForm({
    initialValues: {
      email: "",
      name: "",
      password: "",
      confirmPassword: "",
      orgName: "",
      website: "",
      phoneNumber: "",
      industry: "",
      location: "",
      goals: [] as string[],
      integrationsSelected: [] as string[],
    },
    validate: zod4Resolver(signUpSchema),
  });

  useEffect(() => {
    const newUserFromPricingPage = localStorage.getItem(
      "newUserFromPricingPage",
    );
    if (newUserFromPricingPage) {
      const data = JSON.parse(newUserFromPricingPage);
      signupForm.setValues({
        email: data.email,
        name: data.name,
        orgName: data.orgName,
      });
    }
  }, []);

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  const sendMail = useSendMailPlanSelectDetails();

  const { cart } = useRouteAndCartStore();

  const handleSubmit = () => {
    const selectedPlan = JSON.parse(localStorage.getItem("selected_plan"));
    if (cart?.planId.length) {
      sendMail.mutate({
        email: signupForm.values.email,
        name: signupForm.values.name,
        planName: cart?.name,
      });
    }

    setIsLoading(true);
    signUp(
      signupForm.values.email,
      signupForm.values.password,
      signupForm.values.name,
      signupForm.values.orgName,
      signupForm.values.phoneNumber,
      selectedPlan?.id,
      signupForm.values.website,
      signupForm.values.industry,
      signupForm.values.location,
      signupForm.values.goals,
      signupForm.values.integrationsSelected,
    ).finally(() => {
      setIsLoading(false);
      localStorage.removeItem("selected_plan");
      localStorage.removeItem("newUserFromPricingPage");
    });
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center w-full p-3 sm:p-4 md:p-6 bg-linear-to-br from-blue-50/40 via-purple-50/30 to-pink-50/40 relative">
      <div className="text-center mb-0.5 sm:mb-1 max-w-xs sm:max-w-sm">
        <div className="flex items-center justify-center">
          <img
            src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup-logo-blue-text.svg`}
            alt="RateUp Logo"
            className="w-14 sm:w-16 h-auto"
          />
        </div>
        <h2 className="text-sm sm:text-md text-gray-900">
          {translations("Welcome to RateUp")}
        </h2>
        <p className="text-xs text-gray-600">
          {translations("Set up your account in few steps")}
        </p>
      </div>
      <div className="">
        {/* progress bar */}
        <div className="mb-0.5 sm:mb-1 sm:min-w-md max-w-md w-full">
          <div className="flex justify-between text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">
            <span>
              Step {currentStep} of {totalSteps}
            </span>
            <span>
              {Math.round(progress)}% {translations("complete")}{" "}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1 sm:h-1.5 overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-blue-400 via-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <Card className="flex flex-col items-center px-4 py-3 sm:px-5 sm:py-3.5 md:px-6 md:py-4 sm:min-w-md max-w-md w-full">
          {currentStep === 1 && (
            <Step1
              formData={signupForm}
              handleNext={handleNext}
              translations={translations}
              google={false}
            />
          )}
          {currentStep === 2 && (
            <Step2
              formData={signupForm}
              handleBack={handleBack}
              handleNext={handleNext}
              translations={translations}
            />
          )}
          {currentStep === 3 && (
            <Step3
              formData={signupForm}
              handleBack={handleBack}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              translations={translations}
            />
          )}
          {/* {currentStep === 4 && <Step4 formData={signupForm} />} */}
        </Card>
      </div>
    </div>
  );
}

export function Step1({ formData, handleNext, translations, google }) {
  const checkEmailMutaion = useCheckEmailExistMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreesToTerms, setAgreesToTerms] = useState(true);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const password = formData.values.password;
  const [emailError, setEmailError] = useState(false);

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
      valid: /[!@#$%^&*(),.?\":{}|<>]/.test(password),
    },
  ];

  const isPasswordValid = (password: string) =>
    /.{8,}/.test(password) &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isFormComplete =
    formData.values.name.trim() !== "" &&
    (!google
      ? formData.values.email.trim() !== "" &&
        formData.values.password.trim() !== "" &&
        formData.values.confirmPassword.trim() !== "" &&
        formData.values.password === formData.values.confirmPassword &&
        isPasswordValid(formData.values.password)
      : true) &&
    agreesToTerms;

  const handleClick = async () => {
    if (!google) {
      if (formData.values?.email) {
        setLoading(true);
        const response = await checkEmailMutaion.mutateAsync({
          email: formData.values.email.trim(),
        });

        if (response.success) {
          setEmailError(true);
          setLoading(false);
          return;
        }
        setLoading(false);
        handleNext();
      }
    } else {
      handleNext();
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-3 w-full">
      <div className="text-center mb-0.5 sm:mb-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-2xl bg-linear-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/30 mb-1.5 sm:mb-2"
        >
          <Users className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-white" />
        </motion.div>
        <h2 className="text-xs sm:text-sm text-gray-600">
          {translations("Create Your Account")}
        </h2>
        <p className="text-[10px] sm:text-xs text-gray-600 max-w-md">
          {translations(
            "Start your Journey with RateUp's Customer Engagement Platform",
          )}
        </p>
      </div>
      {google ? (
        <div className="bg-linear-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-2 sm:p-2.5">
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm text-green-800">
                Account connected successfully!
              </p>
              <p className="text-xs text-gray-600">
                {formData.values.email || ""}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <GoogleSignInButton
          className={styles["login-signup-with-google-btn"]}
          buttonText={"Continue with Google"}
        />
      )}

      {!google && (
        <>
          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">
                {translations("Or continue with email")}
              </span>
            </div>
          </div>
        </>
      )}

      <div className="space-y-2 sm:space-y-3">
        {/* Name field (always visible) */}
        <div className="space-y-0.5 sm:space-y-1">
          <div className="relative">
            <User className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <Input
              id="name"
              type="text"
              placeholder={translations("Name")}
              className="pl-8 placeholder:text-sm sm:placeholder:text-base sm:pl-10 h-8 sm:h-9 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-xs sm:text-sm"
              {...formData.getInputProps("name")}
            />
          </div>
        </div>

        {/* Email + Passwords (only if not Google signup) */}
        {!google && (
          <>
            <div className="space-y-0.5 sm:space-y-1">
              <div className="relative">
                <Mail className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder={translations("Email")}
                  className={`pl-8 placeholder:text-sm sm:placeholder:text-base sm:pl-10 h-8 sm:h-9 border-2 bg-white text-xs sm:text-sm transition-colors duration-200 focus:ring-2 ${
                    emailError
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                      : "border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20"
                  }`}
                  {...formData.getInputProps("email")}
                />
              </div>

              {/* Animated Error Message */}
              <AnimatePresence>
                {emailError && (
                  <motion.div
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
            <div className="space-y-0.5 sm:space-y-1">
              <div className="relative">
                <Lock className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={translations("Password")}
                  className="pl-8 placeholder:text-sm sm:placeholder:text-base sm:pl-10 pr-8 sm:pr-10 h-8 sm:h-9 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-xs sm:text-sm"
                  {...formData.getInputProps("password")}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-0.5 sm:space-y-1">
              <div className="relative">
                <Shield className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={translations("Confirm Password")}
                  className="pl-8 sm:pl-10 placeholder:text-sm sm:placeholder:text-base pr-8 sm:pr-10 h-8 sm:h-9 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-xs sm:text-sm"
                  {...formData.getInputProps("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </button>
              </div>
            </div>
            {/* Password Validation Errors */}
            <AnimatePresence>
              {formData.values.password &&
                !isPasswordValid(formData.values.password) && (
                  <motion.div
                    key="password-invalid"
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
                    {translations(
                      "Your password must meet all security requirements",
                    )}
                  </motion.div>
                )}

              {formData.values.confirmPassword &&
                formData.values.password !==
                  formData.values.confirmPassword && (
                  <motion.div
                    key="password-mismatch"
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
                    {translations("Passwords do not match")}
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
                  className="text-xs text-gray-500 mt-0.5 sm:mt-1 overflow-hidden"
                >
                  {translations("Password must have")}:
                  <ul className="list-none mt-0.5 sm:mt-1 space-y-0.5 sm:space-y-1">
                    {rules.map((rule) => (
                      <li
                        key={rule.label}
                        className="flex items-center space-x-1"
                      >
                        {rule.valid ? (
                          <span className="text-green-600">
                            <Check
                              size={16}
                              className="sm:w-[18px] sm:h-[18px]"
                            />
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            <Dot
                              size={16}
                              className="sm:w-[18px] sm:h-[18px]"
                            />
                          </span>
                        )}
                        <span
                          className={
                            rule.valid ? "text-gray-800" : "text-gray-500"
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

      {/* Terms checkbox */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <Checkbox
          id="terms"
          checked={agreesToTerms}
          onCheckedChange={(checked) => setAgreesToTerms(checked as boolean)}
          className="border-2 border-gray-300 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0"
        />
        <Label
          htmlFor="terms"
          className="text-[9px] sm:text-xs text-gray-600 leading-relaxed cursor-pointer"
        >
          {translations("I accept")}{" "}
          <Link
            href={"/terms-of-service"}
            className="text-blue-600 hover:text-blue-700 cursor-pointer underline"
          >
            {translations("terms of service")}
          </Link>{" "}
          {translations("and")}{" "}
          <Link
            href={"/privacy-policy"}
            className="text-blue-600 hover:text-blue-700 cursor-pointer underline"
          >
            {translations("privacy policy")}
          </Link>
        </Label>
      </div>

      <div className="w-full text-center pt-1.5 sm:pt-2 border-t border-gray-200">
        <p className="text-xs sm:text-sm text-gray-600 text-center">
          {translations("Already have an account")}?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-rateup-blue hover:text-rateup-blue/80 underline transition-colors cursor-pointer"
          >
            Sign in
          </button>
        </p>
      </div>

      {/* Footer actions */}
      <div className="flex justify-between pt-2 sm:pt-3 border-t border-gray-200 w-full">
        <Button
          variant="outline"
          disabled={true}
          className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm border-2 border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          {translations("Back")}
        </Button>

        <Button
          onClick={handleClick}
          disabled={!isFormComplete}
          className="min-w-24 sm:min-w-30 flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader /> : translations("Continue")}
          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
        </Button>
      </div>
    </div>
  );
}

export function Step2({ formData, handleBack, handleNext, translations }) {
  const countries = countryList().getData();

  const isFormComplete =
    formData.values.orgName.trim() !== "" &&
    formData.values.phoneNumber.trim() !== "" &&
    formData.values.location.trim() !== "";

  return (
    <div className="w-full">
      <div className="text-center mb-2 sm:mb-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-2xl bg-linear-to-br from-orange-400 to-pink-500 shadow-lg shadow-orange-500/30 mb-1.5 sm:mb-2 mx-auto"
        >
          <Building className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-white" />
        </motion.div>
        <h2 className="text-xs sm:text-sm text-gray-900">
          {translations("Tell Us About Your Business")}
        </h2>
        <p className="text-[10px] sm:text-xs text-gray-600">
          {translations(
            "Help us customize your RateUp experience for your specific needs",
          )}
        </p>
      </div>

      <div className="flex flex-col justify-center w-full gap-3 sm:gap-4">
        <div className="space-y-0.5 sm:space-y-1">
          <div className="relative">
            <Building className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <Input
              id="orgName"
              placeholder={`${translations("Business Name")} *`}
              className="pl-8 sm:pl-10 h-8 sm:h-9 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-xs sm:text-sm"
              {...formData.getInputProps("orgName")}
            />
          </div>
        </div>

        <div className="space-y-0.5 sm:space-y-1">
          <div className="relative">
            <Globe className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <Input
              id="website"
              placeholder={`${translations("Website")} URL`}
              className="pl-8 sm:pl-10 h-8 sm:h-9 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-xs sm:text-sm"
              {...formData.getInputProps("website")}
            />
          </div>
        </div>

        <div className="space-y-0.5 sm:space-y-1">
          <PhoneInput
            international
            defaultCountry="IN"
            value={formData.values.phoneNumber}
            onChange={(val) => formData.setFieldValue("phoneNumber", val || "")}
            className="border-2 border-gray-200 focus:border-rateup-blue focus-within:ring-2 focus-within:ring-rateup-blue/20 rounded-md px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm bg-white [&>input]:border-0 [&>input]:focus:ring-0 [&>input]:focus:outline-none [&>input]:w-full"
          />
        </div>

        <div className="space-y-0.5 sm:space-y-1">
          <SelectR
            options={countries}
            value={countries.find((c) => c.value === formData.values.location)}
            onChange={(option) =>
              formData.setFieldValue("location", option?.label || "")
            }
            placeholder={`${translations("Location")} *`}
            isSearchable
            className="rounded-md text-xs sm:text-sm bg-white [&>input]:w-full border-gray-200"
          />
        </div>
      </div>

      <div className="bg-linear-to-r from-orange-100 to-pink-100 border border-orange-300/60 rounded-lg p-2 sm:p-3 mt-3 sm:mt-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col items-start gap-0.5 sm:gap-1">
          <div className="flex gap-1 items-start justify-center">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5" />
            <p className="text-orange-700 text-xs">
              {translations("Personalized setup ahead")}
            </p>
          </div>
          <p className="text-gray-700 mt-0.5 sm:mt-1 text-[10px] sm:text-xs">
            {translations(
              "We'll tailor your dashboard and features based on your business details",
            )}
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-2 sm:pt-3 border-t border-gray-200 w-full">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm border-2 border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          {translations("Back")}
        </Button>

        <Button
          onClick={handleNext}
          disabled={!isFormComplete}
          className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {translations("Continue")}
          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
        </Button>
      </div>
    </div>
  );
}

export function Step3({
  formData,
  handleBack,
  handleSubmit,
  isLoading,
  translations,
}) {
  const businessGoals = [
    {
      id: "customer-support",
      label: "Improve Customer Support",
      icon: MessageSquare,
      color: "from-cyan-400 to-blue-500",
    },
    {
      id: "lead-generation",
      label: "Generate More Leads",
      icon: Target,
      color: "from-purple-400 to-pink-500",
    },
    {
      id: "sales-automation",
      label: "Automate Sales Process",
      icon: Zap,
      color: "from-orange-400 to-red-500",
    },
    {
      id: "customer-retention",
      label: "Increase Customer Retention",
      icon: Users,
      color: "from-green-400 to-emerald-500",
    },
    {
      id: "social-engagement",
      label: "Boost Social Media Engagement",
      icon: Instagram,
      color: "from-pink-400 to-purple-500",
    },
    {
      id: "loyalty-program",
      label: "Build Loyalty Programs",
      icon: CheckCircle,
      color: "from-yellow-400 to-orange-500",
    },
  ];

  const handleGoalToggle = (goalId: string) => {
    const currentGoals = formData.values.goals;
    const newGoals = currentGoals.includes(goalId)
      ? currentGoals.filter((g) => g !== goalId)
      : [...currentGoals, goalId];

    formData.setFieldValue("goals", newGoals);
  };
  return (
    <div className="w-full">
      <div className="space-y-3 sm:space-y-4">
        <div className="text-center mb-0.5 sm:mb-1">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl bg-linear-to-br from-purple-400 to-pink-500 shadow-lg shadow-purple-500/30 mb-1.5 sm:mb-2 mx-auto"
          >
            <Target className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-white" />
          </motion.div>
          <h2 className="text-gray-900 text-xs sm:text-sm">
            {translations("What Are Your Goals")}?
          </h2>
          <p className="text-gray-600 text-[10px] sm:text-xs">
            {translations(
              "Select all that apply to personalize your RateUp experience",
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
          {businessGoals.map((goal) => (
            <motion.div
              key={goal.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`p-1.5 sm:p-2 cursor-pointer rounded-lg transition-all duration-300 hover:shadow-md border-2 ${
                  formData.values.goals.includes(goal.id)
                    ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 shadow-lg shadow-blue-200/60"
                    : "border-gray-200 hover:border-blue-300 bg-white"
                }`}
                onClick={() => handleGoalToggle(goal.id)}
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-sm flex items-center justify-center transition-colors shadow-md ${
                      formData.values.goals.includes(goal.id)
                        ? `bg-linear-to-r ${goal.color}`
                        : "bg-linear-to-br from-gray-200 to-gray-300"
                    }`}
                  >
                    <goal.icon
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                        formData.values.goals.includes(goal.id)
                          ? "text-white"
                          : "text-gray-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <span
                      className={`text-xs sm:text-sm ${
                        formData.values.goals.includes(goal.id)
                          ? "text-gray-900"
                          : "text-gray-700"
                      }`}
                    >
                      {goal.label}
                    </span>
                  </div>
                  {formData.values.goals.includes(goal.id) && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Selection feedback */}
        {formData.values.goals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-linear-to-r from-blue-100 to-indigo-100 border border-blue-300/60 rounded-lg p-1 sm:p-1.5 shadow-sm backdrop-blur-sm"
          >
            <div className="flex items-center space-x-2 sm:space-x-3">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
              <div>
                <p className="text-blue-700 text-xs">
                  {translations("Great")}! {translations("You've selected")}{" "}
                  {formData.values.goals.length} goal
                  {formData.values.goals.length !== 1 ? "s" : ""}
                </p>
                <p className="text-gray-700 text-[10px] sm:text-xs">
                  {translations(
                    "We'll prioritize these features in your dashboard",
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      <div className="flex justify-between pt-2 sm:pt-3 border-t border-gray-200 w-full">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm border-2 border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          {translations("Back")}
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="min-w-24 sm:min-w-30 flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader /> : translations("Continue")}
          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
        </Button>
      </div>
    </div>
  );
}

export function Step4({ formData }) {
  const integrations = [
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      description: "Connect your WhatsApp Business account",
      required: true,
    },
    {
      id: "instagram",
      name: "Instagram Business",
      description: "Link your Instagram Business profile",
      required: false,
    },
  ];
  return (
    <div className="w-full">
      <div className="text-center mb-4 sm:mb-5">
        <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-linear-to-r from-orange-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
          <Zap className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-orange-600" />
        </div>
        <h2 className="text-base sm:text-lg text-gray-900 mb-0.5 sm:mb-1">
          Connect Your Channels
        </h2>
        <p className="text-xs sm:text-sm text-gray-600">
          Link your social media and messaging accounts to get started
        </p>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {integrations.map((integration) => (
          <Card
            key={integration.id}
            className="p-2 sm:p-3 border-2 border-gray-200 bg-white hover:border-gray-300 transition-all duration-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${
                    integration.id === "whatsapp"
                      ? "bg-green-100"
                      : integration.id === "instagram"
                        ? "bg-purple-100"
                        : "bg-blue-100"
                  }`}
                >
                  {integration.id === "whatsapp" && (
                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                  )}
                  {integration.id === "instagram" && (
                    <Instagram className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <span className="text-xs sm:text-sm text-gray-900">
                      {integration.name}
                    </span>
                    {integration.required && (
                      <span className="text-[10px] sm:text-xs bg-linear-to-r from-orange-500 to-blue-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-600">
                    {integration.description}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-2 border-gray-300 hover:border-orange-500 hover:text-orange-600 text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1"
              >
                Connect
              </Button>
            </div>
          </Card>
        ))}

        <div className="bg-linear-to-r from-orange-50 to-blue-50 border border-orange-200 rounded-lg p-2 sm:p-2.5 mt-2 sm:mt-3">
          <div className="text-center">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600 mx-auto mb-0.5 sm:mb-1" />
            <p className="text-xs sm:text-sm text-orange-800">
              No worries if you skip this step!
            </p>
            <p className="text-[10px] sm:text-xs text-orange-600">
              You can connect these accounts anytime from your dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
