import { Image } from "@unpic/react";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal.tsx";
import { imagesPath } from "@/utils/constants.ts";

export default function WhatsAppSurveyHero() {
  return (
    <section className="flex flex-col md:grid md:grid-cols-2 min-h-screen">
      {/* Text Section */}
      <div
        className="flex flex-col justify-center px-6 py-16 max-w-2xl mx-auto text-center
       md:text-left"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-800 pb-6 leading-tight">
          Stop Guessing — Grow Smarter with{" "}
          <span className="text-[#009987]">WhatsApp Customer Feedback</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-500 pb-8">
          WTraditional feedback methods yield only 2% response rates. RateUp uses WhatsApp Flows to
          connect with customers where they are, boosting feedback by up to 35% and turning insights
          into growth.
        </p>
        <div className="flex flex-col sm:flex-row sm:justify-center md:justify-start gap-4">
          <a href={"https://rateup.app/login"}>
            <button className="bg-[#009987] w-full cursor-pointer hover:bg-[#075E54] text-white font-semibold py-3 px-6 rounded-lg shadow-md transition">
              Start Free Trial
            </button>
          </a>
          <BookDemoModal>
            <button className="bg-white border cursor-pointer border-gray-300 hover:border-gray-400 text-gray-900 font-semibold py-3 px-6 rounded-lg shadow-md transition">
              Schedule a Demo
            </button>
          </BookDemoModal>
        </div>
      </div>

      {/* Image Section */}
      <div
        className=" bg-linear-to-br from-[#075E54] sm:rounded-b-4xl via-[#075E54]
       to-[#009987] flex items-center justify-center py-1 px-4"
      >
        <div className="relative w-full h-[400px] sm:h-[750px]">
          <Image
            src={`${imagesPath}/whatsapp-survey-page/RateUp%2BWhatsApp.png`}
            alt="Analytics dashboard illustration"
            layout="fullWidth"
            aspectRatio={1}
            objectFit="contain"
            className="object-contain"
          />
        </div>
      </div>
    </section>
  );
}
