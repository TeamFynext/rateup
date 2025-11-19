import Image from "next/image";
import Link from "next/link";

import { IconArrowRight } from "@tabler/icons-react";
import { motion } from "motion/react";

import { imagesPath } from "@/utils/constants";
import { sora } from "@/utils/fonts";

const features = [
  {
    link: "/login",
    title: "Smart Automation & AI Chatbot",
    description:
      "Design complex workflows with our intuitive drag-and-drop builder to trigger messages, assign tasks, and personalize responses—while our smart multi-language AI chatbot delivers round-the-clock support across WhatsApp and your website.",
    image: `${imagesPath}/homepage/smartautomationai.png`,
  },
  {
    link: "/login",
    title: "Omnichannel Inbox",
    description:
      "Manage every customer interaction from one place. RateUp's unified inbox keeps WhatsApp, Instagram, and other channels connected — enabling faster responses, seamless collaboration, and better customer experiences.",
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
      className={`relative h-auto lg:h-[400vh] bg-white px-4 py-16 ${sora.className}`}
    >
      <div className="relative lg:absolute inset-x-0 top-0 lg:top-10 z-30 flex flex-col items-center text-center pointer-events-none mb-12 lg:mb-0">
        <span className="pointer-events-auto text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-grey-color-7">
          Powerful Features For
        </span>
        <div className="relative inline-block pointer-events-auto">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-rateup-darkblue to-rateup-blue text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold">
            Modern Businesses
          </span>
          {/* animated underline... */}
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute bottom-0 left-0 right-0 h-[4px] sm:h-[6px] bg-gradient-to-r from-rateup-blue-3 to-rateup-blue-2 rounded-full origin-left"
          />
        </div>
      </div>
      <div className="lg:h-[400vh] px-2 sm:px-4 pb-8">
        {features.map((feature, index) => (
          <div
            key={index}
            className="lg:sticky lg:top-0 h-auto lg:h-screen flex items-center justify-center z-[10] mb-8 lg:mb-0"
            style={{ zIndex: 10 + index }}
          >
            <div
              className={`
              flex flex-col lg:flex-row items-center justify-between
              max-w-6xl w-full mx-auto gap-6 sm:gap-8 lg:gap-10 px-4 sm:px-6 py-8 sm:py-10 rounded-2xl sm:rounded-3xl
               transition-all duration-300
              bg-rateup-darkblue
            `}
            >
              {/* Image Section */}
              <div className="w-full lg:w-1/2 flex justify-center order-1 lg:order-none">
                <div className="relative w-full max-w-[320px] sm:max-w-md h-[240px] sm:h-[280px] md:h-[380px] lg:h-[460px]">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    quality={60}
                    fill
                    className="object-contain rounded-xl sm:rounded-2xl"
                  />
                </div>
              </div>

              {/* Content Section */}
              <div className="w-full lg:w-1/2 flex flex-col justify-center px-2 sm:px-4 text-left gap-3 sm:gap-4 order-2 lg:order-none">
                <span className="text-xl sm:text-2xl md:text-3xl lg:text-5xl text-white leading-snug">
                  {feature.title}
                </span>

                <p
                  className={`text-xs sm:text-sm md:text-base text-rateup-light-blue-2 max-w-xl`}
                >
                  {feature.description}
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full">
                  <Link
                    href={feature.link}
                    className="text-white bg-rateup-gold font-semibold text-sm sm:text-base lg:text-lg hover:scale-105 inline-flex items-center justify-center gap-1 px-4 py-2.5 sm:py-2 rounded-sm transition-all"
                  >
                    <div className="text-sm sm:text-base flex items-center justify-center gap-1">
                      Get Started Now{" "}
                      <IconArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </Link>
                  <button className="rounded-sm bg-rateup-blue font-semibold text-sm sm:text-base lg:text-lg hover:scale-105 px-4 py-2.5 sm:py-2 text-white transition-all cursor-pointer">
                    Know More
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
