import { IconTicket } from "@tabler/icons-react";
import { Image } from "@unpic/react";
import { motion } from "motion/react";

import { imagesPath } from "@/utils/constants.ts";

const features = [
  {
    title: "WhatsApp-First Approach",
    description: "Meet your employees where they are to drive incredibly high participation rates.",
  },
  {
    title: "NPS & CSAT Tracking",
    description: "Effortlessly measure key metrics to benchmark and track morale over time.",
  },
  {
    title: "Unified Multi-Branch View",
    description:
      "Oversee all your teams, branches, or departments in one place and pinpoint localized issues.",
  },
  {
    title: "Smart Issue Resolution",
    description:
      "Turn feedback into trackable tickets. Assign concerns and manage escalations to ensure action.",
  },
];

export const InboxFeatures = () => {
  return (
    <section
      id="features"
      className="overflow-hidden bg-linear-to-br from-white to-[#f0f4fa] py-24"
    >
      <div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-16 items-center">
          {/* Text Section */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:pr-12 max-w-7xl mx-auto px-6 sm:px-24"
          >
            <h3 className="text-4xl sm:text-5xl font-bold text-primary font-montserrat leading-tight">
              The Ultimate Employee <br />
              Engagement Toolkit
            </h3>
            <p className="pt-4 text-lg text-gray-700 leading-relaxed max-w-xl">
              Everything you need to transform your{" "}
              <span className="font-semibold text-primary">workplace culture,</span>
              all in one platform.
            </p>

            {/* Features List */}
            <div className="mt-10 bg-white p-6 sm:p-8 rounded-3xl border border-[#d6e4f5]">
              <ul className="space-y-6">
                {features.map((item, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx, duration: 0.4 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-4"
                  >
                    <IconTicket color="#006156" />
                    <div>
                      <p className="font-semibold text-primary text-lg">{item.title}</p>
                      <p className="text-gray-700">{item.description}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Image Section */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative"
          >
            <Image
              src={`${imagesPath}/inbox/AI ANALYTICS.png`}
              alt="Reputation Management Illustration"
              className="w-full h-auto"
              width={2432}
              height={1442}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
