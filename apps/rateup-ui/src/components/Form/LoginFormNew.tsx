import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertCircle,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconShield,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Button } from "../ui/button.tsx";
import { Card } from "../ui/card.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field.tsx";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "../ui/input-group.tsx";
import { Loader } from "../ui/loader.tsx";
import AppleSignInButton from "./AppleSigninButton.tsx";
import { AuthShell, AuthTitle } from "./AuthShell.tsx";
import GoogleSignInButton from "./GoogleSigninButton.tsx";

/** Sign-in's controls sit a step above the wizard's, which has more to fit. */
const CONTROL = "h-10 rounded-lg";

const buildLoginSchema = (t: (key: string) => string) =>
  z.object({
    email: z.email({
      error: (issue) => (issue.input === "" ? t("Email is required") : t("Enter a valid email")),
    }),
    password: z.string().min(1, t("Password is required")),
  });

type LoginFormValues = z.infer<ReturnType<typeof buildLoginSchema>>;

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

export default function SignInFlow({ setIsLoading, signIn, isLoading }: SignInFlowProps) {
  const { t: translations } = useTranslation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const resolver = useMemo(() => zodResolver(buildLoginSchema(translations)), [translations]);

  const loginForm = useForm<LoginFormValues>({
    resolver,
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
    <AuthShell isSignup={false}>
      <div className="flex w-full max-w-108 flex-col gap-3.5">
        <Card className="min-h-121 gap-5 rounded-2xl px-6 py-6 shadow-md ring-border sm:px-7.5">
          <AuthTitle
            size="lg"
            title={translations("Welcome back")}
            subtitle={translations("Sign in to pick up where your customers left off.")}
          />

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2.5">
              <GoogleSignInButton
                className={`flex-[1_1_180px] ${CONTROL} [&_span]:text-sm`}
                buttonText={translations("Google")}
              />
              <AppleSignInButton
                className={`flex-[1_1_180px] ${CONTROL} [&_span]:text-sm`}
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

          {/* `method="post"` guards the window between the server sending this HTML and
              React hydrating it: until the handler below is attached, a submit is the
              browser's own, and a GET one would write the password into the URL, the
              address bar, browser history and every access log along the way. */}
          <form
            method="post"
            className="flex flex-col gap-4"
            onSubmit={loginForm.handleSubmit(handleSubmit)}
          >
            <FieldGroup className="gap-4">
              <Controller
                name="email"
                control={loginForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="gap-1.5">
                    <FieldLabel htmlFor={field.name} className="text-[13px] font-medium">
                      {translations("Email")}
                    </FieldLabel>
                    <InputGroup className={CONTROL}>
                      <InputGroupAddon className="pl-3.5">
                        <IconMail />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id={field.name}
                        type="email"
                        aria-invalid={fieldState.invalid}
                        placeholder={translations("Enter email")}
                        className="text-[14.5px]"
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

              <Controller
                name="password"
                control={loginForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="gap-1.5">
                    <FieldLabel htmlFor={field.name} className="text-[13px] font-medium">
                      {translations("Password")}
                    </FieldLabel>
                    <InputGroup className={CONTROL}>
                      <InputGroupAddon className="pl-3.5">
                        <IconLock />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id={field.name}
                        type={showPassword ? "text" : "password"}
                        aria-invalid={fieldState.invalid}
                        placeholder={translations("Enter password")}
                        className="text-[14.5px]"
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
            </FieldGroup>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Field orientation="horizontal" className="w-auto gap-2.5">
                <Checkbox
                  id="keep-signed-in"
                  checked={keepSignedIn}
                  onCheckedChange={setKeepSignedIn}
                  className="size-4.5 rounded-md"
                />
                <FieldLabel
                  htmlFor="keep-signed-in"
                  className="text-[13.5px] font-normal text-secondary-foreground"
                >
                  {translations("Keep me signed in")}
                </FieldLabel>
              </Field>
              <button
                type="button"
                onClick={() => navigate({ to: "/login/reset-password" })}
                className="cursor-pointer text-[13.5px] font-medium text-primary transition-colors hover:text-primary/80"
              >
                {translations("Forgot password?")}
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="h-11.5 w-full cursor-pointer gap-2.5 rounded-lg text-[15px] font-semibold disabled:cursor-not-allowed"
            >
              {isLoading && <Loader className="size-4 border-white/35" />}
              {isLoading ? translations("Signing you in…") : translations("Sign in")}
            </Button>
          </form>

          {/* The design's placeholder line promised 2-step verification on new devices.
              There is no MultiFactorAuth/TOTP recipe in the API's SuperTokens config and
              no device tracking, so the copy states what sign-in actually enforces:
              EmailVerification runs in REQUIRED mode and every sign-in checks the claim. */}
          <div className="mt-auto flex items-center justify-center gap-2 border-t border-border pt-4 text-[12.5px] text-muted-foreground">
            <IconShield className="size-3.5 shrink-0" />
            {translations("Every account is secured with email verification")}
          </div>
        </Card>
      </div>
    </AuthShell>
  );
}
