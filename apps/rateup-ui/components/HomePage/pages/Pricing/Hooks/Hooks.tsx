import { useState, useEffect } from "react";
import { DISCOUNT_PERCENTAGE } from "../Utils/constants";

export const usePriceUpdater = (
  initialPrices,
  getPriceBasedOnLocation,
  checked,
) => {
  const {
    essentials: initialEssentials,
    plus: initialPlus,
    currency: initialCurrency,
    menu: initialMenu,
    surveyAddon: initialSurveyAddon,
  } = initialPrices;

  const [price, setPrice] = useState({
    essentials: initialEssentials,
    plus: initialPlus,
    currency: initialCurrency,
    menu: initialMenu,
    surveyAddon: initialSurveyAddon,
  });

  const updatePriceBasedOnLocation = (checkedState) => {
    const { essentials, plus, currency, menu, surveyAddon } =
      getPriceBasedOnLocation();

    if (checkedState) {
      return {
        essentials: calculateDiscountedAnnualAmount(essentials),
        plus: calculateDiscountedAnnualAmount(plus),
        menu: calculateDiscountedAnnualAmount(menu),
        surveyAddon: calculateDiscountedAnnualAmount(surveyAddon),
        currency,
      };
    } else {
      return { essentials, plus, currency, menu, surveyAddon };
    }
  };

  useEffect(() => {
    setPrice((prevPrice) => updatePriceBasedOnLocation(checked));
  }, [checked]);

  const calculateDiscountedAnnualAmount = (monthlyCost: number) => {
    const annualCost = monthlyCost * 12;
    const discountedAmount =
      annualCost - annualCost * (DISCOUNT_PERCENTAGE / 100);
    return discountedAmount;
  };

  return price;
};
