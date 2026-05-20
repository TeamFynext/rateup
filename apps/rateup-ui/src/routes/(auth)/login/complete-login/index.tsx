"use client";

import React from "react";

import { createFileRoute } from "@tanstack/react-router";

import { useCheckSession } from "@/hooks/checkSession.tsx";
import OnboardingWizard from "@/components/Form/completeSIgnup/OnboardingWizard.tsx";

export const Route = createFileRoute("/(auth)/login/complete-login/")({
  component: page,
});

function page() {
  useCheckSession();
  return <OnboardingWizard />;
}
