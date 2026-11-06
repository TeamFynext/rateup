import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";
import { z } from "zod/v4";

import { useCompleteBusinessProfile } from "@/backend/org/org.query.tsx";
import { useUserInfo } from "@/backend/user/user.query";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { Card } from "../ui/card.tsx";
import { Spinner } from "../ui/spinner.tsx";
import { AuthShell, AuthTitle } from "./AuthShell.tsx";
import { asSignupForm } from "./signup/shared.tsx";
import { SIGNUP_COPY, SignupProgress } from "./signup/SignupProgress.tsx";
import { Step2 } from "./signup/Step2.tsx";
import { Step3 } from "./signup/Step3.tsx";

function pricingOrgName(stored: string | null): string | undefined {
  if (!stored) return undefined;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null || !("orgName" in parsed)) return undefined;
    return typeof parsed.orgName === "string" && parsed.orgName ? parsed.orgName : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Steps two and three of signup, asked once the account exists: the business, then what
 * RateUp should do first. Every new owner lands here, and the dashboard sends back an owner
 * who left before finishing.
 */
export function BusinessProfileFlow() {
  const { t: translations } = useTranslation();
  const navigate = useNavigate();
  const { data: userInfo, isPending } = useUserInfo();
  const completeProfile = useCompleteBusinessProfile();
  const [step, setStep] = useState<2 | 3>(2);

  const user = userInfo && "data" in userInfo ? userInfo.data : undefined;
  // An older API omits the flag; only an explicit `false` has anything left to ask.
  const alreadyDone = !!user && user.profileCompleted !== false;

  // Saving refetches the user, which flips `alreadyDone`; the success page must win that race.
  const submitting = useRef(false);
  useEffect(() => {
    if (alreadyDone && !submitting.current) void navigate({ to: "/dashboard", replace: true });
  }, [alreadyDone, navigate]);

  const schema = z.object({
    orgName: z.string().trim().min(2, translations("Business name is required")),
    website: z.string().optional(),
    phoneNumber: z
      .string()
      .min(1, translations("Phone number is required"))
      .refine((val) => isValidPhoneNumber(val), {
        message: translations("Enter a valid phone number"),
      }),
    industry: z.string().min(1, translations("Industry is required")),
    teamSize: z.string().min(1, translations("Team size is required")),
    goals: z.array(z.string()),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      orgName: "",
      website: "",
      phoneNumber: "",
      industry: "",
      teamSize: "",
      goals: [] as string[],
    },
  });

  useEffect(() => {
    const orgName = pricingOrgName(localStorage.getItem("newUserFromPricingPage"));
    if (orgName) form.setValue("orgName", orgName);
  }, []);

  const handleSubmit = () => {
    const values = form.getValues();
    submitting.current = true;
    completeProfile.mutate(
      {
        orgName: values.orgName.trim(),
        phoneNumber: values.phoneNumber,
        website: values.website?.trim() || undefined,
        industry: values.industry,
        teamSize: values.teamSize,
        goals: values.goals,
      },
      {
        onSuccess: () => {
          localStorage.removeItem("newUserFromPricingPage");
          void navigate({ to: "/signup/success" });
        },
        onError: (error) => {
          submitting.current = false;
          toast.error(getApiErrorMessage(error, translations("Couldn't save. Try again.")));
        },
      },
    );
  };

  if (isPending || alreadyDone) {
    return (
      <AuthShell isSignup={true}>
        <Spinner className="size-6 text-muted-foreground" />
      </AuthShell>
    );
  }

  const copy = SIGNUP_COPY[step - 1];

  return (
    <AuthShell isSignup={true}>
      <div className="flex w-full max-w-108 flex-col gap-3.5">
        <SignupProgress currentStep={step} />

        <Card className="min-h-121 gap-4 rounded-2xl px-6 py-4 shadow-md ring-border sm:px-7.5">
          <AuthTitle title={translations(copy.title)} subtitle={translations(copy.subtitle)} />

          {step === 2 ? (
            <Step2 formData={asSignupForm(form)} handleNext={() => setStep(3)} />
          ) : (
            <Step3
              formData={asSignupForm(form)}
              handleBack={() => setStep(2)}
              handleSubmit={handleSubmit}
              isLoading={completeProfile.isPending}
            />
          )}
        </Card>
      </div>
    </AuthShell>
  );
}
