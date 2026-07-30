import PlanCard from "../Card/PlanCard.tsx";
import type { Cart } from "../store/RouteAndCartStore.ts";
import type { PricingPlan } from "../types.ts";
import { PlanCardWidth } from "../Utils/constants.ts";

export const SurveySection = ({
  largeScreen,
  handlePlanSelection,
  freePlan,
  currencySymbol,
}: {
  largeScreen: boolean;
  handlePlanSelection: (cart: Cart) => void;
  freePlan: PricingPlan[];
  currencySymbol: string;
}) => {
  const surveyPlan = [] // plans, removing for now
    ?.filter((item) => {
      const name = item?.name;
      return (
        name && !name.includes("Menu") && !name.includes("WhatsApp") && !name.includes("Custom")
      );
    })
    ?.sort((a, b) => a?.paymentPlan?.amount - b?.paymentPlan?.amount);

  surveyPlan?.push({
    displayName: "Enterprise",
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
      period: surveyPlan?.[0]?.paymentPlan?.period === "yearly" ? "yearly" : "monthly",
    };
  }
  const surveyPlans = [...freePlan, ...surveyPlan];

  return (
    <div className="my-6 flex flex-wrap justify-center gap-8">
      {surveyPlans?.map((data, index) => {
        let isPopular = false;
        isPopular = data?.displayName && data?.displayName.toLowerCase().includes("team");

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
              totalItems={surveyPlans?.length}
              largeScreen={largeScreen}
              isPopular={isPopular}
            />
          </div>
        );
      })}
    </div>
  );
};
