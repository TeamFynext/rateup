import Image from "next/image";

import { imagesPath } from "@/utils/constants";

export default function HeroMarketingDashboard() {
  return (
    <section className="relative min-h-44 pb-12 w-full">
      {/* Split background vertically */}
      <div className="absolute inset-0 grid grid-rows-2">
        <div className="bg-[#f4f7f3]" />
        <div className="bg-[#f4f7f3]" />
      </div>

      {/* Image centered */}
      <div className="relative z-10 flex items-center justify-center">
        <Image
          src={`${imagesPath}/COVER IMAGE.png`}
          alt="Marketing Hero"
          width={1536}
          height={757}
          className="w-full max-w-5xl px-4 sm:rounded-3xl h-auto object-contain"
          priority
        />
      </div>
    </section>
  );
}
