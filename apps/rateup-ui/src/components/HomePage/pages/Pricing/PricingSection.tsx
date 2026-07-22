import { Spoiler } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { useSendMailPlanSelectDetails } from "@/backend/payment/payment.query";
import { currencyLabel } from "@/components/menu/util/currencyData.ts";
import { BookDemoModal1 } from "@/components/RateupHomePage/helper/BookDemoModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useCheckSession } from "@/hooks/checkSession.tsx";

import PlanCardNew from "./Card/PlanCardNew.tsx";
import { useRouteAndCartStore } from "./store/RouteAndCartStore.ts";

type BillingPeriod = "monthly" | "yearly";

const PricingSection = ({ onPlanSelect = null, plans }) => {
  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  const navigate = useNavigate();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currencySymbol = timeZone === "Asia/Calcutta" ? "₹" : "$";
  const currency = timeZone === "Asia/Calcutta" ? "INR" : "USD";

  const isMiddleEast = ["Asia/Dubai", "Asia/Qatar", "Asia/Riyadh", "Asia/Muscat"].includes(
    timeZone,
  );

  const isDev = import.meta.env.VITE_PRICING_DEV === "dev";

  const rateupPlans = useMemo(() => {
    if (!Array.isArray(plans)) return [];

    return plans.filter((plan) => {
      if (plan.name === "FREE PLAN") return false;

      // Dev: show every plan (even ones without a Razorpay link) so unlinked
      // test plans are visible while building the pricing UI.
      if (isDev) return true;

      const hasPaymentPlan = plan.monthlyPaymentPlan || plan.yearlyPaymentPlan;
      const currencyOk = !plan.currency || plan.currency === currency;
      if (!hasPaymentPlan || !currencyOk) return false;

      if (isMiddleEast) {
        const planName = plan?.displayName?.trim()?.toLowerCase();
        if (planName?.includes("starter")) return false;
      }
      return true;
    });
  }, [plans, currency, isMiddleEast, isDev]);

  const { updateRouteAndCart } = useRouteAndCartStore();
  const sendMail = useSendMailPlanSelectDetails();
  const session = useCheckSession();

  function handlePlanSelection(plan) {
    if (onPlanSelect) onPlanSelect();
    if (plan.name === "FREE PLAN") {
      navigate({ to: "/signup" });
      return;
    }

    const gatewayPlan =
      period === "yearly"
        ? (plan.yearlyPaymentPlan ?? plan.paymentPlan)
        : (plan.monthlyPaymentPlan ?? plan.paymentPlan);

    if (!gatewayPlan) return;

    const route = "/dashboard/settings/billing";
    const cartData = {
      id: plan.id,
      amount: gatewayPlan.amount,
      currency: gatewayPlan.currency,
      currencySymbol:
        currencyLabel.find((c) => c.label === gatewayPlan.currency)?.symbol ?? currencySymbol,
      description: plan.description,
      period: gatewayPlan.period ?? period,
      planId: gatewayPlan.planId,
      name: plan?.displayName,
      gateway: "RAZORPAY",
      priceId: "",
    };
    updateRouteAndCart(route, cartData);

    localStorage.setItem(
      "subscriptionRoutAndCart",
      JSON.stringify({
        route,
        cartData,
      }),
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

  return (
    <section className="relative flex flex-col items-center justify-center gap-6 bg-[#FAFAF7] px-6 py-20 text-gray-800 md:px-12">
      <div className="max-w-xl text-center">
        <h4 className="text-sm font-bold uppercase tracking-[0.08em] text-[#1C518E]">Pricing</h4>
        <h1 className="mt-3 text-4xl font-bold text-[#0A0B0A] md:text-5xl">Choose What You Need</h1>
        <p className="mt-3 text-gray-600">
          No apps. No forms. Just results — pick the plan that fits your team.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center">
        <Image src={"/images/subscriptionArrow.png"} height={32} width={67} alt="image of arrow" />
        <Tabs value={period} onValueChange={(next) => setPeriod(next as BillingPeriod)}>
          <TabsList className="min-h-12 gap-1 rounded-full border border-[#ECECEA] bg-white p-1 shadow-sm">
            <TabsTrigger
              value="monthly"
              className="rounded-full px-6 py-2.5 font-bold text-gray-500 data-active:bg-primary data-active:text-white"
            >
              Monthly
            </TabsTrigger>
            <TabsTrigger
              value="yearly"
              className="gap-2 rounded-full px-6 py-2.5 font-bold text-gray-500 data-active:bg-primary data-active:text-white"
            >
              <span>Annual</span>
              <span className="rounded-full bg-[linear-gradient(135deg,#FFD54C_0%,#F8951D_100%)] px-2 py-[3px] text-[11px] font-extrabold leading-none text-[#081C3F]">
                2 months free
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <motion.div
        className="mx-auto grid max-w-5xl items-start gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {rateupPlans.map((plan) => (
          <PlanCardNew
            key={plan.id}
            plan={plan}
            period={period}
            fallbackSymbol={currencySymbol}
            onButtonClick={() => handlePlanSelection(plan)}
          />
        ))}

        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#ECECEA] bg-white shadow-[0_1px_2px_rgba(11,31,72,0.06),0_2px_6px_rgba(11,31,72,0.05)] transition-all duration-300 hover:shadow-2xl">
          <div className="flex flex-1 flex-col p-8">
            <div className="text-center">
              <h3 className="mb-1 text-2xl font-bold text-[#1C518E]">
                Enterprise
                <span className="mt-1 block text-sm font-medium text-gray-500">
                  (Everything in Pro+)
                </span>
              </h3>

              <div className="my-4 flex min-h-[76px] flex-col justify-center border-y border-[#ECECEA] py-4">
                <span className="text-[32px] font-extrabold text-[#0A0B0A]">Custom</span>
                <p className="mt-1 text-[13px] text-gray-500">
                  Tailored to your volume &amp; needs
                </p>
              </div>
            </div>

            <Spoiler
              maxHeight={310}
              pb={"xs"}
              styles={{ control: { fontSize: "14px", color: "#1C518E" } }}
              showLabel={"Show all available features"}
              hideLabel={"See less"}
            >
              <div className="flex flex-col gap-3.5">
                {[
                  "Unlimited Teams & Users",
                  "Unlimited Conversations",
                  "Everything in Pro, plus:",
                  "Unlimited Web Surveys & Responses",
                  "Custom Integrations & SLA",
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#16A34A]" />
                    <span className="text-sm leading-snug text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </Spoiler>

            <div className="mt-auto flex flex-col gap-4 pt-6 text-center">
              <p className="text-[13px] font-semibold text-[#1C518E]">
                Custom onboarding &amp; SLA
              </p>
              <div className="flex justify-center">
                <BookDemoModal1 />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      {/* <MailForm
        opened={opened}
        close={close}
        plan={selectedPlan}
        currencySymbol={currencySymbol}
      /> */}
    </section>
  );
};

export default PricingSection;
