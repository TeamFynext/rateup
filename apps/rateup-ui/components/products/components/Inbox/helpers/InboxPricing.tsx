"use client";

import React from "react";

import { CheckCircle } from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "For small teams getting started.",
    price: "$99",
    duration: "/mo",
    features: [
      "Up to 50 employees",
      "eNPS & CSAT Surveys",
      "Basic Analytics",
      "Email Support",
    ],
    buttonText: "Choose Plan",
    highlight: false,
  },
  {
    name: "Pro",
    description: "For growing companies that need more.",
    price: "$249",
    duration: "/mo",
    features: [
      "Up to 250 employees",
      "All Starter features, plus:",
      "Advanced AI Insights",
      "Multi-Team Analytics",
      "Priority Support",
    ],
    buttonText: "Choose Pro",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    description: "For large organizations with custom needs.",
    price: "Let's Talk",
    duration: "",
    features: [
      "Unlimited employees",
      "All Pro features, plus:",
      "Multi-Branch Oversight",
      "Issue Ticketing & Escalation",
      "Dedicated Account Manager",
    ],
    buttonText: "Contact Sales",
    highlight: false,
  },
];

export default function InboxPricing() {
  return (
    <section
      id="pricing"
      className="bg-gradient-to-br from-gray-50 to-white py-24"
    >
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold text-[#1c518e] mb-4">
          Simple, Transparent Pricing
        </h2>
        <p className="text-gray-600 text-lg md:text-xl mb-16">
          Choose the plan that's right for your team. No hidden fees.
        </p>

        <div className="grid md:grid-cols-3 gap-10">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-3xl shadow-lg p-10 transition transform hover:-translate-y-1 hover:shadow-2xl border ${
                plan.highlight
                  ? "bg-[#1c518e] text-white border-[#1c518e] scale-105"
                  : "bg-white text-gray-700 border-4 border-[#1c518e]"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-400 text-xs text-black font-semibold px-4 py-1 rounded-full shadow-sm">
                    {plan.badge}
                  </span>
                </div>
              )}

              <h3
                className={`text-2xl font-bold mb-2 ${
                  plan.highlight ? "text-white" : "text-gray-700"
                }`}
              >
                {plan.name}
              </h3>
              <p
                className={`text-sm mb-6 ${
                  plan.highlight ? "text-white/80" : "text-gray-500"
                }`}
              >
                {plan.description}
              </p>

              <div
                className={`text-4xl font-extrabold mb-6 ${
                  plan.highlight ? "text-white" : "text-gray-700"
                }`}
              >
                {plan.price}
                <span
                  className={`text-base font-medium ${
                    plan.highlight ? "text-white/70" : "text-gray-500"
                  }`}
                >
                  {plan.duration}
                </span>
              </div>

              <ul className="space-y-3 mb-8 text-left">
                {plan.features.map((feature, i) => (
                  <li
                    key={i}
                    className={`flex items-start ${
                      plan.highlight ? "text-white" : "text-gray-700"
                    }`}
                  >
                    <CheckCircle
                      className={`w-5 h-5 mr-2 ${
                        plan.highlight ? "text-white" : "text-green-500"
                      }`}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 rounded-xl font-semibold text-sm tracking-wide transition duration-300 ${
                  plan.highlight
                    ? "bg-white text-[#1c518e] hover:bg-gray-100"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
