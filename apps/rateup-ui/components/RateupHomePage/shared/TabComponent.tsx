// "use client";

// import { useState } from "react";
// import Image from "next/image";
// import Link from "next/link";

// import { AnimatePresence, motion } from "motion/react";

// import { imagesPath } from "@/utils/constants";

// type TabKey = "AI-Workflows" | "Unified-Inbox" | "Automation" | "WhatsApp-Flow";

// const tabContent: Record<
//   TabKey,
//   {
//     title: string;
//     description: string;
//     image: string;
//     link: string;
//   }
// > = {
//   "AI-Workflows": {
//     title: "AI Workflows",
//     description:
//       "Build intelligent conversational experiences that understand customer intent and respond with personalized solutions—no coding required.",
//     image: `${imagesPath}/AI WORKFLOW (1).png`,
//     link: "https://rateup-homepage-dev.up.railway.app/products/ai-automation",
//   },
//   "Unified-Inbox": {
//     title: "Unified Inbox",
//     description:
//       "Manage all customer conversations in one place with team collaboration tools, customer context cards, and AI-assisted responses.",
//     image: `${imagesPath}/UNIFIED INBOX (1).png`,
//     link: "https://rateup-homepage-dev.up.railway.app/products/inbox",
//   },
//   Automation: {
//     title: "Automation",
//     description:
//       "Design complex workflows with our intuitive drag-and-drop builder—trigger messages, assign tasks, and personalize responses automatically.",
//     image: `${imagesPath}/AUTOMATION (1).png`,
//     link: "https://rateup-homepage-dev.up.railway.app/products/ai-automation",
//   },
//   "WhatsApp-Flow": {
//     title: "WhatsApp Flow",
//     description:
//       "Create interactive applications like appointment booking, product browsing, and feedback collection without leaving WhatsApp.",
//     image: `${imagesPath}/WHATSAPP FLOW (1).png`,
//     link: "https://rateup-homepage-dev.up.railway.app/products/whatsapp-loyalty",
//   },
// };

// export default function TabComponent() {
//   const [activeTab, setActiveTab] = useState<TabKey>("AI-Workflows");
//   const active = tabContent[activeTab];

//   return (
//     <div className="max-w-6xl mx-auto px-4 sm:px-8 sm:pt-14 py-1 ">
//       {/* Tabs */}
//       <div className="flex justify-center mb-12">
//         <div className="w-full max-w-6xl">
//           {/* Scroll wrapper */}
//           <div className="bg-[#f6f4f2] rounded-2xl px-4 sm:px-8 py-6 overflow-x-auto scrollbar-hide">
//             {/* Tabs container */}
//             <div className="flex whitespace-nowrap gap-6 sm:gap-10 min-w-max justify-start sm:justify-between">
//               {(Object.keys(tabContent) as TabKey[]).map((key) => {
//                 const isActive = key === activeTab;
//                 return (
//                   <span
//                     key={key}
//                     onClick={() => setActiveTab(key)}
//                     className={`relative text-base sm:text-xl cursor-pointer font-semibold transition-colors duration-200 ${
//                       isActive ? "text-black" : "text-black"
//                     }`}
//                   >
//                     {key.replace(/-/g, " ")}
//                     {isActive && (
//                       <span className="absolute left-0 -bottom-[6px] h-[3px] w-full bg-[#00397b] rounded-full" />
//                     )}
//                   </span>
//                 );
//               })}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Content */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
//         {/* Image */}
//         <AnimatePresence mode="wait">
//           <motion.div
//             key={active.image}
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -20 }}
//             transition={{ duration: 0.5 }}
//             className="relative w-full h-[300px] sm:h-[400px] md:h-[460px] rounded-xl overflow-hidden bg-gray-100"
//           >
//             <Image
//               src={active.image}
//               alt={active.title}
//               fill
//               quality={40}
//               priority
//             />
//           </motion.div>
//         </AnimatePresence>

//         {/* Text */}
//         <AnimatePresence mode="wait">
//           <motion.div
//             key={active.title}
//             initial={{ opacity: 0, x: 10 }}
//             animate={{ opacity: 1, x: 0 }}
//             exit={{ opacity: 0, x: -10 }}
//             transition={{ duration: 0.4 }}
//           >
//             <h2 className="text-3xl sm:text-4xl  text-gray-900 pb-6 leading-snug">
//               <span className="leading-snug ">{active.title}</span>
//             </h2>
//             <p className="text-base sm:text-2xl pb-6 text-gray-600">
//               {active.description}
//             </p>
//             <Link
//               href={active.link}
//               className="text-[#00397b] font-semibold text-lg hover:underline
//               sm:text-xl inline-flex items-center gap-1"
//             >
//               Let&apos;s find out →
//             </Link>
//           </motion.div>
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// }
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  IconAutomation,
  IconGitMerge,
  IconMessages,
  IconWaveSine,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";

import { imagesPath } from "@/utils/constants";

type TabKey = "AI-Workflows" | "Unified-Inbox" | "Automation" | "WhatsApp-Flow";

const tabContent: Record<
  TabKey,
  {
    Icon: any;
    title: string;
    description: string;
    image: string;
    link: string;
  }
> = {
  "AI-Workflows": {
    Icon: IconGitMerge,
    title: "AI Workflows",
    description:
      "Build intelligent conversational experiences that understand customer intent and respond with personalized solutions—no coding required.",
    image: `${imagesPath}/AI WORKFLOW (1).png`,
    link: "https://rateup-homepage-dev.up.railway.app/products/ai-automation",
  },
  "Unified-Inbox": {
    Icon: IconMessages,
    title: "Unified Inbox",
    description:
      "Manage all customer conversations in one place with team collaboration tools, customer context cards, and AI-assisted responses.",
    image: `${imagesPath}/UNIFIED INBOX (1).png`,
    link: "https://rateup-homepage-dev.up.railway.app/products/inbox",
  },
  Automation: {
    Icon: IconAutomation,
    title: "Automation",
    description:
      "Design complex workflows with our intuitive drag-and-drop builder—trigger messages, assign tasks, and personalize responses automatically.",
    image: `${imagesPath}/AUTOMATION (1).png`,
    link: "https://rateup-homepage-dev.up.railway.app/products/ai-automation",
  },
  "WhatsApp-Flow": {
    Icon: IconWaveSine,
    title: "WhatsApp Flow",
    description:
      "Create interactive applications like appointment booking, product browsing, and feedback collection without leaving WhatsApp.",
    image: `${imagesPath}/WHATSAPP FLOW (1).png`,
    link: "https://rateup-homepage-dev.up.railway.app/products/whatsapp-loyalty",
  },
};

export default function TabComponent() {
  const [activeTab, setActiveTab] = useState<TabKey>("AI-Workflows");
  const active = tabContent[activeTab];

  return (
    <div className="mx-auto px-4 sm:px-8 lg:px-12 sm:pt-14 py-6 bg-[#F5F5F5] flex items-center justify-center">
      <div className="w-full max-w-6xl flex flex-col items-center gap-12">
        {/* Heading */}
        <div className="relative flex flex-col items-center justify-center gap-1 text-center">
          <span className="text-2xl sm:text-3xl md:text-4xl text-[#343A40] font-semibold">
            Your Complete
          </span>
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute -inset-x-2 bottom-0 h-3 bg-gradient-to-r from-[#66D7FF] to-[#2D74E0] z-0 rounded-sm origin-left"
          />
          <span className="relative z-10 bg-gradient-to-r from-[#004F98] to-[#001747] bg-clip-text text-transparent text-2xl sm:text-3xl md:text-4xl font-semibold">
            Customer Engagement Solution
          </span>
        </div>

        {/* Tabs */}
        <div className="bg-[#001747] flex flex-col items-center justify-center p-4 sm:p-6 rounded-3xl sm:rounded-4xl w-full">
          <div className="w-full">
            {/* Scroll wrapper */}
            <div className="px-2 sm:px-6 py-4 overflow-x-auto scrollbar-hide">
              {/* Tabs container */}
              <div className="relative flex whitespace-nowrap gap-4 sm:gap-8 min-w-max justify-start sm:justify-center border-b-2 border-[#004F98]">
                {(Object.keys(tabContent) as TabKey[]).map((key) => {
                  const { Icon } = tabContent[key];
                  const isActive = key === activeTab;
                  return (
                    <span
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`relative mb-2 text-md cursor-pointer font-medium transition-colors duration-200 ${
                        isActive ? "text-[#C4D7F5]" : "text-[#004F98]"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Icon />
                        {key.replace(/-/g, " ")}
                      </div>
                      {isActive && (
                        <span className="absolute left-0 -bottom-[8px] sm:-bottom-[10px] h-[3px] w-full bg-[#C4D7F5] rounded-full" />
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 items-center w-full px-2 sm:px-4">
            {/* Image */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active.image}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="relative w-full h-[220px] sm:h-[300px] md:h-[400px] lg:h-[460px] rounded-xl overflow-hidden bg-gray-100"
              >
                <Image
                  src={active.image}
                  alt={active.title}
                  fill
                  quality={60}
                  priority
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>

            {/* Text */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active.title}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.4 }}
                className="text-center md:text-left px-2"
              >
                <h2 className="text-2xl sm:text-3xl md:text-4xl text-white pb-4 sm:pb-6 leading-snug">
                  {active.title}
                </h2>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl pb-4 sm:pb-6 text-gray-400 max-w-xl mx-auto md:mx-0">
                  {active.description}
                </p>
                <Link
                  href={active.link}
                  className="text-[#66D7FF] font-semibold text-sm sm:text-lg hover:underline inline-flex items-center gap-1"
                >
                  Let&apos;s find out →
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
