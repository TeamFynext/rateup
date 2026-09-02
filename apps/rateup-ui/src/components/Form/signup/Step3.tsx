import { IconArrowLeft, IconArrowRight, IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "../../ui/button.tsx";
import { Loader } from "../../ui/loader.tsx";
import type { SignupForm } from "./shared.tsx";

const BUSINESS_GOALS = [
  {
    id: "whatsapp-api",
    label: "WhatsApp Business API",
    description: "Verified sender, approved templates.",
  },
  {
    id: "loyalty-program",
    label: "Loyalty inside chat",
    description: "Points and tiers in the thread.",
  },
  {
    id: "whatsapp-campaigns",
    label: "Campaigns that get opened",
    description: "Broadcasts with delivery reporting.",
  },
  {
    id: "customer-feedback",
    label: "Reviews and ratings",
    description: "Ask for a rating after delivery.",
  },
  {
    id: "web-feedback-forms",
    label: "Surveys on the web",
    description: "NPS and CSAT forms you can share.",
  },
  {
    id: "unified-inbox",
    label: "One shared inbox",
    description: "WhatsApp and Instagram in one queue.",
  },
] as const;

export function Step3({
  formData,
  handleBack,
  handleSubmit,
  isLoading,
}: {
  formData: SignupForm;
  handleBack: () => void;
  handleSubmit: () => void;
  isLoading: boolean;
}) {
  const { t: translations } = useTranslation();
  const values = formData.watch();
  const selected: string[] = values.goals ?? [];

  const handleGoalToggle = (goalId: string) => {
    formData.setValue(
      "goals",
      selected.includes(goalId)
        ? selected.filter((goal) => goal !== goalId)
        : [...selected, goalId],
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {BUSINESS_GOALS.map((goal) => {
          const isActive = selected.includes(goal.id);

          return (
            <button
              key={goal.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => handleGoalToggle(goal.id)}
              className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2 text-left transition-colors ${
                isActive
                  ? "border-ru-blue-200 bg-accent dark:border-primary/40"
                  : "border-border bg-card hover:border-input"
              }`}
            >
              <span
                className={`mt-px flex size-4.5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors ${
                  isActive ? "border-primary bg-primary" : "border-input bg-card"
                }`}
              >
                <IconCheck
                  className={`size-3 text-primary-foreground ${isActive ? "" : "opacity-0"}`}
                  stroke={3}
                />
              </span>
              <span className="flex min-w-0 flex-col gap-0.75">
                <span className="font-heading text-[14px] font-bold tracking-[-0.015em] text-foreground">
                  {translations(goal.label)}
                </span>
                <span className="text-[12.5px] leading-snug text-muted-foreground">
                  {translations(goal.description)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex items-center gap-3">
        <Button
          variant="outline"
          onClick={handleBack}
          className="h-10 cursor-pointer gap-2 rounded-lg px-4 text-[13.5px] font-semibold"
        >
          <IconArrowLeft className="size-4" />
          {translations("Back")}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="h-10 flex-1 cursor-pointer gap-2 rounded-lg text-sm font-semibold disabled:cursor-not-allowed"
        >
          {isLoading && <Loader className="size-4 border-white/35" />}
          {isLoading ? translations("Building your flows…") : translations("Finish setup")}
          {!isLoading && <IconArrowRight className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
