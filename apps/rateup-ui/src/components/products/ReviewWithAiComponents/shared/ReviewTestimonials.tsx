import { IconStar } from "@tabler/icons-react";
import { Image } from "@unpic/react";
import { easeOut, motion } from "motion/react";

import { clientIcons } from "../../shared/clientIcons.ts";
import { testimonials } from "../../Whatsapp-loyalty/constants.tsx";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: easeOut,
    },
  },
};

// Duplicating icons for seamless scroll
const scrollingIcons = [...clientIcons, ...clientIcons];

const Client = ({ icon }: { icon: string }) => (
  <div
    className="flex items-center justify-center h-28 w-40 rounded-xl border
   border-gray-200 bg-white shadow-sm mx-4 p-4"
  >
    <Image src={icon} alt="Client logo" width={160} height={80} className="object-contain mx-9" />
  </div>
);
const ReviewTestimonials = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={cardVariants}
          className="text-center mb-16 flex flex-col items-center justify-center"
        >
          <h2 className="text-3xl text-[#009987] md:text-4xl font-bold mb-4">
            Trusted by Businesses Like Yours
          </h2>
          <p className="text-gray-600 max-w-2xl pt-3 mx-auto">
            See how RateUp is helping businesses grow their reputation.
          </p>
        </motion.div>

        {/* Testimonials */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="bg-white p-6 rounded-2xl shadow-md border hover:shadow-lg transition-all duration-300"
            >
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <IconStar key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 italic mb-6">"{testimonial.quote}"</p>
              <div>
                <p className="font-semibold text-base">{testimonial.author}</p>
                <p className="text-sm text-gray-500">{testimonial.position}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <ClientLogoSectionNew />
    </section>
  );
};

// export const Client
export const ClientLogoSectionNew = () => {
  return (
    <div className="py-20 px-6 lg:px-8 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-2xl uppercase text-[#075E54]">Powering growth for</h2>
        </div>

        <div className="relative w-full overflow-hidden">
          <motion.div
            className="flex whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              repeat: Infinity,
              repeatType: "loop",
              duration: 20,
              ease: "linear",
            }}
          >
            {scrollingIcons.map((icon, index) => (
              <Client key={index} icon={icon} />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ReviewTestimonials;
