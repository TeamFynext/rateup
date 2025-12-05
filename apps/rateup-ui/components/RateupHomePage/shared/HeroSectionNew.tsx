import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { IconCheck } from "@tabler/icons-react";
import { motion } from "motion/react";

import { imagePath } from "@/components/HomePage/pages/constants";
import { Separator } from "@/components/ui/separator";
import { imagesPath } from "@/utils/constants";
import { sora } from "@/utils/fonts";

import { BookDemoModal } from "../helpers/BookDemoModal";

export default function HeroSection() {
  const router = useRouter();
  const [showDashboard, setShowDashboard] = useState(false); // default: first image visible
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Toggle showDashboard when section is at least 80% visible
          if (entry.intersectionRatio >= 1) {
            setShowDashboard(true);
          } else {
            setShowDashboard(false);
          }
        });
      },
      { root: null, threshold: [0, 0.2, 0.5, 1] },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  return (
    <section
      className={`${sora.className} flex flex-col items-center justify-center gap-4 sm:gap-8 bg-rateup-darkblue pt-12 sm:pt-16 lg:pt-20 px-6 sm:px-8`}
    >
      {/* Heading */}
      <div className="flex flex-col items-center justify-center gap-2 max-w-4xl text-center">
        <span className="text-light-blue-5 font-semibold text-xl sm:text-4xl md:text-5xl leading-tight">
          Reimagine Customer Engagement -
        </span>

        {/* Gradient text + underline container */}
        <div className="relative inline-block">
          <span className="text-xl sm:text-4xl md:text-5xl bg-[linear-gradient(to_right,#66D7FF,#2D74E0)] bg-clip-text text-transparent font-semibold leading-tight">
            Unified. Automated. Intelligent.
          </span>

          {/* Animated underline */}
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute -bottom-2 left-0 right-0 h-1.5 sm:h-2 md:h-2.5 bg-rateup-light-blue rounded-full origin-left"
          />
        </div>
      </div>

      {/* Subtext */}
      <div className="flex flex-col items-center justify-center text-center max-w-2xl">
        <span className="text-rateup-light-blue-2 font-normal sm:font-medium text-xs sm:text-lg">
          Unify all customer chats in one intelligent platform. RateUp
          automates, analyzes, and connects — helping you engage smarter across
          every channel.
        </span>
      </div>

      {/* CTA Buttons + Highlights */}
      <div className="flex flex-col items-center justify-center gap-4 max-w-2xl">
        {/* Buttons: stack on xs, row on sm+ */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <button
            type="button"
            className="sm:w-auto bg-rateup-blue text-white font-semibold px-4 py-2 rounded-md hover:scale-105 transition-transform duration-200"
            onClick={() => router.push("/signup")}
          >
            Start Free Trial
          </button>

          <BookDemoModal>
            <button
              type="button"
              className="w-full sm:w-auto bg-rateup-gold text-white font-semibold px-4 py-2 rounded-md hover:scale-105 transition-transform duration-200"
            >
              Book A Demo
            </button>
          </BookDemoModal>
        </div>

        <Separator />

        {/* Checkpoints */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center p-1.5 bg-active-green-2 rounded-full">
              <IconCheck className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
            <span className="text-light-blue-5 text-xs sm:text-sm">
              No Credit Card
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center p-1.5 bg-active-green-2 rounded-full">
              <IconCheck className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
            <span className="text-light-blue-5 text-xs sm:text-sm">
              No Expiry
            </span>
          </div>
        </div>
      </div>

      {/* Images Container with Stacking (mouseenter shows second image) */}
      <div ref={containerRef} className="relative w-full overflow-hidden">
        {/* First Image - Base Layer */}
        <motion.div
          animate={{
            opacity: showDashboard ? 0 : 1,
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <Image
            src={`${imagePath}/homepage/coverimage.svg`}
            alt="image"
            width={480}
            height={480}
            className="w-full h-auto object-contain max-w-7xl mx-auto"
            fetchPriority="high"
            quality={60}
            priority
          />
        </motion.div>

        {/* Second Image - Slides up from below on hover */}
        <motion.div
          animate={{
            y: showDashboard ? 0 : "100%",
            opacity: showDashboard ? 1 : 0,
          }}
          transition={{
            duration: 1,
            ease: [0.43, 0.13, 0.23, 0.96],
          }}
          className="absolute top-0 left-0 w-full"
        >
          <Image
            src={`${imagesPath}/DASHBOARD%20(1).png`}
            alt="Smart QR Code Showcase"
            width={700}
            height={540}
            quality={60}
            className="w-full h-auto object-contain max-w-6xl mx-auto"
            fetchPriority="high"
            priority
          />
        </motion.div>
      </div>
      {/* Intersection Observer toggles showDashboard; no extra script required */}
    </section>
  );
}
