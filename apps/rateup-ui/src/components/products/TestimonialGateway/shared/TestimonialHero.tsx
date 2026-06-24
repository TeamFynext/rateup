import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { motion } from "motion/react";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal.tsx";
import { Button } from "@/components/ui/button.tsx";
import { imagesPath } from "@/utils/constants.ts";

const TestimonialHero = () => {
  return (
    <section className="w-full bg-white py-24 min-h-[80vh] flex items-center">
      <div className="w-full grid grid-cols-1 md:grid-cols-2 items-center gap-x-1">
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="space-y-6 text-center flex flex-col justify-center md:text-left px-4 md:px-16"
        >
          <h1 className="text-3xl sm:text-3xl lg:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
            Turn happy customers into <span className="text-[#0041a8]">powerful testimonials</span>
          </h1>
          <p className="text-gray-600 text-lg sm:text-xl max-w-xl mx-auto md:mx-0 py-3">
            Collect, manage, and showcase authentic testimonials to build trust, convert more users,
            and grow faster.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <BookDemoModal>
              <Button
                className="bg-[#0041a8] cursor-pointer text-white px-6 py-3 text-base hover:bg-[#003a94] shadow-md"
                aria-label="Book a demo"
              >
                Book a Demo
              </Button>
            </BookDemoModal>
            <Link to="https://rateup.app/login">
              <Button
                variant="outline"
                className="text-[#0041a8] cursor-pointer border-[#0041a8] hover:bg-[#f0f4ff] px-6 py-3 text-base"
                aria-label="Start for free"
              >
                Start for free
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Right Image */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex justify-end pr-0"
        >
          <Image
            src={`${imagesPath}/testimonial-gateway/testimonialHero.png`}
            height={700}
            width={500}
            alt="Dashboard showing testimonial management system"
            className="w-full rounded-2xl shadow-xl"
          />
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialHero;
