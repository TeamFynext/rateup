import { useNavigate } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { useSendMailPlanSelectDetails } from "@/backend/payment/payment.query";
import { currencyLabel } from "@/components/menu/util/currencyData.ts";
import { BookDemoModal1 } from "@/components/RateupHomePage/helper/BookDemoModal.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useCheckSession } from "@/hooks/checkSession.tsx";

import PlanCardNew from "./Card/PlanCardNew.tsx";
import { useRouteAndCartStore } from "./store/RouteAndCartStore.ts";

const PricingSection = ({ onPlanSelect = null, plans }) => {
  const [period, setPeriod] = useState("yearly");
  const navigate = useNavigate();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currencySymbol = timeZone === "Asia/Calcutta" ? "₹" : "$";
  const currency = timeZone === "Asia/Calcutta" ? "INR" : "USD";

  const isMiddleEast = ["Asia/Dubai", "Asia/Qatar", "Asia/Riyadh", "Asia/Muscat"].includes(
    timeZone,
  );

  const rateupPlans = useMemo(
    () =>
      Array.isArray(plans)
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

              const planName = plan?.displayName?.trim()?.toLowerCase();
              return !planName.includes("starter");
            })
        : [],
    [plans, currency, period, isMiddleEast],
  );
  const { updateRouteAndCart } = useRouteAndCartStore();
  const sendMail = useSendMailPlanSelectDetails();
  const session = useCheckSession();

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
        currencyLabel.find((c) => c.label === plan.paymentPlan.currency)?.symbol ?? currencySymbol,
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
    <section className="relative flex flex-col justify-center gap-6 items-center bg-gray-100 py-12 px-6 md:px-12 text-gray-800">
      <div className="text-center">
        <h4 className="text-[#1c518e] text-sm uppercase font-medium tracking-wider">
          Our Pricing Plans
        </h4>
        <h1 className="text-4xl md:text-5xl font-bold text-[#00397b] mt-3">Choose What You Need</h1>
      </div>
      <div className="flex flex-col items-center justify-center">
        <Image src={"/images/subscriptionArrow.png"} height={32} width={67} alt="image of arrow" />
        <Tabs value={period} onValueChange={(next) => setPeriod(next as string)}>
          <TabsList className="bg-primary/30 min-h-10">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">
              <span>Yearly</span>
              <Badge>Save 20%</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <motion.div
        className="grid gap-8 sm:grid-cols-1 lg:grid-cols-3 md:grid-cols-2 max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {rateupPlans.map((plan) => (
          <PlanCardNew key={plan.id} plan={plan} onButtonClick={() => handlePlanSelection(plan)} />
        ))}
      </motion.div>
      <div
        className="flex flex-col text-center  bg-white shadow-lg transition-all 
            rounded-2xl p-8 w-full max-w-md mx-auto hover:shadow-2xl hover:scale-[1.03] duration-300"
      >
        <h3 className="text-2xl font-bold text-[#00397b] mb-2">
          Enterprise
          <span className="block text-[#1c518e] text-sm font-medium mt-1">
            (Everything in Pro+)
          </span>
        </h3>

        <p className="text-5xl font-extrabold text-[#1c518e] mt-4">Custom</p>

        <p className="mt-3 text-gray-600 text-sm">Customized Plan & Pricing</p>
        <div className="w-12 h-1 bg-[#1c518e] self-center rounded-full my-6"></div>

        <div className="text-lg font-medium text-gray-700 mb-4">Let&apos;s Talk!</div>

        <BookDemoModal1 />
      </div>
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
