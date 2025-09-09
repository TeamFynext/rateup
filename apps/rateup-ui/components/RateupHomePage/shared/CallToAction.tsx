import Image from "next/image";
import Link from "next/link";

import { imagePath } from "@/components/HomePage/pages/constants";

import { BookDemoModal1 } from "../helpers/BookDemoModal";

const CallToAction = () => {
  return (
    <section
      className="relative bg-gradient-to-b from-white to-[#CDEAFF] text-center
     pt-20 sm:pb-60 pb-40 overflow-hidden"
    >
      {/* Arc Background */}
      <div className="absolute top-0 left-0 w-full h-[500px] z-0 pointer-events-none overflow-hidden">
        <div className="relative w-[200%] sm:top-0 -top-4  h-full left-[-50%] ">
          <Image
            src={`${imagePath}/arch.svg`}
            alt="Arc Background"
            fill
            priority
          />
        </div>
      </div>

      {/* CTA Content */}
      <div className="relative z-10 px-4 flex flex-col justify-center items-center">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-800 leading-tight pb-4">
          Ready to Transform Your
          <br />
          Customer Engagement?
        </h1>
        <p className="text-gray-600 max-w-xl mx-auto pb-8">
          Join businesses revolutionizing customer engagement and driving growth
          with RateUp's all-in-one, WhatsApp-first platform for lasting loyalty.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href={"/login"}
            className="bg-[#1c518e] text-white font-semibold px-6 py-3 rounded-full
           hover:bg-[#1c518e] transition"
          >
            Start free trial
          </Link>
          <BookDemoModal1 />
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
