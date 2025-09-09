import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Badge, Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { IconArrowRight } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useTimeZone } from "next-intl";

import { useCheckSession } from "@/hooks/checkSession";
import {
  useRateupPaymentsPlans,
  useSendMailPlanSelectDetails,
} from "@/backend/payment/payment.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { currencyLabel } from "@/components/menu/util/currencyData";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import { BookDemoModal } from "@/components/RateupHomePage/helpers/BookDemoModal";

import PlanCardNew from "./Card/PlanCardNew";
import { useRouteAndCartStore } from "./store/RouteAndCartStore";

const PricingSection = ({ onPlanSelect = null }) => {
  const [period, setPeriod] = useState("yearly");
  const router = useRouter();
  const { data: plans, isLoading } = useRateupPaymentsPlans();
  const userTimeZone = useTimeZone();
  let currencySymbol = userTimeZone === "Asia/Calcutta" ? "₹" : "$";
  const currency = userTimeZone === "Asia/Calcutta" ? "INR" : "USD";
  const rateupPlans = useMemo(
    () =>
      plans
        ? plans.filter(
            (plan) =>
              plan.name === "FREE PLAN" ||
              (plan.paymentPlan &&
                plan?.paymentPlan?.currency === currency &&
                plan.paymentPlan.period === period),
          )
        : [],
    [plans, currency, period],
  );
  const { updateRouteAndCart } = useRouteAndCartStore();
  const sendMail = useSendMailPlanSelectDetails();
  const session = useCheckSession();

  function handlePlanSelection(plan) {
    if (onPlanSelect) onPlanSelect();
    if (plan.name === "FREE PLAN") {
      router.push("/signup");
      return;
    }

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

    router.push(route);
  }
  const periods = [
    { label: "Monthly", value: "monthly" },
    {
      label: (
        <Group gap={"xs"} p={0} w={140}>
          <Text>Yearly</Text>
          <Badge
            color={period === "yearly" ? "white" : "#00397b"}
            c={period === "yearly" ? "#00397b" : "white"}
          >
            Save 20%
          </Badge>
        </Group>
      ),
      value: "yearly",
    },
  ];
  if (isLoading) return <RateupLoader />;
  return (
    <section className="relative flex flex-col justify-center gap-6 items-center bg-gray-100 py-12 px-6 md:px-12 text-gray-800">
      <div className="text-center">
        <h4 className="text-[#1c518e] text-sm uppercase font-medium tracking-wider">
          Our Pricing Plans
        </h4>
        <h2 className="text-4xl md:text-5xl font-bold text-[#00397b] mt-3">
          Choose What You Need
        </h2>
      </div>
      <Stack justify={"center"} align="center" gap={0}>
        <Image
          src={"/images/subscriptionArrow.png"}
          height={32}
          width={67}
          alt="image of arrow"
        />
        <SegmentedControl
          transitionDuration={500}
          transitionTimingFunction="linear"
          size="lg"
          color={"#00397b"}
          bg="#cce1ee"
          data={periods}
          value={period}
          onChange={setPeriod}
        />
      </Stack>

      <motion.div
        className="grid gap-8 sm:grid-cols-1 lg:grid-cols-3 md:grid-cols-2 items-start max-w-5xl mx-auto"
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

        <div className="text-lg font-medium text-gray-700 mb-4">
          Let&apos;s Talk!
        </div>

        <BookDemoModal />
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
