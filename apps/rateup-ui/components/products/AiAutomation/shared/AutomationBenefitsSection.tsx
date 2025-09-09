import React from "react";
import Image from "next/image";

import { imagesPath } from "@/utils/constants";

const Image1 = `${imagesPath}/ai-automation/CUSTOMER SUPPORT FLOW.png`;
const Image2 = `${imagesPath}/ai-automation/AI Lead Qualification & Nurturing.png`;
const Image3 = `${imagesPath}/ai-automation/SENTIMENT ANALYSIS.png`;
const Image4 = `${imagesPath}/ai-automation/LOYALTY PROGRAM (1).png`;

export const articles = [
  {
    category: "Customer Support Flows",
    date: "SEPTEMBER 1, 2022",
    title:
      "Triage, respond, and escalate tickets automatically, providing instant help 24/7 and reducing agent workload.",
    image: Image1,
    link: "#",
  },
  {
    category: "Lead Qualification & Nurturing",
    date: "SEPTEMBER 1, 2022",
    title:
      "AI agents gather crucial info, qualify leads, and initiate personalized nurturing sequences, ensuring no opportunity is missed and sales teams focus on high-potential prospects.",
    image: Image2,
    link: "#",
  },
  {
    category: "Feedback & Sentiment Analysis",
    date: "SEPTEMBER 1, 2022",
    title:
      "Analyze customer sentiments in real time from various channels. Automatically route unhappy customers to human intervention for quick resolution and gather valuable insights for product improvement.",
    image: Image3,
    link: "#",
  },
  {
    category: "Loyalty Programs & Referrals",
    date: "SEPTEMBER 1, 2022",
    title:
      "Intelligent agents guide users through loyalty programs, referral steps, and personalized offers with ease, boosting customer retention and expanding your reach through word-of-mouth.",
    image: Image4,
    link: "#",
  },
];

export default function AutomationBenefitsSection() {
  return (
    <section
      id="benefits"
      className="py-24 max-w-[85rem] mb-28 px-6 sm:px-10 lg:px-20 mx-auto  rounded-[3rem] 
      bg-[linear-gradient(290deg,#004F98_0%,#001C57_100%)]"
    >
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center text-center">
        {/* Heading */}
        <h3 className="text-4xl sm:text-5xl max-w-5xl font-bold text-white leading-snug">
          Transform Your Business with <br /> RateUp&apos;s AI Agents
        </h3>
        <p className="pt-6 text-gray-200 font-medium text-xl max-w-2xl mx-auto">
          See how RateUp&apos;s AI-Enabled Automation Builder can revolutionize
          various aspects of your business operations:
        </p>

        {/* Article Sections */}
        <div className="mt-24 space-y-40 w-full">
          {articles.map((article, index) => (
            <div
              key={index}
              className={`flex flex-col-reverse md:flex-row items-center justify-between gap-12 
                transition-all duration-300 ${
                  index % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
            >
              {/* Text Content */}
              <div className="md:w-1/2 text-left">
                <h4 className="text-3xl sm:text-5xl font-semibold text-white mb-4">
                  {article.category}
                </h4>
                <p className="text-lg sm:text-xl pt-2.5 text-gray-100 leading-relaxed">
                  {article.title}
                </p>
              </div>

              {/* Image Content */}
              <div className="md:w-1/2 flex justify-center">
                <Image
                  src={article.image}
                  alt={article.category}
                  width={500}
                  height={400}
                  className="rounded-2xl max-w-[90%] sm:max-w-md md:max-w-lg shadow-xl hover:scale-[1.02] transition-transform duration-300"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
