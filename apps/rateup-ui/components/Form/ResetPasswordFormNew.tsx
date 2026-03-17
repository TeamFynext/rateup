"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { isEmail, useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconCheck, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import { zodResolver } from "mantine-form-zod-resolver";
import { useExtracted } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";

import { useCheckEmailExistMutation } from "../../backend/user/user.query";
import {
  useSendResetEmail,
  useSetNewPassword,
} from "../../utils/auth/resetPassword";
import { SAVE_HOTKEY } from "../../utils/constants";
import { ResetSteps } from "../../utils/enums";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader } from "../ui/loader";

const ResetPasswordForm = ({ mode }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const rid = searchParams.get("rid");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const requestStatus = searchParams.get("requestStatus");
  const emailTo = searchParams.get("emailTo");
  const type = searchParams.get("type");

  const [page, setPage] = useState(
    token && token.length > 0 ? ResetSteps.STEP_THREE : mode,
  );
  const translations = useExtracted();
  useEffect(() => {
    if (token && token.length > 0) {
      setPage(ResetSteps.STEP_THREE);
    } else {
      if (requestStatus === "success") {
        setPage(ResetSteps.STEP_TWO);
      } else {
        setPage(ResetSteps.STEP_ONE);
      }
    }
  }, [mode, token, rid, requestStatus, router]);
  const emailSchema = z.object({
    email: z.email("Enter a valid email address").min(1, "Email is required"),
    password: z.string().optional(), // optional if not used in this form
  });

  const pwdSchema = z
    .object({
      password: z
        .string()
        .min(1, { message: translations("Password is required") })
        .min(5, {
          message: translations(
            "Password should be at least 5 characters long",
          ),
        })
        .refine((val) => /\d/.test(val) && /[a-zA-Z]/.test(val), {
          message: translations(
            "Password should contain at least one letter and one number!",
          ),
        }),
      confirmPassword: z
        .string()
        .min(1, { message: translations("Confirm password is required") }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ["confirmPassword"],
      message: translations("Passwords do not match"),
    });

  type PwdSchemaType = z.infer<typeof pwdSchema>;

  const emailForm = useForm({
    initialValues: {
      email: "",
      password: "",
    },

    validate: zodResolver(emailSchema),
  });

  const pwdForm = useForm<PwdSchemaType>({
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validate: zodResolver(pwdSchema),
  });

  const sendResetEmail = useSendResetEmail();
  const checkEmailMutaion = useCheckEmailExistMutation();
  const isEmailPage = page === ResetSteps.STEP_ONE;
  const password = pwdForm.values.password;
  // const isEmailPage = true;
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSuccess = () => {
    toast.success("Password updated successfully!", { id: "password-success" });
    router.push("/login");
  };

  const setNewPassword = useSetNewPassword(handleSuccess);

  const onSubmit = isEmailPage
    ? async (values) => {
        try {
          const user = await checkEmailMutaion.mutateAsync({
            email: values.email,
          });
          if (!user?.success) {
            emailForm.setFieldError(
              "email",
              translations("User with this email does not exist!"),
            );
            toast.error(translations("User with this email does not exist!"), {
              id: "user-not-found",
            });
            return;
          }
          setIsLoading(true);
          sendResetEmail(values.email).finally(() => {
            setIsLoading(false);
          });
        } catch (error) {
          setIsLoading(false);
        }
      }
    : (values) => {
        setIsLoading(true);
        setNewPassword(values.confirmPassword).finally(() => {
          setIsLoading(false);
        });
      };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center">
        <img
          src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup-logo-blue-text.svg`}
          alt="RateUp"
          className="w-18"
        />
      </div>
      {page !== ResetSteps.STEP_TWO ? (
        <Card className="border-none shadow-lg p-4 max-w-2xl sm:min-w-md flex flex-col gap-8">
          <div className="text-center space-y-2 flex flex-col  items-center justify-center gap-1">
            <div className="w-12 h-12 bg-rateup-blue/10 rounded-full flex items-center justify-center mx-auto">
              {isEmailPage ? (
                <Mail className="w-6 h-6 text-rateup-blue" />
              ) : (
                <Lock className="w-6 h-6 text-rateup-blue" />
              )}
            </div>
            <div className="text-2xl font-normal">
              {isEmailPage
                ? translations("Reset Password")
                : translations("Set New Password")}
            </div>
            <span className="text-md text-gray-500 text-center max-w-sm mx-auto leading-relaxed">
              {isEmailPage
                ? translations(
                    "Enter your email address and we'll send you a verification code",
                  )
                : translations("Create a strong new password for your account")}
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {isEmailPage ? (
              <form
                className="space-y-4"
                onSubmit={emailForm.onSubmit(onSubmit)}
                onKeyDown={getHotkeyHandler([
                  [
                    SAVE_HOTKEY,
                    (event: any) => emailForm.onSubmit(onSubmit)(event),
                  ],
                ])}
              >
                <div className="space-y-2">
                  <Label htmlFor="email">{translations("Email Address")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={translations("Enter your email address")}
                    required
                    className="h-12 bg-gray-100"
                    {...emailForm.getInputProps("email")}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-rateup-blue hover:bg-rateup-blue/80 cursor-pointer disabled:bg-rateup-blue/70"
                >
                  {isLoading ? <Loader /> : translations("Reset Password")}
                </Button>
              </form>
            ) : (
              <form
                className="space-y-4"
                onSubmit={pwdForm.onSubmit(onSubmit)}
                onKeyDown={getHotkeyHandler([
                  [
                    SAVE_HOTKEY,
                    (event: any) => pwdForm.onSubmit(onSubmit)(event),
                  ],
                ])}
              >
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-gray-700 text-sm">
                    {translations("New Password")}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={translations("Enter your new password")}
                      className="pl-10 pr-10 h-8 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-sm"
                      {...pwdForm.getInputProps("password")}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
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

                {/* Confirm Password */}
                <div className="space-y-1">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-gray-700 text-sm"
                  >
                    {translations("Confirm New Password")}
                  </Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={translations("Confirm your new password")}
                      className="pl-10 pr-10 h-8 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-sm"
                      {...pwdForm.getInputProps("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {isPasswordFocused && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="text-xs text-gray-500 mt-1 overflow-hidden"
                    >
                      {translations("Password must have")}:
                      <ul className="list-none mt-1 space-y-1">
                        {rules.map((rule) => (
                          <li
                            key={rule.label}
                            className="flex items-center space-x-1"
                          >
                            {rule.valid ? (
                              <span className="text-green-600">✔</span>
                            ) : (
                              <span className="text-gray-400">●</span>
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

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-rateup-blue hover:bg-rateup-blue/80 cursor-pointer disabled:bg-rateup-blue/70"
                >
                  {isLoading ? <Loader /> : translations("Update Password")}
                </Button>
              </form>
            )}

            <Link
              href={"/login"}
              className="flex py-1 rounded-md items-center justify-center gap-3 text-black cursor-pointer hover:bg-rateup-blue/20 hover:text-rateup-blue"
            >
              <ArrowLeft strokeWidth={1} />
              {translations("Back to Sign In")}
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="border-none shadow-lg p-6 max-w-md w-full flex flex-col items-center text-center gap-6">
          <div className="w-18 h-18 bg-rateup-blue/10 rounded-full flex items-center justify-center">
            <Mail className="w-10 h-10 text-rateup-blue" />
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              {translations("Check your email")}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {translations(
                "A password reset link has been sent to your email address",
              )}
            </p>
            <p className="text-gray-900 font-medium mt-1">{emailTo}</p>
          </div>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-rateup-blue hover:text-rateup-blue/80 transition-colors text-sm font-medium"
          >
            <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
            {translations("Back to Sign In")}
          </Link>
        </Card>
      )}
    </div>
  );
};

export default ResetPasswordForm;
