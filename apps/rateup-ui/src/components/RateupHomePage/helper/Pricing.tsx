"use client";

import { useMemo, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { useCheckSession } from "@/hooks/checkSession.tsx";
import { useSendMailPlanSelectDetails } from "@/backend/payment/payment.query";
import { useRouteAndCartStore } from "@/components/HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import { currencyLabel } from "@/components/menu/util/currencyData.ts";
import { BookDemoModal1 } from "@/components/RateupHomePage/helper/BookDemoModal.tsx";

// ─── Check Icon ───────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    className="shrink-0 mt-0.5"
  >
    <circle cx="10" cy="10" r="10" fill="#004F98" fillOpacity="0.3" />
    <circle cx="10" cy="10" r="7" fill="#2D74E0" fillOpacity="0.15" />
    <path
      d="M6.5 10L8.8 12.5L13.5 7.5"
      stroke="#66D7FF"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ─── Helper: parse a single description string ────────────────────────────────
// Strips anything after "||" (e.g. "Nice plan||Discount!!" → "Nice plan")
function parseFeature(raw: string): string {
  return raw.split("||")[0].trim();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function Pricing({ onPlanSelect = null, plans }) {
  const [period, setPeriod] = useState("yearly");
  const navigate = useNavigate();
  const { updateRouteAndCart } = useRouteAndCartStore();
  const sendMail = useSendMailPlanSelectDetails();
  const session = useCheckSession();

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currencySymbol = timeZone === "Asia/Calcutta" ? "₹" : "$";
  const currency = timeZone === "Asia/Calcutta" ? "INR" : "USD";
  const isMiddleEast = [
    "Asia/Dubai",
    "Asia/Qatar",
    "Asia/Riyadh",
    "Asia/Muscat",
  ].includes(timeZone);

  const rateupPlans = useMemo(
    () =>
      plans
        ? plans
            .filter(
              (plan) =>
                plan.name === "FREE PLAN" ||
                (plan.paymentPlan &&
                  plan?.paymentPlan?.currency === currency &&
                  plan.paymentPlan.period === period),
            )
            .filter((plan) => {
              if (!isMiddleEast) return true;
              return !plan?.displayName
                ?.trim()
                ?.toLowerCase()
                .includes("starter");
            })
        : [],
    [plans, currency, period, isMiddleEast],
  );

  function handlePlanSelection(plan) {
    if (onPlanSelect) onPlanSelect();
    if (plan.name === "FREE PLAN") {
      navigate({
        to: "/signup",
      });
      return;
    }

    const route = "/dashboard/settings/billing";
    const cartData = {
      id: plan.id,
      amount: plan.paymentPlan.amount,
      currency: plan.paymentPlan.currency,
      currencySymbol:
        currencyLabel.find((c) => c.label === plan.paymentPlan.currency)
          ?.symbol ?? currencySymbol,
      description: plan.description,
      period: plan?.paymentPlan?.period,
      planId: plan?.paymentPlan?.planId,
      name: plan?.displayName,
      gateway: "RAZORPAY",
      priceId: "",
    };

    updateRouteAndCart(route, cartData);
    localStorage.setItem(
      "subscriptionRoutAndCart",
      JSON.stringify({ route, cartData }),
    );

    const userInfo = localStorage.getItem("userInfo");
    if (session && userInfo) {
      const data = JSON.parse(userInfo);
      sendMail.mutate({
        email: data.data.email,
        name: data.data.userName,
        orgName: data.data.orgName,
        planName: plan.name,
        planId: plan.id,
      });
    }

    navigate({
      to: route,
    });
  }

  const periods = [
    { label: "Monthly", value: "monthly" },
    {
      label: (
        <div className="flex items-center gap-2 w-[140px]">
          <span>Yearly</span>
          <span
            className={`text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border ${
              period === "yearly"
                ? "bg-white text-rateup-blue-5 border-white"
                : "bg-rateup-blue-5 text-white border-rateup-blue-5"
            }`}
          >
            Save 20%
          </span>
        </div>
      ),
      value: "yearly",
    },
  ];

  // Last plan in list = enterprise (no paymentPlan, not FREE PLAN)
  const isEnterprisePlan = (plan) =>
    !plan.paymentPlan && plan.name !== "FREE PLAN";

  // Middle card = popular highlight
  const isPopularPlan = (index: number) =>
    rateupPlans.length === 3 ? index === 1 : false;

  return (
    <section
      className="bg-rateup-dark-blue-3 relative overflow-hidden pb-5 pt-2"
      id="pricing"
    >
      {/* Ambient glow behind middle card */}
      <div className="pointer-events-none absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[360px] h-[700px] rounded-full bg-[#004F98] opacity-25 blur-[100px] z-0" />

      <div className="xl:max-w-6xl xl:mx-auto xl:w-[calc(100%-4rem)] px-8 xl:px-0 relative z-10 mb-16">
        {/* Heading */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-[44px] font-bold text-white tracking-tight mb-3">
            Pricing Comparison
          </h2>
          <p className="text-[#C4D7F5] text-base md:text-[17px]">
            Get more value with RateUp&apos;s transparent and competitive
            pricing
          </p>
        </div>

        {/* Monthly / Yearly toggle */}
        <div className="flex flex-col items-center gap-2 mb-12">
          <div className="flex items-center p-1 rounded-xl border border-[#2D74E0]/30 bg-[#050f24]">
            {periods.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={`
        flex items-center justify-center px-5 py-2 rounded-lg text-sm font-medium
        transition-all duration-500 ease-linear cursor-pointer
        ${
          period === p.value
            ? "bg-rateup-blue-5 text-white shadow-sm"
            : "bg-transparent text-[#93C6F5] hover:text-white"
        }
      `}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {rateupPlans.map((plan, index) => {
            const isPopular = isPopularPlan(index);
            const isEnterprise = isEnterprisePlan(plan);

            // ── Price display ──────────────────────────────────────────────
            const displayPrice = isEnterprise
              ? "Custom"
              : plan.name === "FREE PLAN"
                ? "Free"
                : `${currencySymbol}${plan.paymentPlan.amount.toLocaleString()}`;

            const priceSuffix =
              !isEnterprise && plan.name !== "FREE PLAN"
                ? period === "monthly"
                  ? "/mo"
                  : "/yr"
                : undefined;

            // ── Features: from plan.description array, strip "||..." tags ──
            const featureList: string[] = Array.isArray(plan.description)
              ? plan.description.map(parseFeature)
              : [];

            // ── Badge: straight from API displayName ───────────────────────
            const badgeLabel =
              plan.displayName?.toUpperCase() ?? plan.name?.toUpperCase();

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-[24px] overflow-hidden transition-all duration-300
                  ${
                    isPopular
                      ? "bg-[#000A1F] border border-[#2D74E0] shadow-[0_0_0_1px_#2D74E0,0_0_80px_-10px_#004F98]"
                      : "bg-[#000A1F]/80 border border-[#2D74E0]/20 hover:border-[#2D74E0]/50"
                  }`}
              >
                {/* Badge */}
                <div className="pt-8 px-8 pb-0 flex justify-center">
                  <span
                    className={`text-[11px] font-bold tracking-[0.12em] uppercase px-4 py-1.5 rounded-full border
                      ${
                        isPopular
                          ? "bg-rateup-blue-5 text-white border-[#2D74E0]"
                          : "bg-transparent text-[#93C6F5] border-[#2D74E0]/40"
                      }`}
                  >
                    {badgeLabel}
                  </span>
                </div>

                {/* Price */}
                <div className="px-8 pt-5 pb-6">
                  {priceSuffix ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl md:text-6xl font-bold text-white">
                        {displayPrice}
                      </span>
                      <span className="text-[#93C6F5] text-base font-medium">
                        {priceSuffix}
                      </span>
                    </div>
                  ) : (
                    <div className="text-5xl md:text-6xl font-bold text-white">
                      {displayPrice}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="mx-8 h-px bg-rateup-blue-5/20 mb-6" />

                {/* Features */}
                <ul className="px-8 flex-1 space-y-3.5 mb-8">
                  {featureList.length > 0 ? (
                    featureList.map((f, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckIcon />
                        <span className="text-[#E2E5ED] text-sm leading-snug">
                          {f}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[#93C6F5] text-sm italic">
                      Contact us for full feature details
                    </li>
                  )}
                </ul>

                {/* CTA */}
                <div className="px-8 pb-8 mt-auto">
                  {isEnterprise ? (
                    <div className="w-full [&>button]:w-full [&>button]:rounded-xl [&>button]:py-3.5 [&>button]:border [&>button]:border-white/25 [&>button]:text-white [&>button]:text-sm [&>button]:font-medium [&>button]:hover:bg-white/5 [&>button]:transition-colors">
                      <BookDemoModal1 />
                    </div>
                  ) : isPopular ? (
                    <button
                      onClick={() => handlePlanSelection(plan)}
                      className="w-full flex items-center justify-center gap-2 bg-rateup-blue-5 hover:bg-[#0045CC] text-white font-medium text-sm rounded-xl py-3.5 transition-colors group"
                    >
                      Get Started
                      <div className="bg-[#001747] rounded-md w-6 h-6 flex items-center justify-center group-hover:bg-[#001747]/80 transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 text-white" />
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePlanSelection(plan)}
                      className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 text-white font-medium text-sm rounded-xl py-3.5 border border-white/25 transition-colors group"
                    >
                      {plan.name === "FREE PLAN"
                        ? "Get Started Free"
                        : "Get Started"}
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Pricing;
