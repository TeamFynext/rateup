import PlanCard from "../Card/PlanCard.tsx";
import { PlanCardWidth } from "../Utils/constants.ts";

export const WhatsAppSection = ({ largeScreen, handlePlanSelection, freePlan, currencySymbol }) => {
  const whatsAppPlan = [] // plans, removing for now
    ?.filter((item) => item?.name?.includes("WhatsApp"))
    ?.sort((a, b) => a?.paymentPlan?.amount - b?.paymentPlan?.amount);

  whatsAppPlan?.push({
    displayName: "Business",
    paymentPlan: {
      amount: "Lets Talk!",
      currency: "",
      period: "",
    },
  });

  if (freePlan?.length > 0) {
    freePlan[0].paymentPlan = {
      amount: 0,
      currency: "",
      period: whatsAppPlan?.[0]?.paymentPlan?.period === "yearly" ? "yearly" : "monthly",
    };
  }

  const whatsAppPlans = [...freePlan, ...whatsAppPlan];

  return (
    <div className="my-6 flex flex-col gap-4">
      <div className="flex flex-wrap justify-center gap-8">
        {whatsAppPlans?.map((data, index) => {
          let isPopular = false;
          isPopular = data?.displayName && data?.displayName.toLowerCase().includes("plus");

          return (
            <div className="relative flex flex-col items-center" key={data?.id}>
              <div
                className="px-8 py-2.5 text-center text-white"
                style={{
                  backgroundColor: "#1C518E",
                  borderRadius: "15px 15px 0 0",
                  zIndex: 2,
                  width: PlanCardWidth,
                  display: isPopular ? "block" : "none",
                }}
              >
                <p className="-mt-1 pb-2 text-sm"> Most Popular </p>
              </div>
              <PlanCard
                currencySymbol={currencySymbol}
                data={data}
                handlePlanSelection={handlePlanSelection}
                index={index}
                totalItems={whatsAppPlans.length}
                largeScreen={largeScreen}
                key={data.id}
                isPopular={isPopular}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
