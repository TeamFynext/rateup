import React from "react";

import AIAutomationHeader from "@/components/products/AiAutomation/helpers/AIAutomationHeader";
import AutomationCta from "@/components/products/AiAutomation/helpers/AutomationCta";
import AutomationFooter from "@/components/products/AiAutomation/helpers/AutomationFooter";
import AutomationSteps from "@/components/products/AiAutomation/helpers/AutomationSteps";
import WhyAutomation from "@/components/products/AiAutomation/helpers/WhyAutomation";
import AiFeaturesSection from "@/components/products/AiAutomation/shared/AiFeaturesSection";
import AiHeroPage from "@/components/products/AiAutomation/shared/AiHeroPage";
import AutomationBenefitsSection from "@/components/products/AiAutomation/shared/AutomationBenefitsSection";
import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection";

function page() {
  return (
    <div className="min-h-screen flex flex-col">
      <AIAutomationHeader />
      <main className="flex-grow">
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

export default page;
