import { createFileRoute } from "@tanstack/react-router";
import React from "react";

import AIAutomationHeader from "@/components/products/AiAutomation/helpers/AIAutomationHeader.tsx";
import AutomationCta from "@/components/products/AiAutomation/helpers/AutomationCta.tsx";
import AutomationFooter from "@/components/products/AiAutomation/helpers/AutomationFooter.tsx";
import AutomationSteps from "@/components/products/AiAutomation/helpers/AutomationSteps.tsx";
import WhyAutomation from "@/components/products/AiAutomation/helpers/WhyAutomation.tsx";
import AiFeaturesSection from "@/components/products/AiAutomation/shared/AiFeaturesSection.tsx";
import AiHeroPage from "@/components/products/AiAutomation/shared/AiHeroPage.tsx";
import AutomationBenefitsSection from "@/components/products/AiAutomation/shared/AutomationBenefitsSection.tsx";
import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection.tsx";

export const Route = createFileRoute("/(marketing)/products/ai-automation/")({
  component: page,
});

function page() {
  return (
    <div className="min-h-screen flex flex-col">
      <AIAutomationHeader />
      <main className="grow">
        <AiHeroPage />
        <AiFeaturesSection />
        <AutomationSteps />
        <AutomationBenefitsSection />
        <WhyAutomation />
        <PricingSection />
        <AutomationCta />
      </main>
      <AutomationFooter />
    </div>
  );
}
