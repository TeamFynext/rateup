import { Sora } from "next/font/google";

import {
  IconArrowRight,
  IconClock,
  IconCode,
  IconHeadphones,
} from "@tabler/icons-react";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function AutomateInteraction() {
  return (
    <section
      className={`${sora.className} py-10 flex flex-col items-center justify-center gap-6`}
    >
      <div className="flex flex-col items-center justify-center">
        <span className="flex text-4xl font-semibold text-rateup-graytext">
          Automate Every Customer Interaction
        </span>
        <span className="flex text-4xl font-semibold text-rateup-graytext">
          With RateUp AI Agents
        </span>
      </div>
      <div className="flex flex-col items-center justify-center">
        <span className="flex text-sm font-normal text-rateup-graytext">
          Turn every transaction, message, or support query into a real-time,
          AI-powered conversation
        </span>
        <span className="flex text-sm font-normal text-rateup-graytext">
          that drives engagement, loyalty, and growth.
        </span>
      </div>
      <div className="flex items-center justify-center">
        <div className="bg-[#F5F5F5] rounded-full py-1 px-1 flex items-center justify-center gap-2">
          <div className="bg-rateup-graytext p-1 rounded-full flex justify-center items-center">
            <IconClock className="text-white h-5 w-5" />
          </div>
          <span className="text-rateup-graytext text-base pr-2">
            <span className="font-semibold">10 Min</span> Setup Time
          </span>
        </div>
        <div className="bg-[#F5F5F5] rounded-full py-1 px-1 flex items-center justify-center gap-2">
          <div className="bg-rateup-graytext p-1 rounded-full flex justify-center items-center">
            <IconCode className="text-white h-5 w-5" />
          </div>
          <span className="text-rateup-graytext text-base pr-2">
            <span className="font-semibold">Zero</span> Code Needed
          </span>
        </div>
        <div className="bg-[#F5F5F5] rounded-full py-1 px-1 flex items-center justify-center gap-2">
          <div className="bg-rateup-graytext p-1 rounded-full flex justify-center items-center">
            <IconHeadphones className="text-white h-5 w-5" />
          </div>
          <span className="text-rateup-graytext text-base pr-2">
            <span className="font-semibold">24/7</span> Support
          </span>
        </div>
      </div>
      <div className="flec items-center justify-center">
        <button className="flex items-center justify-center gap-2 bg-rateup-gold rounded-sm px-4 py-2">
          <span className="text-white text-sm font-semibold">
            Launch In Minutes
          </span>
          <IconArrowRight className="h-6 w-6 text-white" />
        </button>
      </div>
    </section>
  );
}
