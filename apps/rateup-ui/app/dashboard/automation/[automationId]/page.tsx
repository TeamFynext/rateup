"use client";

import { useParams } from "next/navigation";

import WhatsappAutomationRuleBuilder from "../components/WhatsappAutomationRuleBuilder";

const Page = () => {
  const params = useParams();
  const automationId = params.automationId as string;

  return <WhatsappAutomationRuleBuilder ruleId={automationId} />;
};

export default Page;
