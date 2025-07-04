import Image from "next/image";
import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { imagesPath } from "@/utils/constants";

const features = [
  {
    link: "https://rateup-homepage-dev.up.railway.app/products/qr-studio",
    title: "QR Codes: Connect Offline to Online",
    description:
      "Bridge your physical and digital customer engagement. Use dynamic QR codes to give instant access to offers, feedback forms, or loyalty sign-ups.",
    bullets: [
      "Turn every in-person interaction into a valuable digital connection.",
      "Drive website traffic and collect data.",
      "Improve the customer journey.",
    ],
    image: `${imagesPath}/QR CODE IMAGE.png`,
    bgColor: "bg-[#e0f7f6]", // Soft teal background
    textColor: "text-[#0f172a]", // Deep slate/black for strong contrast
    bulletColor: "text-[#0d9488]", // Teal bullet for modern touch
  },
  {
    link: "/login",
    title: "Smart Insights for Personalized Customer Experiences",
    description:
      "Build complete customer profiles with purchase history, feedback, and preferences. Our smart AI analyzes this data to tell you the best time to send offers and messages.",
    bullets: [
      "Benefit: Your messages get seen and acted on, with incredibly high open and click rates, driving more sales and interactions.",
    ],
    image: `${imagesPath}/SMART%20INSIGHTS%20(1).png`,
    bgColor: "bg-[#e6f4ff]",
    textColor: "text-[#003a63]",
    bulletColor: "text-[#0070c0]",
  },

  {
    link: "/login",
    title: "Instant Feedback & Smart Analysis",
    description:
      "Collect instant customer opinions through WhatsApp surveys, web forms, and even kiosks. AI analyzes feedback for insights.",
    bullets: [
      "Quickly spot areas for improvement in your customer experience.",
      "Proactively resolve issues before they escalate.",
      "Turn complaints into opportunities for higher satisfaction.",
    ],
    image: `${imagesPath}/INSTANT FEEDBACK (2).png`,
    bgColor: "bg-[#f3f0ff]",
    textColor: "text-[#4b2e83]",
    bulletColor: "text-[#9f7aea]",
  },
];

export default function FeatureCards2() {
  return (
    <section className="relative h-[300vh] bg-white px-4 pb-8">
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
               border-2 border-white transition-all duration-300
              ${feature.bgColor}
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
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 text-left">
              <h3
                className={`text-3xl sm:text-4xl pb-4 leading-tight ${feature.textColor}`}
              >
                <span className="font-semibold ">{feature.title}</span>
              </h3>
              <p
                className={`text-base sm:text-lg mb-4 font-medium leading-relaxed ${feature.textColor}`}
              >
                {feature.description}
              </p>
              <ul className="space-y-1 font-medium mt-5 mb-6">
                {feature.bullets.map((point, i) => (
                  <li
                    key={i}
                    className={`flex items-start text-sm sm:text-base ${feature.textColor}`}
                  >
                    <span
                      className={`mr-2 mt-[6px] text-lg ${feature.bulletColor}`}
                    >
                      •
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href={feature.link}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm sm:text-base font-medium 
             text-[#00397b] bg-[#F0F4FF] border border-[#c4d7f3]
             rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:bg-[#e5efff] w-fit"
              >
                Try for free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
