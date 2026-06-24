import { Image } from "@unpic/react";
import { motion } from "motion/react";

import { imagesPath } from "@/utils/constants.ts";

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0 },
};

function QrGrids() {
  return (
    <section
      className="py-16 w-full flex flex-col items-center gap-12 px-4 bg-[#FAFAFA]"
      id="features"
    >
      {/* Heading */}
      <div className="flex flex-col md:flex-row gap-2 items-center justify-center text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-900">
          More Than a Box.
        </h1>
        <div className="relative inline-block font-bold">
          <motion.svg
            width="100%"
            height="28"
            viewBox="0 0 200 28"
            preserveAspectRatio="none"
            className="absolute -bottom-1 left-0 z-0"
          >
            <motion.path
              d="M0,14 C50,28 150,0 200,14"
              stroke="#93c5fd"
              strokeWidth="16"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </motion.svg>

          <h1 className="relative z-10 text-[#004F98] text-3xl sm:text-4xl md:text-5xl font-semibold">
            It's a Growth Engine.
          </h1>
        </div>
      </div>

      {/* Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl w-full">
        {/* Column 1 */}
        <div className="flex flex-col gap-6 md:pl-8">
          {[
            {
              title: "Real-Time Alerts",
              desc: "Get notified the second feedback is submitted. Address critical issues before they escalate.",
              img: "REALTIMEALERTS.png",
            },
            {
              title: "Close the Loop",
              desc: "Directly reply to customers who leave their contact info, turning a negative experience into a positive one.",
              img: "CLOSETHELOOP.png",
            },
            {
              title: "Multi-Location View",
              desc: "Manage feedback from all your branches or locations from a single, unified dashboard.",
              img: "MULTILOCATIONVIEW.png",
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 0.6, delay: idx * 0.2 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.03,
                y: -5,
                boxShadow: "0px 10px 25px rgba(0,0,0,0.1)",
              }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-xl flex flex-col p-4 gap-4 transition"
            >
              <div className="relative min-h-60 bg-white rounded-xl aspect-square">
                <Image
                  src={`${imagesPath}/qrNew/${item.img}`}
                  alt={item.title}
                  layout="fullWidth"
                  aspectRatio={1}
                  objectFit="cover"
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{item.title}</h3>
                <p className="text-sm text-[#7A8289]">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Column 2 (shifted down for desktop) */}
        <div className="flex flex-col gap-6 md:pr-8 md:mt-20">
          {[
            {
              title: "AI-Powered Insights",
              desc: "Our AI analyzes sentiment and spots trends, turning raw comments into actionable intelligence.",
              img: "AIPOWEREDINSIGHTS.png",
            },
            {
              title: "Team Collaboration",
              desc: "Assign feedback to relevant team members and track issues until they are resolved.",
              img: "TEAMCOLLABRATION.png",
            },
            {
              title: "Custom Branding",
              desc: "Customize the feedback page with your logo and colors to create a seamless brand experience.",
              img: "CUSTOM_BRANDING.png",
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 0.6, delay: idx * 0.2 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.03,
                y: -5,
                boxShadow: "0px 10px 25px rgba(0,0,0,0.1)",
              }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-xl flex flex-col p-4 gap-4 transition"
            >
              <div className="relative w-full min-h-60 bg-white rounded-xl aspect-square">
                <Image
                  src={`${imagesPath}/qrNew/${item.img}`}
                  alt={item.title}
                  layout="fullWidth"
                  aspectRatio={1}
                  objectFit="cover"
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{item.title}</h3>
                <p className="text-sm text-[#7A8289]">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default QrGrids;
