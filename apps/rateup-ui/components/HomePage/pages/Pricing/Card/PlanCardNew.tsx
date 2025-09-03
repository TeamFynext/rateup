import React from "react";

import { CheckCircle2 } from "lucide-react";

import { currencyLabel } from "@/components/menu/util/currencyData";

const PlanCardNew = ({ plan, currencySymbol, onButtonClick }) => {
  function getCurrenySymbol(label) {
    const currency = currencyLabel.find((c) => c.label === label);
    return currency ? currency.symbol : null;
  }

  const sharedStyles =
    "bg-white border border-gray-200 rounded-2xl shadow-lg p-8 flex flex-col justify-between transition-all hover:shadow-2xl hover:scale-[1.03] duration-300";
  return (
    <div className={sharedStyles}>
      <div>
        <h3 className="text-2xl font-semibold text-[#00397b] mb-2">
          {plan.displayName}
        </h3>
        <p className="text-5xl font-bold text-[#1c518e]">
          {getCurrenySymbol(plan.paymentPlan?.currency) ?? currencySymbol}
          {plan?.paymentPlan?.amount ?? 0}
          <span className="text-base font-medium text-gray-500">
            /{plan.period ?? "month"}
          </span>
        </p>
        {plan.useCase && (
          <p className="text-gray-600 mt-3 mb-5 text-sm">{plan.useCase}</p>
        )}

        <ul className="space-y-3 text-gray-700 text-sm h-70 overflow-y-auto">
          {plan?.description?.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={onButtonClick}
        style={{ fontWeight: 500 }}
        className="mt-6 text-center bg-white text-[#1c518e] font-semibold py-2 rounded-md border border-[#1c518e] hover:bg-[#1c518e] hover:text-white transition"
      >
        {plan.name === "FREE PLAN"
          ? "Get Started"
          : plan?.trialDays
            ? `Start  ${plan?.trialDays} Days Free trial`
            : "Subscribe Now"}
      </button>
    </div>
  );
};

export default PlanCardNew;
