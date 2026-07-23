import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { useCheckEmailExistMutation } from "@/backend/user/user.query";
import { useSendResetEmail, useSetNewPassword } from "@/utils/auth/resetPassword.tsx";
import { rateupLogoStackedWhiteTransparent, SAVE_HOTKEY } from "@/utils/constants.ts";
import { ResetSteps } from "@/utils/enums/index.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";

import { Button } from "../ui/button.tsx";
import { Card } from "../ui/card.tsx";
import { Field, FieldError, FieldLabel } from "../ui/field.tsx";
import { Input } from "../ui/input.tsx";
import { Loader } from "../ui/loader.tsx";

const ResetPasswordForm = ({ mode }) => {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const token = searchParams.token;
  const rid = searchParams.rid;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const requestStatus = searchParams.requestStatus;
  const emailTo = searchParams.emailTo;

  const [page, setPage] = useState(token && token.length > 0 ? ResetSteps.STEP_THREE : mode);
  const { t: translations } = useTranslation();
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
  }, [mode, token, rid, requestStatus]);
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
          message: translations("Password should be at least 5 characters long"),
        })
        .refine((val) => /\d/.test(val) && /[a-zA-Z]/.test(val), {
          message: translations("Password should contain at least one letter and one number!"),
        }),
      confirmPassword: z.string().min(1, { message: translations("Confirm password is required") }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ["confirmPassword"],
      message: translations("Passwords do not match"),
    });

  type PwdSchemaType = z.infer<typeof pwdSchema>;

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  const pwdForm = useForm<PwdSchemaType>({
    resolver: zodResolver(pwdSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const sendResetEmail = useSendResetEmail();
  const checkEmailMutaion = useCheckEmailExistMutation();
  const isEmailPage = page === ResetSteps.STEP_ONE;
  const password = pwdForm.watch("password");
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
      valid: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  const handleSuccess = () => {
    toast.success("Password updated successfully!", { id: "password-success" });
    navigate({
      to: "/login",
    });
  };

  const setNewPassword = useSetNewPassword(handleSuccess);

  const onSubmit = isEmailPage
    ? async (values) => {
        try {
          const user = await checkEmailMutaion.mutateAsync({
            email: values.email,
          });
          if (!user?.success) {
            emailForm.setError("email", {
              message: translations("User with this email does not exist!"),
            });
            toast.error(translations("User with this email does not exist!"), {
              id: "user-not-found",
            });
            return;
          }
          setIsLoading(true);
          sendResetEmail(values.email).finally(() => {
            setIsLoading(false);
          });
        } catch {
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
        <img src={rateupLogoStackedWhiteTransparent} alt="RateUp" className="w-20" />
      </div>
      {page !== ResetSteps.STEP_TWO ? (
        <Card className="border-none shadow-lg p-4 max-w-2xl sm:min-w-md flex flex-col gap-8">
          <div className="text-center space-y-2 flex flex-col  items-center justify-center gap-1">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              {isEmailPage ? (
                <Mail className="w-6 h-6 text-primary" />
              ) : (
                <Lock className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="text-2xl font-normal">
              {isEmailPage ? translations("Reset Password") : translations("Set New Password")}
            </div>
            <span className="text-md text-gray-500 text-center max-w-sm mx-auto leading-relaxed">
              {isEmailPage
                ? translations("Enter your email address and we'll send you a verification code")
                : translations("Create a strong new password for your account")}
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {isEmailPage ? (
              <form
                className="space-y-4"
                onSubmit={emailForm.handleSubmit(onSubmit)}
                onKeyDown={getHotkeyHandler([
                  [SAVE_HOTKEY, (event: any) => emailForm.handleSubmit(onSubmit)(event)],
                ])}
              >
                <Controller
                  name="email"
                  control={emailForm.control}
                  render={({ field, fieldState }) => (
                    <Field className="space-y-2" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="email">{translations("Email Address")}</FieldLabel>
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        placeholder={translations("Enter your email address")}
                        required
                        aria-invalid={fieldState.invalid}
                        className="h-12 bg-gray-100"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-primary hover:bg-primary/80 cursor-pointer disabled:bg-primary/70"
                >
                  {isLoading ? <Loader /> : translations("Reset Password")}
                </Button>
              </form>
            ) : (
              <form
                className="space-y-4"
                onSubmit={pwdForm.handleSubmit(onSubmit)}
                onKeyDown={getHotkeyHandler([
                  [SAVE_HOTKEY, (event: any) => pwdForm.handleSubmit(onSubmit)(event)],
                ])}
              >
                <Controller
                  name="password"
                  control={pwdForm.control}
                  render={({ field, fieldState }) => (
                    <Field className="space-y-1" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="password" className="text-gray-700 text-sm">
                        {translations("New Password")}
                      </FieldLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          {...field}
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder={translations("Enter your new password")}
                          aria-invalid={fieldState.invalid}
                          className="pl-10 pr-10 h-8 border-2 border-gray-200 focus:border-primary focus:ring-primary/20 bg-white text-sm"
                          onFocus={() => setIsPasswordFocused(true)}
                          onBlur={() => {
                            field.onBlur();
                            setIsPasswordFocused(false);
                          }}
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
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* Confirm Password */}
                <Controller
                  name="confirmPassword"
                  control={pwdForm.control}
                  render={({ field, fieldState }) => (
                    <Field className="space-y-1" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="confirmPassword" className="text-gray-700 text-sm">
                        {translations("Confirm New Password")}
                      </FieldLabel>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          {...field}
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={translations("Confirm your new password")}
                          aria-invalid={fieldState.invalid}
                          className="pl-10 pr-10 h-8 border-2 border-gray-200 focus:border-primary focus:ring-primary/20 bg-white text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
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
                          <li key={rule.label} className="flex items-center space-x-1">
                            {rule.valid ? (
                              <span className="text-green-600">✔</span>
                            ) : (
                              <span className="text-gray-400">●</span>
                            )}
                            <span className={rule.valid ? "text-gray-800" : "text-gray-500"}>
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
                  className="w-full h-12 bg-primary hover:bg-primary/80 cursor-pointer disabled:bg-primary/70"
                >
                  {isLoading ? <Loader /> : translations("Update Password")}
                </Button>
              </form>
            )}

            <Link
              to={"/login"}
              className="flex py-1 rounded-md items-center justify-center gap-3 text-black cursor-pointer hover:bg-primary/20 hover:text-primary"
            >
              <ArrowLeft strokeWidth={1} />
              {translations("Back to Sign In")}
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="border-none shadow-lg p-6 max-w-md w-full flex flex-col items-center text-center gap-6">
          <div className="w-18 h-18 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-10 h-10 text-primary" />
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              {translations("Check your email")}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {translations("A password reset link has been sent to your email address")}
            </p>
            <p className="text-gray-900 font-medium mt-1">{emailTo}</p>
          </div>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-medium"
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
