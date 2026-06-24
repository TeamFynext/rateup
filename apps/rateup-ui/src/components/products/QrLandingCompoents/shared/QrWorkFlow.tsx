import { Image } from "@unpic/react";

import { imagesPath } from "@/utils/constants.ts";

import { Qrsteps } from "../QrConstants.tsx";

const QrWorkFlow = () => {
  return (
    <section className="bg-[#F0F9FF] py-16 md:py-24" id="how-it-works">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center flex flex-col items-center mb-20">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1c518e] pb-4">
            Get Started in Minutes
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl">
            Launch your first interactive QR code campaign quickly and easily with our intuitive
            platform.
          </p>
        </div>

        {/* Steps */}
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 relative z-10">
            {Qrsteps.map((step, index) => (
              <div
                key={step.number}
                className="relative flex flex-col items-center text-center group"
              >
                {/* Step Number */}
                <div className="relative z-10 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#003B7A] to-[#00397b] text-white flex items-center justify-center font-bold text-2xl shadow-md">
                    {step.number}
                  </div>
                </div>

                {/* Connector line */}
                {index < Qrsteps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 right-[-70px] w-[70px] h-1 bg-[#225fa4]"></div>
                )}

                {/* Title & Description */}
                <h3 className="text-xl font-semibold text-[#0F172A] mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Image */}
        <div className="mt-20 text-center">
          <Image
            src={`${imagesPath}/qr-landing/qrworkflow3.webp`}
            width={500}
            height={500}
            alt="RateUp QR code example"
            className="max-w-sm sm:max-w-xl mx-auto rounded-2xl shadow-lg"
          />
        </div>
      </div>
    </section>
  );
};

export default QrWorkFlow;
