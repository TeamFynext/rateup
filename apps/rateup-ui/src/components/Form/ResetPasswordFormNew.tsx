import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconEye,
  IconEyeOff,
  IconKey,
  IconLock,
  IconMail,
  IconShield,
} from "@tabler/icons-react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { useCheckEmailExistMutation } from "@/backend/user/user.query";
import { useSendResetEmail, useSetNewPassword } from "@/utils/auth/resetPassword.tsx";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import { ResetSteps } from "@/utils/enums/index.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";

import { Button } from "../ui/button.tsx";
import { Card } from "../ui/card.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field.tsx";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "../ui/input-group.tsx";
import { Loader } from "../ui/loader.tsx";
import { AUTH_CONTROL, AUTH_CTA, AuthShell, AuthTitle } from "./AuthShell.tsx";
import { CheckInboxCard } from "./CheckInboxCard.tsx";

/** Fields of either step of the reset flow — the email step or the new-password step. */
type ResetPasswordValues = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const ResetPasswordForm = ({ mode }: { mode: string }) => {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/(auth)/login/reset-password/" });
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
    ? async (values: ResetPasswordValues) => {
        try {
          const user = await checkEmailMutaion.mutateAsync({
            email: values.email ?? "",
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
          sendResetEmail(values.email ?? "").finally(() => {
            setIsLoading(false);
          });
        } catch {
          setIsLoading(false);
        }
      }
    : (values: ResetPasswordValues) => {
        setIsLoading(true);
        setNewPassword(values.confirmPassword ?? "").finally(() => {
          setIsLoading(false);
        });
      };

  if (page === ResetSteps.STEP_TWO) {
    return (
      <AuthShell isSignup={false}>
        <CheckInboxCard
          title={translations("Check your inbox")}
          description={translations("We sent a reset link to")}
          email={emailTo}
          expiryNote={translations("It works once and expires in 30 minutes.")}
          onResend={emailTo ? () => void sendResetEmail(emailTo) : undefined}
          backTo="/login"
          backLabel={translations("Back to sign in")}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell isSignup={false}>
      <div className="flex w-full max-w-108 flex-col gap-3.5">
        <Card className="gap-4 rounded-2xl px-6 py-4 shadow-md ring-border sm:px-7.5">
          <div className="flex flex-col gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl border border-ru-blue-200 bg-accent text-primary dark:border-primary/40">
              {isEmailPage ? (
                <IconKey className="size-5" stroke={1.8} />
              ) : (
                <IconLock className="size-5" stroke={1.8} />
              )}
            </span>
            <AuthTitle
              title={
                isEmailPage
                  ? translations("Reset your password")
                  : translations("Set a new password")
              }
              subtitle={
                isEmailPage
                  ? translations(
                      "Enter the email on your RateUp account and we'll send a link that expires in 30 minutes.",
                    )
                  : translations("Pick something you have not used anywhere else.")
              }
            />
          </div>

          {isEmailPage ? (
            <form
              method="post"
              className="flex flex-col gap-4"
              onSubmit={emailForm.handleSubmit(onSubmit)}
              onKeyDown={getHotkeyHandler([
                [SAVE_HOTKEY, () => void emailForm.handleSubmit(onSubmit)()],
              ])}
            >
              <Controller
                name="email"
                control={emailForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="gap-0.5">
                    <FieldLabel htmlFor="email" className="text-xs font-medium">
                      {translations("Email")}
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
                        required
                        aria-invalid={fieldState.invalid}
                        placeholder={translations("Enter email")}
                        className="text-[13.5px]"
                      />
                    </InputGroup>
                    {fieldState.invalid && (
                      <FieldError className="flex items-center gap-1.5 text-[12.5px]">
                        <IconAlertCircle className="size-3.5 shrink-0" />
                        {fieldState.error?.message}
                      </FieldError>
                    )}
                  </Field>
                )}
              />

              <Button type="submit" disabled={isLoading} className={AUTH_CTA}>
                {isLoading && <Loader className="size-4 border-white/35" />}
                {isLoading ? translations("Sending link…") : translations("Send reset link")}
              </Button>
            </form>
          ) : (
            <form
              method="post"
              className="flex flex-col gap-4"
              onSubmit={pwdForm.handleSubmit(onSubmit)}
              onKeyDown={getHotkeyHandler([
                [SAVE_HOTKEY, () => void pwdForm.handleSubmit(onSubmit)()],
              ])}
            >
              <FieldGroup className="gap-2.5">
                <Controller
                  name="password"
                  control={pwdForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="gap-0.5">
                      <FieldLabel htmlFor="password" className="text-xs font-medium">
                        {translations("New password")}
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
                          placeholder={translations("Enter new password")}
                          aria-invalid={fieldState.invalid}
                          className="text-[13.5px]"
                          onFocus={() => setIsPasswordFocused(true)}
                          onBlur={() => {
                            field.onBlur();
                            setIsPasswordFocused(false);
                          }}
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
                      {fieldState.invalid && (
                        <FieldError className="flex items-center gap-1.5 text-[12.5px]">
                          <IconAlertCircle className="size-3.5 shrink-0" />
                          {fieldState.error?.message}
                        </FieldError>
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="confirmPassword"
                  control={pwdForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="gap-0.5">
                      <FieldLabel htmlFor="confirmPassword" className="text-xs font-medium">
                        {translations("Confirm new password")}
                      </FieldLabel>
                      <InputGroup className={AUTH_CONTROL}>
                        <InputGroupAddon className="pl-3.5">
                          <IconShield />
                        </InputGroupAddon>
                        <InputGroupInput
                          {...field}
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder={translations("Confirm new password")}
                          aria-invalid={fieldState.invalid}
                          className="text-[13.5px]"
                        />
                        <InputGroupAddon align="inline-end" className="pr-2">
                          <InputGroupButton
                            size="icon-sm"
                            aria-label={
                              showConfirmPassword
                                ? translations("Hide password")
                                : translations("Show password")
                            }
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                      {fieldState.invalid && (
                        <FieldError className="flex items-center gap-1.5 text-[12.5px]">
                          <IconAlertCircle className="size-3.5 shrink-0" />
                          {fieldState.error?.message}
                        </FieldError>
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>

              <AnimatePresence>
                {isPasswordFocused && (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col gap-1 overflow-hidden text-[12.5px]"
                  >
                    {rules.map((rule) => (
                      <li key={rule.label} className="flex items-center gap-2">
                        <span
                          className={`size-1.5 shrink-0 rounded-full ${
                            rule.valid ? "bg-green-600 dark:bg-green-500" : "bg-input"
                          }`}
                        />
                        <span className={rule.valid ? "text-foreground" : "text-muted-foreground"}>
                          {translations(rule.label)}
                        </span>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>

              <Button type="submit" disabled={isLoading} className={AUTH_CTA}>
                {isLoading && <Loader className="size-4 border-white/35" />}
                {isLoading ? translations("Updating…") : translations("Update password")}
              </Button>
            </form>
          )}

          <Link
            to="/login"
            className="flex h-10 cursor-pointer items-center justify-center gap-1.75 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconArrowLeft className="size-3.5" />
            {translations("Back to sign in")}
          </Link>
        </Card>
      </div>
    </AuthShell>
  );
};

export default ResetPasswordForm;
