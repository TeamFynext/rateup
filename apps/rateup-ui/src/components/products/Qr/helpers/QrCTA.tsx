import { Image } from "@unpic/react";
import { motion } from "motion/react";

import { BookDemoLink } from "@/components/RateupHomePage/helper/BookDemoLink.tsx";
import { Button } from "@/components/ui/button.tsx";
import { imagesPath } from "@/utils/constants.ts";

function QrCTA() {
  return (
    <section className="bg-white flex items-center justify-center py-16 px-4 sm:px-6 md:px-10 lg:px-20 xl:px-32 2xl:px-60">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{
          opacity: 1,
          y: 0,
          transition: { duration: 0.8, ease: "easeOut" },
        }}
        viewport={{ once: true }}
        className="relative w-full max-w-7xl"
      >
        {/* Star Icon Animation */}
        <motion.div
          initial={{
            x: "-40%",
            y: "-40%",
            rotate: 0,
            scale: 0.5,
            opacity: 0,
          }}
          whileInView={{
            x: 0,
            y: 0,
            scale: [0.5, 1.2, 1], // stamp overshoot
            rotate: [0, 360], // full spin
            opacity: 1,
            transition: {
              delay: 0.8, // waits until box animation ends
              x: { type: "spring", stiffness: 500, damping: 20 },
              y: { type: "spring", stiffness: 500, damping: 20 },
              scale: { duration: 0.6, ease: "easeOut", delay: 0.4 },
              rotate: { duration: 1, ease: "easeInOut", delay: 1.2 },
              opacity: { duration: 0.3 },
            },
          }}
          viewport={{ once: true }}
          className="absolute -top-6 -left-6 z-10"
        >
          <Image
            src={`${imagesPath}/qrNew/rateupstaricon.png`}
            className="object-contain"
            height={80}
            width={80}
            alt="Star Icon"
          />
        </motion.div>

        {/* Blue Box */}
        <div className="bg-[linear-gradient(90deg,_rgba(0,28,87,1)_0%,_rgba(0,79,152,1)_100%)] flex flex-col items-center justify-center py-12 px-6 sm:px-10 md:px-16 rounded-3xl gap-6 sm:gap-8">
          <h1 className="text-white text-2xl sm:text-3xl md:text-4xl font-semibold text-center leading-snug">
            Ready to Unlock the Voice of Your Customer?
          </h1>

          <p className="text-white text-sm sm:text-base text-center max-w-2xl">
            Stop guessing what your customers think. Start listening, learning, and growing today.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
            <a href={"https://rateup.app/signup"}>
              <Button
                size="lg"
                className="bg-[#C4D7F5] hover:bg-[#bdd2f3] text-[#004F98] font-medium px-6 w-full sm:w-auto cursor-pointer"
              >
                Start For Free
              </Button>
            </a>
            <BookDemoLink>
              <Button
                size="lg"
                className="bg-[#004F98] hover:bg-[#004f98ee] text-white group px-6 w-full sm:w-auto cursor-pointer"
              >
                Book a Demo
              </Button>
            </BookDemoLink>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default QrCTA;
