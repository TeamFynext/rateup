import { Sora } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import { IconArrowRight } from "@tabler/icons-react";

import { imagesPath } from "@/utils/constants";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const features = [
  {
    link: "https://rateup-homepage-dev.up.railway.app/products/qr-studio",
    title: "Smart Automation & AI Chatbot",
    description:
      "Design complex workflows with our intuitive drag-and-drop builder to trigger messages, assign tasks, and personalize responses—while our smart multi-language AI chatbot delivers round-the-clock support across WhatsApp and your website.",
    image: `${imagesPath}/homepage/smartautomationai.png`,
  },
  {
    link: "/login",
    title: "Omnichannel Inbox",
    description:
      "Manage every customer interaction from one place. RateUp’s unified inbox keeps WhatsApp, Instagram, and other channels connected — enabling faster responses, seamless collaboration, and better customer experiences.",
    image: `${imagesPath}/homepage/omnichannelinbox.png`,
  },

  {
    link: "/login",
    title: "Customer Profiles & Retention AI",
    description:
      "Unify customer data, predict churn, and power loyalty with AI that turns insights into retention strategies. RateUp helps you understand every interaction, predict what they need next, and engage them at the perfect moment.",

    image: `${imagesPath}/homepage/customerprofiles.png`,
  },
  {
    link: "/login",
    title: "Feedback & Insights",
    description:
      "Turn every message, survey, and chat into meaningful data. With AI-powered analysis, RateUp identifies satisfaction drivers, detects sentiment shifts, and delivers insights that boost customer experience and retention.",

    image: `${imagesPath}/homepage/feedbackinsights.png`,
  },
];

export default function FeatureCards2() {
  return (
    <section
      className={`relative h-[400vh] bg-white px-4 pb-8 ${sora.className}`}
    >
      {features.map((feature, index) => (
        <div
          key={index}
          className="sticky top-0 h-screen flex items-center justify-center z-[10]"
          style={{ zIndex: 10 + index }}
        >
          <div
            className={`
              flex flex-col lg:flex-row items-center justify-between
              max-w-[78rem] w-full mx-auto gap-10 px-6 py-10 rounded-3xl
               transition-all duration-300
              bg-rateup-darkblue
            `}
          >
            {/* Image Section */}
            <div className="w-full lg:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md h-[280px] sm:h-[380px] lg:h-[460px]">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-contain rounded-2xl "
                />
              </div>
            </div>

            {/* Content Section */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 text-left gap-4">
              <span className="text-2xl sm:text-3xl md:text-5xl text-white leading-snug">
                {feature.title}
              </span>

              <p
                className={`text-xs sm:text-xs md:text-sm lg:text-base text-[#93C6F5] max-w-xl mx-auto md:mx-0 `}
              >
                {feature.description}
              </p>
              <div className="flex items-center gap-4 w-full">
                <Link
                  href={feature.link}
                  className="text-white bg-rateup-gold font-semibold text-sm sm:text-lg hover:scale-105 inline-flex items-center gap-1 px-4 py-2 rounded-sm transition-all"
                >
                  <div className="text-sm flex items-center justify-center">
                    Get Started Now <IconArrowRight />
                  </div>
                </Link>
                <button className="rounded-sm bg-rateup-blue font-semibold text-sm sm:text-lg hover:scale-105 px-4 py-2 text-white transition-all cursor-pointer">
                  Know More
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
