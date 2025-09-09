import Image from "next/image";

import { BookDemoModal } from "@/components/RateupHomePage/helpers/BookDemoModal";
import { imagesPath } from "@/utils/constants";

export default function MarketingCard() {
  return (
    <section
      className="flex flex-col lg:flex-row items-center
     justify-between max-w-7xl mx-auto gap-4 lg:gap-16 px-6 py-20 md:px-16 bg-[#FFFFFF]"
    >
      {/* Text Content */}
      <div className="max-w-xl text-center lg:text-left">
        <span className="inline-block border border-[#1c518e] px-4 py-1.5 text-sm font-semibold text-[#1c518e] rounded-full mb-4">
          Marketing Solutions
        </span>

        <h2 className="text-4xl md:text-5xl font-medium text-[#15161c] mb-5 leading-tight">
          The Perfect Survey, For{" "}
          <span className="relative inline-block">
            <span className="absolute inset-x-[-6px] bottom-1 h-2 sm:h-4 rounded-sm bg-[#3f5aa9a2] origin-left" />
            <span className="relative z-10">Your Needs</span>
          </span>
        </h2>

        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          Select the ideal survey for your requirements. Craft uniquely engaging
          feedback forms to boost response rates.
        </p>

        {/* Feature Cards */}
        <div className="grid grid-cols-2 gap-4 text-[#144470] font-medium text-sm">
          {[
            "Web Surveys",
            "Custom Branding",
            "Survey Tree",
            "Dynamic Page",
            "QR Code",
            "Short URLs",
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-4 py-2 bg-[#f5faff] rounded-lg shadow-sm transition hover:shadow-md"
            >
              ✨ {item}
            </div>
          ))}
        </div>

        <BookDemoModal>
          <button className="mt-10 cursor-pointer bg-[#00397b] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#1c518e] transition">
            Book A Free Demo
          </button>
        </BookDemoModal>
      </div>

      {/* Image Section */}
      <div className="relative w-full max-w-[600px] flex justify-center">
        <div className="bg-white rounded-3xl shadow-md border-2 overflow-hidden p-3">
          <Image
            src={`${imagesPath}/homepage/PERFECT SURVEY.png`}
            alt="Marketing Preview"
            width={600}
            height={600}
            className="w-full h-auto rounded-2xl"
          />
        </div>
      </div>
    </section>
  );
}
