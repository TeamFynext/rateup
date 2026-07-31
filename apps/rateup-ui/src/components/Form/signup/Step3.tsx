// Extracted verbatim from `SignupFormNew.tsx`. Behaviour is unchanged.

import {
  IconArrowLeft,
  IconArrowRight,
  IconGlobe,
  IconInbox,
  IconMessage,
  IconTarget,
  IconUsers,
} from "@tabler/icons-react";

import { Button } from "../../ui/button.tsx";
import type { SignupForm } from "./shared.tsx";

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
  const values = formData.watch();

  const businessGoals = [
    {
      id: "whatsapp-api",
      label: "WhatsApp Business API",
      description: "Verified sender + templates",
      icon: IconMessage,
    },
    {
      id: "loyalty-program",
      label: "Loyalty on WhatsApp",
      description: "Points, tiers and rewards",
      icon: IconUsers,
    },
    {
      id: "whatsapp-campaigns",
      label: "WhatsApp Campaigns",
      description: "Broadcasts with 98% open rate",
      icon: IconTarget,
    },
    {
      id: "customer-feedback",
      label: "Customer Feedback",
      description: "NPS, CSAT, review drives",
      icon: IconMessage,
    },
    {
      id: "web-feedback-forms",
      label: "Web Feedback Forms",
      description: "Surveys without the tools",
      icon: IconGlobe,
    },
    {
      id: "unified-inbox",
      label: "Unified Inbox",
      description: "WhatsApp + Instagram in one place",
      icon: IconInbox,
    },
  ];

  const handleGoalToggle = (goalId: string) => {
    const currentGoals = values.goals || [];

    const newGoals = currentGoals.includes(goalId)
      ? currentGoals.filter((g: string) => g !== goalId)
      : [...currentGoals, goalId];

    formData.setValue("goals", newGoals);
  };

  return (
    <div className="w-full flex flex-col h-96">
      <div className="mb-2">
        <p className="text-xs text-gray-500">
          Select all that apply to personalize your experience
        </p>
      </div>

      {/* Goals List */}
      <div className="grid grid-cols-2 gap-3">
        {businessGoals.map((goal) => {
          const isActive = values.goals?.includes(goal.id);

          return (
            <button
              key={goal.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => handleGoalToggle(goal.id)}
              className={`relative w-full p-3 text-left rounded-xl border cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          ${isActive ? "border-primary bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}
            >
              {/* Top Right Circle */}
              <div
                className={`absolute top-2 right-2 w-4 h-4 rounded-full border
            ${isActive ? "bg-primary border-primary" : "border-gray-300"}`}
              />

              <div className="flex items-center gap-1">
                {/* Icon */}
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center
            ${isActive ? "bg-primary" : "bg-gray-100"}`}
                >
                  <goal.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-500"}`} />
                </div>

                {/* Title */}
                <p className={`text-xs font-medium max-w-30 ${isActive && "text-gray-900"}`}>
                  {goal.label}
                </p>
              </div>

              {/* Description */}
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">{goal.description}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-3 p-2 rounded-md bg-yellow-50 border border-yellow-200 text-[11px] text-yellow-700">
        💡 You can change these later in Settings — nothing is locked in.
      </div>
      {/* Footer */}
      <div className="flex justify-between gap-3 mt-2 pt-2">
        <Button
          variant="outline"
          onClick={handleBack}
          className="h-8 px-4 text-xs border border-gray-300"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="h-8 px-4 text-xs bg-primary text-white disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Continue"}
          <IconArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
