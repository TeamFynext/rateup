import React from "react";

import { Spoiler, Stack } from "@mantine/core";
import { IconFlame, IconFlameFilled } from "@tabler/icons-react";
import { CheckCircle2 } from "lucide-react";

import { currencyLabel } from "@/components/menu/util/currencyData";

const PlanCardNew = ({ plan, currencySymbol, onButtonClick }) => {
  function getCurrenySymbol(label) {
    const currency = currencyLabel.find((c) => c.label === label);
    return currency ? currency.symbol : null;
  }

  const sharedStyles =
    "relative bg-white border border-gray-200 rounded-2xl shadow-lg p-8 flex flex-col justify-between transition-all hover:shadow-2xl hover:scale-[1.03] duration-300";
  return (
    <div className={sharedStyles}>
      {plan?.displayName === "Pro" && (
        <div className="flex justify-center gap-2 absolute -top-6 left-0 w-full bg-[#1c518e] text-white text-center text-md font-semibold py-2 rounded-t-2xl">
          <IconFlame />
          <p> Most Popular </p>
        </div>
      )}
      <div>
        <h3 className="text-2xl font-bold text-[#00397b] mb-2">
          {plan.displayName}
          {plan.displayName === "Pro" && (
            <span className="text-[#1c518e] text-sm font-medium mt-6 ml-2">
              ( Everything in Basic+ )
            </span>
          )}
        </h3>

        {/* <p className="text-4xl font-bold text-[#1c518e]">
          {getCurrenySymbol(plan.paymentPlan?.currency) ?? currencySymbol}
          {plan?.paymentPlan?.amount
            ? plan.paymentPlan.period === "yearly"
              ? Math.floor(plan.paymentPlan.amount / 12)
              : plan.paymentPlan.amount
            : 0}
          <span className="text-base font-medium text-gray-500">/month</span>
        </p>
        {plan?.paymentPlan?.period === "yearly" && (
          <p className="text-sm font-medium text-[#1c518e]">
            *{getCurrenySymbol(plan.paymentPlan?.currency) ?? currencySymbol}{" "}
            {plan?.paymentPlan?.amount} Billed yearly
          </p>
        )} */}
        {plan.useCase && (
          <p className="text-gray-600 mt-3 mb-5 text-sm">{plan.useCase}</p>
        )}
        <Spoiler
          maxHeight={310}
          pb={"xs"}
          styles={{ control: { fontSize: "14px" } }}
          showLabel={"Show all available features"}
          hideLabel={"See less"}
        >
          <ul className="space-y-3 text-gray-700 text-sm mt-6">
            {plan?.description?.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Spoiler>
      </div>
      <Stack gap={1}>
        {plan.name === "FREE PLAN" && (
          <span className="text-sm font-medium text-[#1c518e] mt-5">
            *No credit card needed
          </span>
        )}
        <button
          onClick={onButtonClick}
          style={{
            fontWeight: 500,
            marginTop: plan.name === "FREE PLAN" ? "5px" : "14px",
          }}
          className="text-center bg-white text-[#1c518e] font-semibold py-2 rounded-md border border-[#1c518e] hover:bg-[#1c518e] hover:text-white transition"
        >
          {plan.name === "FREE PLAN"
            ? "Get Started"
            : plan?.trialDays
              ? `Start  ${plan?.trialDays} Days Free trial`
              : "Subscribe Now"}
        </button>
      </Stack>
    </div>
  );
};

export default PlanCardNew;
