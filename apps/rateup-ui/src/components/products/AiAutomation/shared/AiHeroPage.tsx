import { Image } from "@unpic/react";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal.tsx";
import { imagesPath } from "@/utils/constants.ts";

export default function AiHeroPage() {
  return (
    <section
      className="flex flex-col xl:grid xl:grid-cols-2 min-h-screen bg-gradient-to-b
     from-white to-[#e6f7ffde]"
    >
      {/* Text Section */}
      <div
        className="flex flex-col bg-gradient-to-b
     from-white to-[#e6f7ffde] justify-center items-center md:items-start px-5 sm:px-16 py-16 max-w-3xl w-full bg-white"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-[#001C57] pb-6 leading-tight text-center md:text-left">
          Stop Missing Opportunities. <br />
          <span className="text-[#004F98]">Transform Customer Journeys with AI.</span>
        </h1>
        <p className="text-base font-medium sm:text-lg text-gray-600 pb-8 text-center md:text-left">
          Tired of manual processes and disconnected customer experiences? RateUp's AI-Enabled
          Automation Builder lets you design smart, context-aware workflows that personalize every
          touchpoint, resolve issues faster, and fuel growth — all without writing a single line of
          code.
        </p>
        <div className="flex flex-col sm:flex-row sm:justify-center md:justify-start gap-4 w-full sm:w-auto">
          <a href="https://rateup.app/login" className="w-full sm:w-auto">
            <button className="bg-[#004F98] w-full cursor-pointer hover:bg-[#001C57] text-white font-semibold py-3 px-6 rounded-lg shadow-md transition">
              Start Automating Smarter Today
            </button>
          </a>
          <BookDemoModal>
            <button className="bg-white border cursor-pointer border-[#004F98] hover:bg-[#F0F8FF] text-[#004F98] font-semibold py-3 px-6 rounded-lg shadow-md transition">
              Schedule a Demo
            </button>
          </BookDemoModal>
        </div>
      </div>

      {/* Image Section */}
      <div className="relative w-full h-[500px] sm:h-[600px] md:h-[700px] xl:h-auto xl:min-h-screen">
        <Image
          src={`${imagesPath}/ai-automation/HEADER IMAGE (2)-Photoroom.png`}
          alt="Analytics dashboard"
          layout="fullWidth"
          aspectRatio={1}
          objectFit="contain"
          className="object-contain object-right"
        />
      </div>
    </section>
  );
}
