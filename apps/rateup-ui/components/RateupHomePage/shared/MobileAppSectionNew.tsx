import { Sora } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import { FaApple, FaGooglePlay } from "react-icons/fa";

import { imagePath } from "@/components/HomePage/pages/constants";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function MobileAppSection() {
  return (
    <section className={`${sora.className} bg-rateup-darkblue py-10 pb-24`}>
      <div className="max-w-6xl rounded-2xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center border-3 border-[#052259]">
        {/* Left Content */}
        <div className="px-6 lg:px-11 w-full">
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-white pb-6 leading-tight">
            Browse Your Analytics & Reports On The Go
          </h2>

          <p className="text-[#93C6F5] text-base pb-10 max-w-xl leading-relaxed">
            View analytics reports, manage user profiles, and access powerful
            features —wherever you are. Available on Android and iOS.
          </p>

          {/* App Store Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="#"
              className="bg-white text-black px-5 py-3 rounded-sm font-semibold flex items-center gap-2 hover:bg-[#e4e1e1] transition duration-300 shadow-md"
            >
              <FaGooglePlay color="black" size={22} />
              <span className="text-sm sm:text-base">Google Play</span>
            </Link>

            <Link
              href="#"
              className="bg-black text-white px-5 py-3 rounded-sm font-semibold flex items-center gap-2 hover:bg-gray-800 transition duration-300 shadow-md"
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
              src={`${imagePath}/homepage/APP.svg`}
              alt="Mobile analytics preview"
              width={600}
              height={600}
              className="w-full h-auto object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
