import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Stack } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowRight } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { CheckCircle2, CircleX } from "lucide-react";
import { useTimeZone } from "next-intl";

import { useCheckSession } from "@/hooks/checkSession";
import {
  useRateupPaymentsPlans,
  useSendMailPlanSelectDetails,
} from "@/backend/payment/payment.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import { data } from "@/components/GenerateQr/tempdata";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { currencyLabel } from "@/components/menu/util/currencyData";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import { BookDemoModal } from "@/components/RateupHomePage/helpers/BookDemoModal";

import PlanCardNew from "./Card/PlanCardNew";
import { useRouteAndCartStore } from "./store/RouteAndCartStore";

const PricingSection = ({ onPlanSelect = null }) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const router = useRouter();
  const sharedStyles =
    "bg-white border border-gray-200 rounded-2xl shadow-lg p-8 flex flex-col justify-between transition-all hover:shadow-2xl hover:scale-[1.03] duration-300";
  const { data: plans, isLoading } = useRateupPaymentsPlans();
  const userTimeZone = useTimeZone();
  let currencySymbol = userTimeZone === "Asia/Calcutta" ? "₹" : "$";
  const currency = userTimeZone === "Asia/Calcutta" ? "INR" : "USD";
  const rateupPlans = plans
    ? plans.filter(
        (plan) =>
          plan.name === "FREE PLAN" ||
          (plan.paymentPlan && plan?.paymentPlan?.curreny === currency),
      )
    : [];
  function handlePlanSelection(plan) {
    if (onPlanSelect) onPlanSelect();
    if (plan.name === "FREE PLAN") {
      router.push("/signup");
      return;
    }
    setSelectedPlan(plan);
    open();
  }
  if (isLoading) return <RateupLoader />;
  return (
    <section className="relative bg-gray-100 py-12 px-6 md:px-12 text-gray-800">
      <div className="text-center mb-16">
        <h4 className="text-[#1c518e] text-sm uppercase font-medium tracking-wider">
          Our Pricing Plans
        </h4>
        <h2 className="text-4xl md:text-5xl font-bold text-[#00397b] mt-3">
          Choose What You Need
        </h2>
      </div>

      <motion.div
        className="grid gap-8 sm:grid-cols-1 lg:grid-cols-4 md:grid-cols-2 max-w-8xl mx-auto mt-12"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {rateupPlans.map((plan) => (
          <PlanCardNew
            key={plan.id}
            plan={plan}
            onButtonClick={() => handlePlanSelection(plan)}
            currencySymbol={currencySymbol}
          />
        ))}
        <div className={sharedStyles}>
          <div>
            <h3 className="text-2xl font-semibold text-[#00397b] mb-2">
              Enterprise
            </h3>
            <p className="text-5xl font-bold text-[#1c518e]">Custom</p>
            <p className="text-gray-600 mt-3 mb-6 text-sm">
              Customized Plan & Pricing
            </p>
            <div className="text-xl text-center text-gray-700 mt-6 mb-4">
              Let&apos;s Talk!
            </div>
          </div>
          <BookDemoModal />
        </div>
      </motion.div>
      <MailForm
        opened={opened}
        close={close}
        plan={selectedPlan}
        currencySymbol={currencySymbol}
      />
    </section>
  );
};

const MailForm = ({ opened, close, plan, currencySymbol }) => {
  const sendMail = useSendMailPlanSelectDetails();
  const { updateRouteAndCart } = useRouteAndCartStore();
  const session = useCheckSession();
  const router = useRouter();
  const form = useForm({
    initialValues: {
      name: "",
      email: "",
      orgName: "",
    },
    validate: {
      name: isNotEmpty("Name is required"),
      email: isNotEmpty("Email is required"),
      orgName: isNotEmpty("Organization name is required"),
    },
  });

  function handleSubmit() {
    if (form.validate().hasErrors) return;
    const data = {
      ...form.values,
      planName: plan?.displayName,
      planId: plan?.id,
    };
    sendMail.mutate(data, {
      onSettled: () => {
        let route = "/dashboard/settings?tab=account";
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
        if (!session) {
          localStorage.setItem("newUserFromPricingPage", JSON.stringify(data));
          localStorage.setItem(
            "subscriptionRoutAndCart",
            JSON.stringify({
              route,
              cartData,
            }),
          );
        }
        updateRouteAndCart(route, cartData);
        close();
        router.push(route);
      },
    });
  }
  function onClose() {
    form.reset();
    close();
  }
  return (
    <FormModalLayout
      zIndex={1001}
      title="About You"
      centered
      opened={opened}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Stack>
        <ContainedTextField
          label={"Name"}
          {...form.getInputProps("name")}
          withAsterisk
        />
        <ContainedTextField
          label={"Email"}
          {...form.getInputProps("email")}
          withAsterisk
        />
        <ContainedTextField
          label={"Organization Name"}
          {...form.getInputProps("orgName")}
          withAsterisk
        />
        <RateupButtonBlue
          title="Next"
          loading={sendMail.isPending}
          rightIcon={<IconArrowRight size={16} />}
          type={"submit"}
          radius={"md"}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default PricingSection;
