import { Suspense } from "react";

import { getAllRateupPaymentPlans } from "@/backend/payment/payment.api";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";

import Pricing from "./Pricing.tsx";

export default function PricingData() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <Price />
    </Suspense>
  );
}
async function Price() {
  const plans = await getAllRateupPaymentPlans();
  if (plans?.error) {
    return (
      <div className="flex flex-col items-center justify-center h-15 px-42">
        <h1>API Failed</h1>
        <p>{plans.error}</p>
      </div>
    );
  }
  return <Pricing plans={plans} />;
}
