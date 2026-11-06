import { Image } from "@unpic/react";

import { BookDemoLink } from "@/components/RateupHomePage/helper/BookDemoLink.tsx";
import { imagesPath } from "@/utils/constants.ts";

export default function WhatsAppSurveyHero() {
  return (
    <section className="flex flex-col md:grid md:grid-cols-2 min-h-screen">
      {/* Text Section */}
      <div
        className="flex flex-col justify-center px-6 py-16 max-w-2xl mx-auto text-center
       md:text-left"
      >
        {/* Deliberately not "Stop Guessing" — /products/whatsapp-feedback opens on that line, and
            two pages with the same H1 compete for the same query instead of ranking for two. This
            page owns "WhatsApp survey / NPS survey"; that one owns "customer feedback". */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-800 pb-6 leading-tight">
          Run NPS & CSAT Surveys <span className="text-[#009987]">Inside WhatsApp</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-500 pb-8">
          Emailed survey links get about a 2% response rate. RateUp sends the survey as a native
          WhatsApp Flows form — no link to click, no page to load — which is how response rates
          reach 35%, with follow-ups that branch on the score.
        </p>
        <div className="flex flex-col sm:flex-row sm:justify-center md:justify-start gap-4">
          <a href={"https://rateup.app/login"}>
            <button className="bg-[#009987] w-full cursor-pointer hover:bg-[#075E54] text-white font-semibold py-3 px-6 rounded-lg shadow-md transition">
              Get Started Free
            </button>
          </a>
          <BookDemoLink>
            <button className="bg-white border cursor-pointer border-gray-300 hover:border-gray-400 text-gray-900 font-semibold py-3 px-6 rounded-lg shadow-md transition">
              Schedule a Demo
            </button>
          </BookDemoLink>
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
