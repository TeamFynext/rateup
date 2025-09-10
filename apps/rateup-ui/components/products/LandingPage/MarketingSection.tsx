import Image from "next/image";

import { imagesPath } from "@/utils/constants";

export default function MarketingSection() {
  return (
    <section className="flex flex-col-reverse md:flex-row items-center justify-between gap-12 px-6 py-16 md:px-16 bg-white">
      {/* Left Section */}
      <div className="max-w-xl">
        <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-900 mb-4">
          Marketing Solutions
        </span>

        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
          Drive more sales, <br />
          <span className="relative inline-block">
            analyze performance
            <span className="absolute bottom-0 left-0 w-full h-2 bg-lime-200 z-[-1]" />
          </span>
        </h2>

        <p className="text-gray-600 text-lg mb-6">
          From lead generation to conversion, our app covers every aspect of
          your marketing journey.
        </p>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-gray-900 font-medium text-sm">
          <div>✅ Data analytics</div>
          <div>✅ Brand strategy</div>
          <div>✅ Website design</div>
          <div>✅ Content creation</div>
          <div>✅ Event marketing</div>
          <div>✅ PPC advertising</div>
        </div>

        <button className="mt-8 bg-emerald-900 text-white font-semibold px-6 py-3 rounded-lg hover:bg-emerald-800 transition">
          Get started now
        </button>
      </div>

      {/* Right Section */}
      <div className="relative  bg-slate-50 rounded-3xl shadow-inner p-4">
        <Image
          src={`${imagesPath}/homepage/Group 48096782.png`}
          alt="Audience Activity"
          width={600}
          height={600}
          className="rounded-2xl bottom-20 w-full h-auto"
        />
      </div>
    </section>
  );
}
