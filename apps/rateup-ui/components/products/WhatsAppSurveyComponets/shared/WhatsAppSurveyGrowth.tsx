import React from "react";
import Image from "next/image";

import { articles } from "../WhatsAppSurveyConstants";

export default function WhatsAppSurveyGrowth() {
  return (
    <section
      className="py-16  bg-linear-to-br px-8 from-[#075E54] rounded-b-4xl via-[#075E54] to-[#009987]"
      id="feedback"
    >
      <div
        className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center 
      sm:px-6 lg:px-8 text-center"
      >
        <h3 className="text-4xl sm:text-5xl font-semibold text-[#ffffff]">
          Turn Feedback into Growth
        </h3>

        <p className="pt-4 text-gray-200 text-lg max-w-2xl mx-auto">
          RateUp goes beyond just collecting feedback. We help you leverage it
          to improve your business from every angle.
        </p>

        <div className="mt-16 space-y-16 w-full">
          {articles.map((article, index) => (
            <div
              key={index}
              className={`flex flex-col-reverse md:flex-row items-center justify-between gap-8 ${
                index % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              {/* Text Section */}
              <div className="md:w-1/2 text-left">
                <h4 className="text-3xl font-semibold text-white">
                  {article.category}
                </h4>
                <p className="pt-4 text-gray-100 text-lg">{article.title}</p>
              </div>

              {/* Image Section */}
              <div className="md:w-1/2">
                <Image
                  src={article.image}
                  alt={article.category}
                  width={600}
                  height={450}
                  className="rounded-3xl w-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
