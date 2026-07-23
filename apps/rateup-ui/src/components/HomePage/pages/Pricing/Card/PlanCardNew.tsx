import { CheckCircle2, Flame } from "lucide-react";

import { currencyLabel } from "@/components/menu/util/currencyData.ts";
import { Spoiler } from "@/components/ui/spoiler.tsx";
import { cn } from "@/lib/utils.ts";

type BillingPeriod = "monthly" | "yearly";

const PlanCardNew = ({
  plan,
  period = "monthly",
  fallbackSymbol = "$",
  onButtonClick,
}: {
  plan: any;
  period?: BillingPeriod;
  fallbackSymbol?: string;
  onButtonClick: () => void;
}) => {
  const isPopular = Boolean(plan?.badge);
  const isFree = plan?.name === "FREE PLAN";
  const isAnnual = period === "yearly";

  const currencySymbol =
    currencyLabel.find(
      (c) =>
        c.label ===
        (plan?.currency ??
          plan?.yearlyPaymentPlan?.currency ??
          plan?.monthlyPaymentPlan?.currency ??
          plan?.paymentPlan?.currency),
    )?.symbol ?? fallbackSymbol;

  const monthlyPrice = plan?.monthlyPrice ?? plan?.price ?? 0;
  const yearlyPrice = plan?.yearlyPrice ?? plan?.price ?? 0;
  const displayPrice = isAnnual ? yearlyPrice : monthlyPrice;

  const showAnnualNote = isAnnual && !isFree && plan?.yearlyPrice != null;
  const annualTotal = (plan?.yearlyPrice ?? 0) * 12;

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl bg-white transition-all duration-300 hover:shadow-2xl",
        isPopular
          ? "border-2 border-[#1C518E] shadow-[0_12px_48px_rgba(11,31,72,0.12)] lg:-translate-y-2"
          : "border border-[#ECECEA] shadow-[0_1px_2px_rgba(11,31,72,0.06),0_2px_6px_rgba(11,31,72,0.05)]",
      )}
    >
      {isPopular && (
        <div className="flex items-center justify-center gap-2 bg-[#081C3F] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white">
          <Flame className="h-4 w-4 text-[#FFD54C]" />
          {plan.badge}
        </div>
      )}

      <div className="flex flex-1 flex-col p-8">
        <div className="mb-1 flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-[#1C518E]">{plan.displayName}</h3>
          {plan?.tagline && (
            <span className="text-sm font-semibold text-gray-500">{plan.tagline}</span>
          )}
        </div>

        <div className="my-4 flex min-h-[76px] flex-col justify-center border-y border-[#ECECEA] py-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[44px] font-extrabold leading-none text-[#0A0B0A]">
              {currencySymbol}
              {displayPrice}
            </span>
            <span className="text-[15px] font-semibold text-gray-500">/ month</span>
          </div>
          {showAnnualNote && (
            <p className="mt-1 text-[13px] font-semibold text-[#16A34A]">
              Billed {currencySymbol}
              {annualTotal}/year — 2 months free
            </p>
          )}
          {isFree && <p className="mt-1 text-[13px] text-gray-500">Forever free</p>}
        </div>

        <Spoiler
          maxHeight={310}
          className="pb-2.5"
          controlClassName="text-sm text-[#1C518E]"
          showLabel={"Show all available features"}
          hideLabel={"See less"}
        >
          <div className="flex flex-col gap-3.5">
            {plan?.description?.map((item: string, index: number) => (
              <div key={index} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#16A34A]" />
                <span className="text-sm leading-snug text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </Spoiler>

        <div className="mt-auto flex flex-col gap-4 pt-6">
          <p className="text-[13px] font-semibold text-[#1C518E]">
            {isFree
              ? "*No credit card needed"
              : plan?.trialDays
                ? `${plan.trialDays} Days Free Trial`
                : ""}
          </p>
          <button
            onClick={onButtonClick}
            className={cn(
              "w-full rounded-lg px-5 py-3.5 text-[15px] font-bold transition",
              isPopular
                ? "bg-[#1C518E] text-white hover:bg-[#163f6e]"
                : "border-[1.5px] border-[#1C518E] bg-transparent text-[#1C518E] hover:bg-[#1C518E] hover:text-white",
            )}
          >
            {isFree
              ? "Get Started"
              : plan?.trialDays
                ? `Start ${plan.trialDays} Day Free Trial`
                : "Subscribe Now"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanCardNew;
