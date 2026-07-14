import PlanCard from "../Card/PlanCard.tsx";
import { PlanCardWidth } from "../Utils/constants.ts";

export const CustomSection = ({ largeScreen, handlePlanSelection, plans, currencySymbol }) => {
  const customPlan = plans
    ?.filter((item) => item?.name?.includes("Custom"))
    ?.sort((a, b) => a?.paymentPlan?.amount - b?.paymentPlan?.amount);

  if (customPlan?.length >= 0) {
    customPlan?.push({
      displayName: "Business",
      paymentPlan: {
        amount: "Lets Talk!",
        currency: "",
        period: "",
      },
    });
  }

  const customPlans = [...customPlan];

  return (
    <div className="my-6 flex flex-col gap-4">
      <div className="flex flex-wrap justify-center gap-8">
        {customPlans?.map((data, index) => {
          return (
            <div className="relative flex flex-col items-center" key={data?.id}>
              <div
                className="px-8 py-2.5 text-center text-white"
                style={{
                  backgroundColor: "#1C518E",
                  borderRadius: "15px 15px 0 0",
                  zIndex: 2,
                  width: PlanCardWidth,
                  display: index === 5 ? "block" : "none",
                }}
              >
                <p className="-mt-1 pb-2 text-sm"> Most Popular </p>
              </div>
              <PlanCard
                currencySymbol={currencySymbol}
                data={data}
                handlePlanSelection={handlePlanSelection}
                index={index}
                totalItems={customPlans.length}
                largeScreen={largeScreen}
                key={data.id}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
