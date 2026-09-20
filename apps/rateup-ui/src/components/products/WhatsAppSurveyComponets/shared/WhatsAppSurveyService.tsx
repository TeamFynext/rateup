import { IconArrowRight } from "@tabler/icons-react";

import { features } from "../WhatsAppSurveyConstants.tsx";

export default function WhatsAppSurveyService() {
  return (
    <section id="features" className="py-20 px-8 bg-white">
      <div className="flex flex-col justify-center px-6 items-center">
        <h3 className="text-4xl text-center font-semibold text-[#009987]">
          Built for Businesses That Thrive on Customer Happiness
        </h3>

        <p className="py-4 pb-6 text-gray-500 text-center text-lg max-w-2xl mx-auto">
          RateUp is perfect for any business that values customer feedback and wants a modern,
          effective way to collect it.
        </p>
      </div>
      <div className="max-w-7xl pt-6 mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex items-start p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition"
          >
            <div className="shrink-0 w-14 h-14 mr-6 bg-ru-blue-100 text-[#009987] rounded-full flex items-center justify-center">
              <feature.icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="text-gray-500 pt-2">{feature.description}</p>
              <a
                href="https://rateup.app/login"
                className="text-[#009987] font-semibold inline-flex items-center mt-4 group"
              >
                Learn More
                <IconArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
