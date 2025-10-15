import { useState } from "react";
import { useRouter } from "next/navigation";

import { useForm } from "@mantine/form";
import { motion } from "framer-motion";
import { Eye, EyeOff, Key, Lock, Mail } from "lucide-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useTranslations } from "next-intl";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod/v4";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkboxnew";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader } from "../ui/loader";
import styles from "./AuthForm.module.css";
import GoogleSignInButton from "./GoogleSigninButton";
import { signUpType } from "./SignupFormNew";

export default function SignInFlow({ setIsLoading, signIn, isLoading }) {
  const translations = useTranslations();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [signUpTypeValue, setSignUpTypeValue] = useState("");

  const loginSchema = z.object(
    signUpTypeValue === signUpType.SIGNUP_WITH_PHONE
      ? {
          phoneNumber: z
            .string()
            .refine(
              (val) =>
                signUpTypeValue !== signUpType.SIGNUP_WITH_PHONE ||
                isValidPhoneNumber(val),
              {
                error: translations("Enter a valid phone number"),
              },
            ),
        }
      : {
          email: z.email().min(1, translations("Email is required")),
          password: z
            .string()
            .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
              error: translations(
                "Password should contain at least one letter and one number",
              ),
            })
            .min(
              5,
              translations("Password should be at least 5 characters long"),
            ),
        },
  );

  const loginForm = useForm({
    initialValues: {
      email: "",
      password: "",
      phoneNumber: "",
    },
    validate: zod4Resolver(loginSchema),
  });

  const handleSubmit = (values) => {
    localStorage.removeItem("selected_plan");
    setIsLoading(true);
    signIn(
      values.email,
      values.password,
      values.phoneNumber,
      values.prefLanguage,
    ).finally(() => {
      setIsLoading(false);
    });
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center w-full p-4 bg-gradient-to-br from-blue-50/40 via-purple-50/30 to-pink-50/40 relative">
      <div className="text-center mb-2">
        <div className="flex items-center justify-center mb-1">
          <img
            src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup-logo-blue-text.svg`}
            alt="RateUp Logo"
            className="w-18 h-auto"
          />
        </div>
        <h2 className="text-lg text-gray-900 mb-1">Welcome Back</h2>
        <p className="text-sm text-gray-600">Sign in to your RateUp account</p>
      </div>
      <Card className="flex flex-col px-6 py-4 sm:min-w-md max-w-lg">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-4"
          >
            <Lock className="w-7 h-7 text-white" />
          </motion.div>
          <h2 className="text-lg text-gray-900">Sign In</h2>
          <p className="text-sm text-gray-600">
            Continue your growth journey with RateUp
          </p>
        </div>
        <GoogleSignInButton
          className={styles["login-signup-with-google-btn"]}
          buttonText={"Continue with Google"}
        />
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
          className="flex flex-col justify-center gap-2"
          onSubmit={loginForm.onSubmit(handleSubmit)}
        >
          <div className="space-y-1">
            <Label htmlFor="email" className="text-gray-700 text-sm">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                className="pl-10 h-10 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-sm"
                {...loginForm.getInputProps("email")}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="password" className="text-gray-700 text-sm">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="pl-10 pr-10 h-10 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-sm"
                {...loginForm.getInputProps("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="remember"
                className="border-2 border-gray-300 h-4 w-4 flex-shrink-0"
              />
              <Label htmlFor="remember" className="text-sm text-gray-600">
                Remember me
              </Label>
            </div>
            <button
              type="button"
              onClick={() => router.push("/login/reset-password")}
              className="text-sm text-rateup-blue hover:text-rateup-blue/80 underline flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Key className="w-3 h-3" />
              <span>Forgot password?</span>
            </button>
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full cursor-pointer h-10 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader /> : "Sign In"}
          </Button>
        </form>

        <div className="w-full text-center mt-3 pt-2 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
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
