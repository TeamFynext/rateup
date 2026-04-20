import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
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
  Lock,
  Mail,
  MessageSquare,
  Target,
  User,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useExtracted } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import AppleSignInButton from "./AppleSigninButton";
import GoogleSignInButton from "./GoogleSigninButton";

export const signUpType = {
  SIGNUP_WITH_GOOGLE: "google",
  SIGNUP_WITH_APPLE: "apple",
  SIGNUP_WITH_EMAIL: "email",
  SIGNUP_WITH_PHONE: "phone",
};

export function SignUpFlow({ setIsLoading, signUp, isLoading }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [signUpTypeValue, setSignUpTypeValue] = useState("");
  const translations = useExtracted();

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
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      confirmPassword: "",
      orgName: "",
      website: "",
      phoneNumber: "",
      industry: "",
      location: "",
      goals: [],
      integrationsSelected: [],
    },
  });

  useEffect(() => {
    const newUserFromPricingPage = localStorage.getItem(
      "newUserFromPricingPage",
    );
    if (newUserFromPricingPage) {
      const data = JSON.parse(newUserFromPricingPage);
      signupForm.reset({
        ...signupForm.getValues(),
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
        email: signupForm.getValues("email"),
        name: signupForm.getValues("name"),
        planName: cart?.name,
      });
    }

    setIsLoading(true);
    signUp(
      signupForm.getValues("email"),
      signupForm.getValues("password"),
      signupForm.getValues("name"),
      signupForm.getValues("orgName"),
      signupForm.getValues("phoneNumber"),
      selectedPlan?.id,
      signupForm.getValues("website"),
      signupForm.getValues("industry"),
      signupForm.getValues("location"),
      signupForm.getValues("goals"),
      signupForm.getValues("integrationsSelected"),
    ).finally(() => {
      setIsLoading(false);
      localStorage.removeItem("selected_plan");
      localStorage.removeItem("newUserFromPricingPage");
    });
  };
  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Create Your Account";
      case 2:
        return "Tell Us About Your Business";
      case 3:
        return "What features are you interested in RateUp?";
      default:
        return "";
    }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center w-full p-3 sm:p-4 md:p-6 bg-linear-to-br from-blue-50/40 via-purple-50/30 to-pink-50/40 relative">
      <div className="text-center mb-0.5 sm:mb-1 max-w-xs sm:max-w-sm">
        <img
          src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/LogoRateup.png`}
          alt="RateUp Logo"
          className="h-auto w-24"
        />
      </div>
      <div className="w-full max-w-md mx-auto">
        {/* progress bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-semibold text-gray-500 tracking-wider uppercase">
              Step {currentStep} of {totalSteps}
            </div>
            <div className="text-xs font-semibold text-gray-500">
              {Math.round(progress)}% complete
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <Card className="p-8 shadow-sm border border-gray-200 bg-white mb-8">
          <h2 className="text-xl font-bold text-gray-900">{getStepTitle()}</h2>
          {currentStep === 1 && (
            <Step1
              formData={signupForm}
              handleNext={handleNext}
              authType={signUpType.SIGNUP_WITH_EMAIL}
            />
          )}
          {currentStep === 2 && (
            <Step2
              formData={signupForm}
              handleBack={handleBack}
              handleNext={handleNext}
            />
          )}
          {currentStep === 3 && (
            <Step3
              formData={signupForm}
              handleBack={handleBack}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          )}
        </Card>
        <div className="flex items-center justify-center gap-6 mt-8 text-xs text-gray-400">
          <button
            onClick={() => router.push("/privacy-policy")}
            className="hover:text-gray-600 uppercase tracking-wider text-xs"
          >
            <span className="uppercase tracking-wider text-xs">
              Privacy Policy
            </span>
          </button>
          <button
            onClick={() => router.push("/terms-of-service")}
            className="hover:text-gray-600 uppercase tracking-wider text-xs"
          >
            <span className="uppercase tracking-wider text-xs">
              Terms of Service
            </span>
          </button>
          <button
            className="hover:text-gray-600 uppercase tracking-wider text-xs"
            onClick={() => window.open("https://docs.rateup.app", "_blank")}
          >
            <span className="uppercase tracking-wider text-xs">
              Help Center
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function Step1({ formData, handleNext, authType }) {
  const values = formData.watch();
  const translations = useExtracted();
  const checkEmailMutaion = useCheckEmailExistMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [agreesToTerms, setAgreesToTerms] = useState(true);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const password = values.password;
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

  const google = authType === signUpType.SIGNUP_WITH_GOOGLE;
  const apple = authType === signUpType.SIGNUP_WITH_APPLE;

  const isSocial = google || apple;

  const isFormComplete =
    values.name.trim() !== "" &&
    (isSocial
      ? true
      : values.email.trim() !== "" &&
        values.password.trim() !== "" &&
        isPasswordValid(values.password)) &&
    agreesToTerms;

  const handleClick = async () => {
    if (!isSocial) {
      if (values?.email) {
        setLoading(true);
        const response = await checkEmailMutaion.mutateAsync({
          email: values.email.trim(),
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
    <div className="flex flex-col justify-between gap-2 sm:gap-3 w-full min-h-96">
      <div className="flex flex-col gap-2">
        {isSocial ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Account connected successfully!
                </p>
                <p className="text-xs text-gray-600 mt-1">{values.email}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <GoogleSignInButton
              className="w-full h-8 py-2 border-2 border-gray-300 hover:border-gray-400 bg-white text-gray-800 hover:bg-gray-50 font-medium"
              buttonText={"Continue with Google"}
            />
            <AppleSignInButton
              className="w-full h-8 py-2 border-2 border-gray-300 hover:border-gray-400 bg-white text-gray-800 hover:bg-gray-50 font-medium"
              buttonText="Continue with Apple"
            />
          </div>
        )}
        {!isSocial && (
          <>
            {/* Divider */}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400 tracking-wider uppercase">
                  Or continue with email
                </span>
              </div>
            </div>
          </>
        )}
        <div className="space-y-2 sm:space-y-3">
          <div className="space-y-1">
            <Label
              htmlFor="email"
              className="text-xs font-medium text-gray-900"
            >
              Name
            </Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Controller
                name="name"
                control={formData.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="name"
                    type="text"
                    placeholder={translations("Name")}
                    className="pl-11 h-8 border-2 border-gray-200 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 bg-white"
                  />
                )}
              />
            </div>
          </div>
          {/* Email + Passwords (only if not Google signup) */}

          {!isSocial && (
            <>
              <div className="space-y-0.5 sm:space-y-1">
                <div className="space-y-1">
                  <Label
                    htmlFor="email"
                    className="text-xs font-medium text-gray-900"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Controller
                      name="email"
                      control={formData.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="email"
                          type="email"
                          placeholder="you@company.com"
                          className="pl-11 h-8 border-2 border-gray-200 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 bg-white"
                        />
                      )}
                    />
                  </div>
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
              <div className="space-y-1">
                <Label
                  htmlFor="password"
                  className="text-xs font-medium text-gray-900"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Controller
                    name="password"
                    control={formData.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={(e) => {
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
                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              {/* Password Validation Errors */}
              <AnimatePresence>
                {values.password && !isPasswordValid(values.password) && (
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
      </div>
      {/* Terms checkbox */}
      <div className="flex flex-col gap-1">
        <div className="flex items-start space-x-3 pt-2">
          <Checkbox
            id="terms"
            checked={agreesToTerms}
            onCheckedChange={(checked) => setAgreesToTerms(checked as boolean)}
            className="border-2 border-gray-300 h-4 w-4 shrink mt-0.5"
          />
          <Label
            htmlFor="terms"
            className="text-xs text-gray-600 leading-relaxed cursor-pointer"
          >
            I agree to the{" "}
            <button
              onClick={() => router.push("/terms-of-service")}
              className="text-primary hover:underline"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              onClick={() => router.push("/privacy-policy")}
              className="text-primary hover:underline"
            >
              Privacy Policy
            </button>
          </Label>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-600">
            Already have an account?{" "}
            <span
              onClick={() => router.push("/login")}
              className="text-primary font-medium hover:underline cursor-pointer"
            >
              Sign in
            </span>
          </p>
        </div>
        {/* Footer actions */}

        <div className="flex justify-between gap-4 mt-2">
          <Button
            variant="outline"
            disabled={true}
            className="flex items-center px-4 h-8 border-2 border-gray-300 hover:border-gray-400 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleClick}
            disabled={!isFormComplete}
            className="flex items-center px-4 h-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader /> : translations("Continue")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Step2({ formData, handleBack, handleNext }) {
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

  const values = formData.watch();

  const isFormComplete =
    values.orgName?.trim() !== "" &&
    values.phoneNumber?.trim() !== "" &&
    values.industry?.trim() !== "";

  return (
    <div className="w-full h-96 flex flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {/* Business Name */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-900">
            Business Name
          </Label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Controller
              name="orgName"
              control={formData.control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Your Company Name"
                  className="h-8 pl-9 text-xs border border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white"
                />
              )}
            />
          </div>
        </div>

        {/* Website */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-900">
            Website URL
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Controller
              name="website"
              control={formData.control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="https://yourcompany.com"
                  className="h-8 pl-9 text-xs border border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white"
                />
              )}
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-900">
            Contact Number
          </Label>
          <Controller
            name="phoneNumber"
            control={formData.control}
            render={({ field }) => (
              <PhoneInput
                international
                defaultCountry="IN"
                value={field.value}
                onChange={(val) => field.onChange(val || "")}
                className="h-8 border border-gray-300 rounded-md px-2 text-xs bg-white 
                [&>input]:border-0 [&>input]:focus:ring-0 [&>input]:outline-none [&>input]:w-full"
              />
            )}
          />
        </div>

        {/* Industry */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-900">Industry</Label>
          <Controller
            name="industry"
            control={formData.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-8 w-full text-xs border border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white">
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
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between gap-3 mt-2 pt-2">
        <Button
          variant="outline"
          onClick={handleBack}
          className="h-8 px-4 text-xs border border-gray-300"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={!isFormComplete}
          className="h-8 px-4 text-xs bg-primary text-white disabled:opacity-50"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
export function Step3({ formData, handleBack, handleSubmit, isLoading }) {
  const values = formData.watch();

  const businessGoals = [
    { id: "whatsapp-api", label: "WhatsApp Business API", icon: MessageSquare },
    {
      id: "loyalty-program",
      label: "Build Loyalty Program on WhatsApp",
      icon: Users,
    },
    { id: "whatsapp-campaigns", label: "WhatsApp Campaigns", icon: Target },
    {
      id: "customer-feedback",
      label: "Collect customer feedbacks",
      icon: MessageSquare,
    },
    {
      id: "web-feedback-forms",
      label: "Web based Feedback Forms",
      icon: Globe,
    },
  ];

  const handleGoalToggle = (goalId: string) => {
    const currentGoals = values.goals || [];

    const newGoals = currentGoals.includes(goalId)
      ? currentGoals.filter((g) => g !== goalId)
      : [...currentGoals, goalId];

    formData.setValue("goals", newGoals);
  };

  return (
    <div className="w-full flex flex-col">
      <div className="mb-2">
        <p className="text-xs text-gray-500">
          Select all that apply to personalize your experience
        </p>
      </div>

      {/* Goals List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {businessGoals.map((goal) => {
          const isActive = values.goals?.includes(goal.id);

          return (
            <div
              key={goal.id}
              onClick={() => handleGoalToggle(goal.id)}
              className={`flex items-center gap-2 p-2.5 border rounded-md cursor-pointer transition-all
                ${
                  isActive
                    ? "border-primary bg-blue-50"
                    : "border-gray-300 hover:border-gray-400 bg-white"
                }`}
            >
              {/* Icon */}
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center
                  ${isActive ? "bg-primary" : "bg-gray-100"}`}
              >
                <goal.icon
                  className={`w-4 h-4 ${
                    isActive ? "text-white" : "text-gray-600"
                  }`}
                />
              </div>

              {/* Label */}
              <span
                className={`flex-1 text-xs ${
                  isActive ? "text-gray-900 font-medium" : "text-gray-700"
                }`}
              >
                {goal.label}
              </span>

              {/* Check */}
              {isActive && <CheckCircle className="w-4 h-4 text-primary" />}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between gap-3 mt-2 pt-2">
        <Button
          variant="outline"
          onClick={handleBack}
          className="h-8 px-4 text-xs border border-gray-300"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="h-8 px-4 text-xs bg-primary text-white disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Continue"}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
