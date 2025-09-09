import React from "react";
import Image from "next/image";

import { imagesPath } from "@/utils/constants";

const Image1 = `${imagesPath}/inbox/AUTOMATED CHECK INS.png`;
const Image2 = `${imagesPath}/ai-automation/SENTIMENT ANALYSIS.png`;
const Image3 = `${imagesPath}/inbox/REAL - TIME ANALYTICS.png`;
const Image4 = `${imagesPath}/inbox/ANONYMOIUS & SECURE.png`;

export const articles = [
  {
    category: "Automated Check-ins",
    date: "SEPTEMBER 1, 2022",
    title:
      "Schedule periodic pulses to gather continuous feedback without administrative hassle.",
    image: Image1,
    link: "#",
  },
  {
    category: "AI-Powered Insights",
    date: "SEPTEMBER 1, 2022",
    title:
      "Our AI identifies recurring themes from open-ended feedback, so you know exactly where to focus.",
    image: Image2,
    link: "#",
  },
  {
    category: "Real-time Analytics",
    date: "SEPTEMBER 1, 2022",
    title:
      "Access a live dashboard with intuitive data visualizations. No more waiting for quarterly reports.",
    image: Image3,
    link: "#",
  },
  {
    category: "Anonymous & Secure",
    date: "SEPTEMBER 1, 2022",
    title:
      "Ensure honest feedback with guaranteed anonymity and enterprise-grade data security.",
    image: Image4,
    link: "#",
  },
];

export default function InboxFeatures2() {
  return (
    <section
      id="benefits"
      className="pb-24 max-w-[85rem] mb-28 px-6 sm:px-10 lg:px-20 mx-auto  rounded-[3rem] 
      bg-[linear-gradient(290deg,#004F98_0%,#001C57_100%)]"
    >
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center text-center">
        {/* Article Sections */}
        <div className="mt-24 space-y-36 w-full">
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
                  width={600}
                  height={600}
                  className="rounded-2xl max-w-[90%] sm:max-w-sm md:max-w-lg
                   hover:scale-[1.02] transition-transform duration-300"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
