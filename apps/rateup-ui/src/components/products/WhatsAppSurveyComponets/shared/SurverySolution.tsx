import { Image } from "@unpic/react";

import { imagesPath } from "@/utils/constants.ts";

export default function SurveySection() {
  return (
    <div className="flex flex-col lg:flex-row-reverse w-full sm:min-h-screen">
      {/* Right content section (now on the right for lg screens) */}
      <div className="w-full lg:w-2/3 flex items-center justify-end p-4 sm:p-4 lg:p-8 px-8 bg-white">
        <div className="max-w-2xl w-full">
          <p className="text-[#075E54] font-medium pb-2">ADVANCED ANALYTICS</p>
          <h2 className="text-3xl lg:leading-14 sm:text-4xl md:text-5xl font-semibold text-[#009987] pb-4 sm:pb-6">
            RateUp + WhatsApp: The Feedback Solution That Actually Works
          </h2>
          <p className="text-gray-500 text-base sm:text-lg pb-8 sm:pb-12">
            Boost your feedback response rate by up to 35%! RateUp leverages WhatsApp Flows –
            native, interactive forms within the world's most popular messaging app (+2 Billion
            users). Engage customers easily, tailor questions, and finally get the insights you
            need.
          </p>

          <div className="space-y-6 sm:space-y-8">
            <div className="flex justify-start">
              <a
                href={"https://rateup.app/login"}
                className="bg-[#009987] hover:bg-[#075E54] text-white font-semibold py-3 px-6 rounded-lg shadow-md transition"
              >
                Get Started Free
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Left dashboard preview section - now first on large screens */}
      <div className="w-full lg:w-1/2 rounded-r-3xl bg-[#075E54] hidden mt-14 lg:flex items-center justify-center p-8 relative">
        <Image
          src={`${imagesPath}/whatsapp-survey-page/whatsappSurvey-hero2.png`}
          height={700}
          width={500}
          alt="Dashboard Illustration"
          className="w-full h-auto rounded-2xl"
        />
      </div>

      {/* Mobile dashboard view - visible only on smaller screens */}
      <div className="w-full bg-[#075E54] flex lg:hidden items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md mx-auto -mt-4">
          <Image
            src={`${imagesPath}/whatsapp-survey-page/whatsappSurvey-hero2.png`}
            height={700}
            width={500}
            alt="Dashboard Illustration"
            className="w-full h-auto rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
