import Image from "next/image";
import Link from "next/link";

import { FaApple, FaGooglePlay } from "react-icons/fa";

import { imagesPath } from "@/utils/constants";

export default function MobileAppSection() {
  return (
    <section className="bg-gradient-to-br from-[#e8f1f887] via-[#F4F7F3] to-[#e8f1f887] py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left Content */}
        <div>
          <p className="uppercase text-[#1c518e] font-semibold tracking-wide mb-3 text-sm">
            Mobile App
          </p>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#013553] pb-6 leading-tight">
            Browse your analytics <br className="hidden sm:block" /> & reports
            on the go!
          </h2>

          <p className="text-gray-600 text-lg pb-10 max-w-xl leading-relaxed">
            View analytics reports, manage user profiles, and access powerful
            features—wherever you are. Available on Android and iOS.
          </p>

          {/* App Store Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="#"
              className="bg-[#1c518e] text-white px-5 py-3 rounded-full font-semibold flex items-center gap-2 hover:bg-[#00397b] transition duration-300 shadow-md"
            >
              <FaGooglePlay size={22} />
              <span className="text-sm sm:text-base">Google Play</span>
            </Link>

            <Link
              href="#"
              className="bg-black text-white px-5 py-3 rounded-full font-semibold flex items-center gap-2 hover:bg-gray-800 transition duration-300 shadow-md"
            >
              <FaApple size={22} />
              <span className="text-sm sm:text-base">App Store</span>
            </Link>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
            <Image
              src={`${imagesPath}/MOBILE-ANALYTICS.png`}
              alt="Mobile analytics preview"
              width={600}
              height={600}
              className="w-full h-auto object-contain rounded-2xl"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
