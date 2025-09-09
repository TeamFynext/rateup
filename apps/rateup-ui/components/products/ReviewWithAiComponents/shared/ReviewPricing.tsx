import React from "react";
import Link from "next/link";

import { plans } from "../constants";

const ReviewPricing: React.FC = () => {
  return (
    <section id="price" className="bg-white py-20">
      <div className="text-center mb-16 px-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#009987]">
          Simple, Transparent Pricing
        </h2>
        <p className="pt-4 text-gray-600">
          {
            " Start free, upgrade when you're ready. Choose the plan that fits your business needs."
          }
        </p>
      </div>

      <div
        className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4 sm:px-6
       lg:px-8"
      >
        {plans.map((plan, idx) => (
          <div
            key={plan.title}
            className={`border rounded-2xl p-6 flex flex-col shadow-sm relative ${
              plan.highlight
                ? "border-[#009987] ring-2 ring-[#009987]"
                : "border-gray-200"
            }`}
          >
            {plan.highlight && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#009987] text-white px-4 py-1 text-sm font-semibold rounded-full">
                Most Popular
              </span>
            )}

            <h3 className="text-xl font-semibold text-gray-900 text-center">
              {plan.title}
            </h3>
            <p className="text-center text-gray-600 mt-2">{plan.description}</p>

            <div className="text-center mt-6">
              <span className="text-4xl font-bold text-[#009987]">
                {plan.price}
              </span>
              <span className="text-gray-600 text-sm"> /month</span>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-gray-800">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#009987]">✔</span>
                  <span>{feature}</span>
                </li>
              ))}
              {plan.excluded.map((item, i) => (
                <li
                  key={`x-${i}`}
                  className="flex items-start gap-2 text-gray-400 line-through"
                >
                  <span className="text-red-400">✘</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6 text-center ">
              <Link
                href={"https://rateup.app/login"}
                className={`w-full block py-2 px-4 rounded-lg font-semibold transition ${
                  plan.highlight
                    ? "bg-[#009987] text-white hover:bg-[#075E54]"
                    : "border border-[#009987] text-[#009987] hover:bg-[#009987]/10"
                }`}
              >
                {plan.button}
              </Link>

              {idx === 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  No credit card required.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center text-sm text-gray-600">
        Need a custom solution or higher volumes?{" "}
        <Link href="#" className="text-[#009987] font-medium hover:underline">
          Contact Sales
        </Link>
      </div>
    </section>
  );
};

export default ReviewPricing;
