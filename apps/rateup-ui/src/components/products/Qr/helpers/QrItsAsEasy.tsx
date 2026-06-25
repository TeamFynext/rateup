import { Image } from "@unpic/react";
import type { Variants } from "motion/react";
import { motion } from "motion/react";

import { imagesPath } from "@/utils/constants.ts";

function QrItsAsEasy() {
  // Animation variants
  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="bg-[linear-gradient(90deg,_rgba(0,28,87,1)_0%,_rgba(0,79,152,1)_100%)] flex flex-col items-center justify-center py-16 px-4 sm:px-6 md:px-10 lg:px-20 gap-10">
      <h1 className="text-white text-3xl sm:text-4xl font-semibold text-center">
        It's as Easy as 1, 2, 3
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[900px] w-full">
        {/* Step 1 */}
        <TextCard
          num={1}
          title="Customer Scans"
          description="Your customer scans the elegant QR code display at your location. It’s instant, intuitive, and works on any smartphone."
          fadeUp={fadeUp}
        />
        <ImageCard src="qrNew/customerscans.png" fadeUp={fadeUp} />

        {/* Step 2 */}
        <TextCard
          num={2}
          title="They Share"
          description="A beautiful, conversational form opens in their browser. They can leave a suggestion, complaint, or compliment effortlessly."
          fadeUp={fadeUp}
        />
        <ImageCard src="qrNew/theyshare.jpg" fadeUp={fadeUp} />

        {/* Step 3 */}
        <TextCard
          num={3}
          title="You Act"
          description="You get an instant alert. Analyze trends, reply to customers, and track resolutions from your powerful dashboard."
          fadeUp={fadeUp}
        />
        <ImageCard src="qrNew/youact.png" fadeUp={fadeUp} />
      </div>
    </section>
  );
}

export default QrItsAsEasy;

// TEXT CARD
function TextCard({
  description,
  num,
  title,
  fadeUp,
}: {
  description: string;
  num: number;
  title: string;
  fadeUp: Variants;
}) {
  return (
    <motion.div
      className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center gap-3 min-h-[240px]"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      whileHover={{ scale: 1.03, boxShadow: "0px 8px 20px rgba(0,0,0,0.15)" }}
      transition={{ duration: 0.4 }}
    >
      <div className="bg-[#C4D7F5] w-14 h-14 rounded-full flex items-center justify-center">
        <h1 className="text-2xl font-bold text-[#004F98]">{num}</h1>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold text-[#004F98]">{title}</h2>
      <p className="text-gray-600 text-sm sm:text-base max-w-xs">{description}</p>
    </motion.div>
  );
}

// IMAGE CARD
function ImageCard({ src, fadeUp }: { src: string; fadeUp: Variants }) {
  return (
    <motion.div
      className="bg-white rounded-xl shadow-md overflow-hidden min-h-[240px] flex items-center justify-center"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      whileHover={{ scale: 1.03, boxShadow: "0px 8px 20px rgba(0,0,0,0.15)" }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative w-full h-full">
        <Image
          src={`${imagesPath}/${src}`}
          alt="Step illustration"
          layout="fullWidth"
          aspectRatio={1}
          objectFit="cover"
          className="object-cover"
        />
      </div>
    </motion.div>
  );
}
