"use client";

import { useParams } from "next/navigation";

import WhatsappAutomationRuleBuilder from "../components/WhatsappAutomationRuleBuilder";

const Page = () => {
  const params = useParams();
  const ruleId = params.ruleId as string;

  return <WhatsappAutomationRuleBuilder ruleId={ruleId} />;
};

export default Page;
