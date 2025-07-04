import Image from "next/image";
import Link from "next/link";

import { BookDemoModal } from "../helpers/BookDemoModal";

export default function LoyalityAd() {
  return (
    <section className="relative bg-white overflow-hidden">
      {/* Blue background for bottom half */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 z-0 bg-[#004F9E]">
        <svg
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#E5E7EB"
            fillOpacity="0.1"
            d="M0,30 Q360,0 720,30 T1440,30 V100 H0 Z"
          />
        </svg>
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex flex-col md:flex-row items-center sm:items-end justify-between px-4 sm:px-6 md:px-16 py-12 min-h-[500px] gap-8">
        {/* Image Section */}
        <div className="flex-1 flex justify-center">
          <Image
            src="https://djd7kjh9uwow0.cloudfront.net/images/homepage/whatsapp-campaigns.png"
            alt="Customer Engagement Illustration"
            width={600}
            height={500}
            className="object-contain w-full max-w-[400px] sm:max-w-[500px] h-auto"
            priority
          />
        </div>

        {/* Text Content Section */}
        <div className="flex-1 flex justify-center">
          <div className="text-white text-center md:text-left space-y-6 max-w-md">
            <h2 className="text-2xl md:text-3xl  leading-snug">
              <span className="font-semibold">
                {" "}
                Don&apos;t know how to <br />
                improve customer engagement <br />
                for your business?
              </span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6 md:justify-start">
              <BookDemoModal>
                <span className="bg-white cursor-pointer text-[#004F9E] px-4 py-2 rounded-md font-medium hover:opacity-90">
                  Enroll for Loyalty Program
                </span>
              </BookDemoModal>
              <Link
                href={"/login"}
                className="border border-white text-white px-4 py-2 rounded-md hover:bg-white hover:text-[#004F9E]"
              >
                Know More
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
