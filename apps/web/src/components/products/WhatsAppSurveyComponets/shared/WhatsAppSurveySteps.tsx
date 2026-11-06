import { Surveysteps } from "../WhatsAppSurveyConstants.tsx";

const WhatsAppSurveySteps = () => {
  return (
    <section className="bg-[#F0F9FF] py-16 md:py-24" id="how-it-works">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center flex flex-col items-center mb-20">
          <h2 className="text-4xl sm:text-5xl font-semibold text-[#075E54] pb-4">
            Get Actionable Feedback in 3 Simple Steps
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl">
            Start collecting valuable customer insights quickly and easily with RateUp.
          </p>
        </div>

        {/* Steps */}
        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-10 relative z-10">
            {Surveysteps.map((step, index) => (
              <div
                key={step.number}
                className="relative flex flex-col items-center text-center group max-w-xs px-4"
              >
                {/* Step Number */}
                <div className="relative z-10 mb-6 transition transform group-hover:scale-110">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#075E54] to-[#009987] text-white flex items-center justify-center font-bold text-2xl shadow-lg">
                    {step.icon}
                  </div>
                </div>

                {/* Optional connector line on large screens */}
                {index < Surveysteps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 right-[-70px] w-[70px] h-1 bg-[#009987]"></div>
                )}

                {/* Title & Description */}
                <h3 className="text-xl font-semibold text-[#0F172A] mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatsAppSurveySteps;
