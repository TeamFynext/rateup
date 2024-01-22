import { axiosClient } from "../apiClient";

const PRICING_URL = "/pricing";

interface PaymentData {
  paymentPlan: {
    amount: string;
    currency: string;
    period: string;
    name: string;
  };
}
export async function getPricing() {
  let data = [
    {
      paymentPlan: {
        amount: "399",
        currency: "₹",
        period: "monthly",
        name: "Rateup Essentials",
      },
    },
    {
      paymentPlan: {
        amount: "5",
        currency: "$",
        period: "monthly",
        name: "Rateup Essentials",
      },
    },
    {
      paymentPlan: {
        amount: "3999",
        currency: "₹",
        period: "yearly",
        name: "Rateup Essentials",
      },
    },
    {
      paymentPlan: {
        amount: "50",
        currency: "$",
        period: "yearly",
        name: "Rateup Essentials",
      },
    },

    {
      paymentPlan: {
        amount: "799",
        currency: "₹",
        period: "monthly",
        name: "Rateup Plus",
      },
    },
    {
      paymentPlan: {
        amount: "10",
        currency: "$",
        period: "monthly",
        name: "Rateup Plus",
      },
    },
    {
      paymentPlan: {
        amount: "7999",
        currency: "₹",
        period: "yearly",
        name: "Rateup Plus",
      },
    },
    {
      paymentPlan: {
        amount: "100",
        currency: "$",
        period: "yearly",
        name: "Rateup Plus",
      },
    },
    {
      paymentPlan: {
        amount: "399",
        currency: "₹",
        period: "monthly",
        name: "Rateup Digital Menu",
      },
    },
    {
      paymentPlan: {
        amount: "5",
        currency: "$",
        period: "monthly",
        name: "Rateup Digital Menu",
      },
    },
    {
      paymentPlan: {
        amount: "3999",
        currency: "₹",
        period: "yearly",
        name: "Rateup Digital Menu",
      },
    },
    {
      paymentPlan: {
        amount: "50",
        currency: "$",
        period: "yearly",
        name: "Rateup Digital Menu",
      },
    },

    {
      paymentPlan: {
        amount: "799",
        currency: "₹",
        period: "monthly",
        name: "Rateup Digital Menu Pro",
      },
    },
    {
      paymentPlan: {
        amount: "10",
        currency: "$",
        period: "monthly",
        name: "Rateup Digital Menu Pro",
      },
    },
    {
      paymentPlan: {
        amount: "7999",
        currency: "₹",
        period: "yearly",
        name: "Rateup Digital Menu Pro",
      },
    },
    {
      paymentPlan: {
        amount: "100",
        currency: "$",
        period: "yearly",
        name: "Rateup Digital Menu Pro",
      },
    },
  ];
  // return (await axiosClient.get(`${PRICING_URL}`)).data;
  return new Promise<PaymentData[]>((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, 500);
  });
}
