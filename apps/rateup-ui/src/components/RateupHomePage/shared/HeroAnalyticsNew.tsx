import {
  IconMessageCirclePlus,
  IconRefresh,
  IconUser,
} from "@tabler/icons-react";

import { sora } from "@/utils/fonts.ts";

export default function HeroAnalytics() {
  return (
    <section
      className={`bg-white flex flex-col md:flex-row items-center justify-center gap-10 md:gap-40 py-10 px-4 ${sora.className}`}
    >
      {/* Block 1 */}
      <div className="flex flex-col items-center justify-center text-center w-full md:w-auto">
        <span className="bg-[linear-gradient(to_right,#004F98,#001747)] bg-clip-text text-transparent font-bold text-5xl md:text-6xl">
          3X
        </span>
        <span className="text-rateup-graytext font-semibold mt-2 text-base md:text-lg">
          More Engagement
        </span>
        <div className="flex items-center justify-center gap-2 bg-grey-color-5 rounded-full mt-4 px-3 py-1">
          <div className="flex items-center justify-center p-1 bg-rateup-graytext rounded-full">
            <IconMessageCirclePlus className="text-white h-4 w-4" />
          </div>
          <span className="text-rateup-graytext pr-3 text-xs md:text-sm">
            With <span className="font-semibold">AI-Powered Conversations</span>
          </span>
        </div>
      </div>

      {/* Block 2 */}
      <div className="flex flex-col items-center justify-center text-center w-full md:w-auto">
        <span className="bg-[linear-gradient(to_right,#004F98,#001747)] bg-clip-text text-transparent font-bold text-5xl md:text-6xl">
          65%
        </span>
        <span className="text-rateup-graytext font-semibold mt-2 text-base md:text-lg">
          Less Manual Effort
        </span>
        <div className="flex items-center justify-center gap-2 bg-grey-color-5 rounded-full mt-4 px-3 py-1">
          <div className="flex items-center justify-center p-1 bg-rateup-graytext rounded-full">
            <IconRefresh className="text-white h-4 w-4" />
          </div>
          <span className="text-rateup-graytext pr-3 text-xs md:text-sm">
            With <span className="font-semibold">Smart Automation</span>
          </span>
        </div>
      </div>

      {/* Block 3 */}
      <div className="flex flex-col items-center justify-center text-center w-full md:w-auto">
        <span className="bg-[linear-gradient(to_right,#004F98,#001747)] bg-clip-text text-transparent font-bold text-5xl md:text-6xl">
          30%
        </span>
        <span className="text-rateup-graytext font-semibold mt-2 text-base md:text-lg">
          Higher Customer Retention
        </span>
        <div className="flex items-center justify-center gap-2 bg-grey-color-5 rounded-full mt-4 px-3 py-1">
          <div className="flex items-center justify-center p-1 bg-rateup-graytext rounded-full">
            <IconUser className="text-white h-4 w-4" />
          </div>
          <span className="text-rateup-graytext pr-3 text-xs md:text-sm">
            With <span className="font-semibold">Personalized Follow-Ups</span>
          </span>
        </div>
      </div>
    </section>
  );
}
