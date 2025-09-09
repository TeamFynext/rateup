import Image from "next/image";

import { FaGooglePlay } from "react-icons/fa";

import { imagesPath } from "@/utils/constants";

export default function MobileAppSection() {
  return (
    <section className="bg-gradient-to-br from-[#e8f1f887] via-[#F4F7F3] to-[#e8f1f887] pt-2 ">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left Content */}
        <div>
          <p className="uppercase text-[#1c518e] font-semibold tracking-wider mb-4 text-sm">
            Mobile App
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#013553] mb-6 leading-snug">
            Browse your analytics <br /> & reports on the go!
          </h2>
          <p className="text-gray-600 text-lg mb-10 max-w-xl leading-relaxed">
            Browse all analytics reports, user profiles, and much more in our
            mobile app. It’s free and full-feature packaged to help you stay in
            control wherever you are.
          </p>

          {/* Store Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#"
              className="bg-[#1c518e] text-white px-6 py-3 rounded-full font-semibold flex items-center gap-2 hover:bg-[#00397b] transition duration-300 shadow-md"
            >
              <FaGooglePlay size={28} />
              Google Play
            </a>
          </div>
        </div>

        {/* Right Content - Full Height Image */}
        <div className="h-full flex items-center justify-center">
          <div className="relative w-full max-w-md lg:max-w-lg">
            <Image
              src={`${imagesPath}/MOBILE-ANALYTICS.png`}
              alt="Mobile app preview"
              width={700}
              height={700}
              className="w-full h-full object-contain rounded-2xl"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
