import { useState } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Key, Lock, Mail } from "lucide-react";
import { motion } from "motion/react";
import { useExtracted } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader } from "../ui/loader";
import AppleSignInButton from "./AppleSigninButton";
import GoogleSignInButton from "./GoogleSigninButton";

const loginSchema = z.object({
  email: z.email().min(1, "Email is required"),
  password: z
    .string()
    .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
      error: "Password should contain at least one letter and one number",
    })
    .min(5, "Password should be at least 5 characters long"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type SignInFlowProps = Readonly<{
  setIsLoading: (value: boolean) => void;
  signIn: (
    email?: string,
    password?: string,
    phoneNumber?: string,
    prefLanguage?: string,
  ) => Promise<unknown>;
  isLoading: boolean;
}>;

export default function SignInFlow({
  setIsLoading,
  signIn,
  isLoading,
}: SignInFlowProps) {
  const translations = useExtracted();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const translatedLoginSchema = loginSchema.extend({
    email: z.email().min(1, translations("Email is required")),
    password: z
      .string()
      .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
        error: translations(
          "Password should contain at least one letter and one number",
        ),
      })
      .min(5, translations("Password should be at least 5 characters long")),
  });

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(translatedLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = (values: LoginFormValues) => {
    localStorage.removeItem("selected_plan");
    setIsLoading(true);
    signIn(values.email, values.password, undefined, undefined).finally(() => {
      setIsLoading(false);
    });
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center w-full p-3 sm:p-4 md:p-6 bg-linear-to-br from-blue-50/40 via-purple-50/30 to-pink-50/40 relative">
      <div className="text-center mb-1.5 sm:mb-2 md:mb-3">
        <div className="flex items-center justify-center mb-0.5 sm:mb-1">
          <img
            src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup-logo-blue-text.svg`}
            alt="RateUp Logo"
            className="w-14 sm:w-16 md:w-18 h-auto"
          />
        </div>
        <h2 className="text-base sm:text-lg md:text-xl text-gray-900 mb-0.5 sm:mb-1">
          Welcome Back
        </h2>
        <p className="text-xs sm:text-sm text-gray-600">
          Sign in to your RateUp account
        </p>
      </div>
      <Card className="flex flex-col px-4 py-3 sm:px-5 sm:py-3.5 md:px-6 md:py-4 max-w-md w-full">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-1.5 sm:mb-2"
          >
            <Lock className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-white" />
          </motion.div>
          <h2 className="text-base sm:text-lg md:text-xl text-gray-900">
            Sign In
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Continue your growth journey with RateUp
          </p>
        </div>
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

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">
              Or continue with email
            </span>
          </div>
        </div>

        <form
          className="flex flex-col justify-center gap-1.5 sm:gap-2"
          onSubmit={loginForm.handleSubmit(handleSubmit)}
        >
          <FieldGroup className="gap-1.5 sm:gap-2">
            <Controller
              name="email"
              control={loginForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name} className="sr-only">
                    {translations("Email")}
                  </FieldLabel>
                  <div className="relative">
                    <Mail className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                    <Input
                      {...field}
                      id={field.name}
                      type="email"
                      aria-invalid={fieldState.invalid}
                      placeholder="Email"
                      className="pl-8 sm:pl-10 h-9 sm:h-10 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-xs sm:text-sm"
                    />
                  </div>
                  {fieldState.invalid && (
                    <FieldError
                      errors={[fieldState.error]}
                      className="text-xs"
                    />
                  )}
                </Field>
              )}
            />

            <Controller
              name="password"
              control={loginForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name} className="sr-only">
                    {translations("Password")}
                  </FieldLabel>
                  <div className="relative">
                    <Lock className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                    <Input
                      {...field}
                      id={field.name}
                      type={showPassword ? "text" : "password"}
                      aria-invalid={fieldState.invalid}
                      placeholder="Password"
                      className="pl-8 sm:pl-10 pr-8 sm:pr-10 h-9 sm:h-10 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-xs sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </button>
                  </div>
                  {fieldState.invalid && (
                    <FieldError
                      errors={[fieldState.error]}
                      className="text-xs"
                    />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Checkbox
                id="remember"
                className="border-2 border-gray-300 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0"
              />
              <Label
                htmlFor="remember"
                className="text-xs sm:text-sm text-gray-600"
              >
                Remember me
              </Label>
            </div>
            <button
              type="button"
              onClick={() => router.push("/login/reset-password")}
              className="text-xs sm:text-sm text-rateup-blue hover:text-rateup-blue/80 underline flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Key className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="text-xs sm:text-sm">Forgot password?</span>
            </button>
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full cursor-pointer h-9 sm:h-10 bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
          >
            {isLoading ? <Loader /> : "Sign In"}
          </Button>
        </form>

        <div className="w-full text-center mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600 text-center">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="cursor-pointer text-rateup-blue hover:text-rateup-blue/80 underline transition-colors"
            >
              Create account
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}
