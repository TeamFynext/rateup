"use client";

import React from "react";

import { useCheckSession } from "@/hooks/checkSession";
import OnboardingWizard from "@/components/Form/completeSIgnup/OnboardingWizard";

function page() {
  useCheckSession();
  return <OnboardingWizard />;
}

export default page;
